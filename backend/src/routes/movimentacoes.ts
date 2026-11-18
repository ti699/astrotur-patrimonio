import { Router } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db';
import {
  getPatrimonioAccess,
  patrimonioScope,
  protectFinancialResponse,
} from '../utils/patrimonioAccess';

const router = Router();

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

// GET /api/movimentacoes - Histórico com nomes resolvidos
router.get('/', async (req: any, res) => {
  const patrimonioId = (req.query.patrimonio_id as string) || null;
  try {
    const access = await getPatrimonioAccess(req.auth);
    const scope = patrimonioScope(access, 'p', 2);
    const result = await pool.query(
      `SELECT m.*,
        r.nome AS responsavel_nome,
        ro.nome AS responsavel_origem_nome,
        rd.nome AS responsavel_destino_nome,
        u.nome AS usuario_nome,
        json_build_object('codigo', p.codigo, 'nome', p.nome) AS patrimonios,
        json_build_object('nome', so.nome) AS origem,
        json_build_object('nome', sd.nome) AS destino,
        json_build_object('nome', ro.nome) AS resp_origem,
        json_build_object('nome', rd.nome) AS resp_destino
       FROM movimentacoes m
       LEFT JOIN patrimonios p ON p.id = m.patrimonio_id
       LEFT JOIN setores so ON so.id = m.setor_origem_id
       LEFT JOIN setores sd ON sd.id = m.setor_destino_id
       LEFT JOIN responsaveis ro ON ro.id = m.responsavel_origem_id
       LEFT JOIN responsaveis rd ON rd.id = m.responsavel_destino_id
       LEFT JOIN responsaveis r ON r.id = p.responsavel_id
       LEFT JOIN users u ON u.id = m.usuario_id
       WHERE ($1::uuid IS NULL OR m.patrimonio_id = $1::uuid) AND ${scope.clause}
       ORDER BY m.data_movimentacao DESC`,
      [patrimonioId, ...scope.values]
    );
    res.json(protectFinancialResponse(result.rows, access));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar movimentações' });
  }
});

// POST /api/movimentacoes - Registra a movimentação e atualiza o património
router.post('/', async (req: any, res) => {
  const { patrimonio_id, setor_destino_id, responsavel_destino_id, localizacao_destino, motivo, observacoes } = req.body;
  if (!patrimonio_id) return res.status(400).json({ message: 'Património é obrigatório' });

  let client: PoolClient | undefined;
  try {
    const access = await getPatrimonioAccess(req.auth);
    client = await pool.connect();
    await client.query('BEGIN');
    const scope = patrimonioScope(access, 'p', 2);
    const pat = await client.query(
      `SELECT p.setor_id, p.responsavel_id, p.localizacao FROM patrimonios p
       WHERE p.id = $1 AND ${scope.clause} FOR UPDATE`,
      [patrimonio_id, ...scope.values]
    );
    if (pat.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Património não encontrado' });
    }
    const p = pat.rows[0];
    const setorDestino = emptyToNull(setor_destino_id);
    const respDestino = emptyToNull(responsavel_destino_id);
    const locDestino = emptyToNull(localizacao_destino);

    const inserted = await client.query(
      `INSERT INTO movimentacoes (patrimonio_id, setor_origem_id, setor_destino_id, responsavel_origem_id,
        responsavel_destino_id, localizacao_origem, localizacao_destino, motivo, observacoes, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [patrimonio_id, p.setor_id, setorDestino, p.responsavel_id, respDestino, p.localizacao, locDestino,
        emptyToNull(motivo), emptyToNull(observacoes), req.auth?.id ?? null]
    );
    await client.query(
      `UPDATE patrimonios SET setor_id = $1, responsavel_id = $2, localizacao = $3, updated_at = NOW() WHERE id = $4`,
      [setorDestino ?? p.setor_id, respDestino ?? p.responsavel_id, locDestino ?? p.localizacao, patrimonio_id]
    );
    const movement = await client.query(
      `SELECT m.*, r.nome AS responsavel_nome,
        ro.nome AS responsavel_origem_nome, rd.nome AS responsavel_destino_nome,
        u.nome AS usuario_nome
       FROM movimentacoes m
       LEFT JOIN patrimonios p ON p.id = m.patrimonio_id
       LEFT JOIN responsaveis r ON r.id = p.responsavel_id
       LEFT JOIN responsaveis ro ON ro.id = m.responsavel_origem_id
       LEFT JOIN responsaveis rd ON rd.id = m.responsavel_destino_id
       LEFT JOIN users u ON u.id = m.usuario_id
       WHERE m.id = $1`,
      [inserted.rows[0].id]
    );
    await client.query('COMMIT');
    res.status(201).json(protectFinancialResponse(movement.rows[0], access));
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Erro ao registar movimentação' });
  } finally {
    client?.release();
  }
});

export default router;
