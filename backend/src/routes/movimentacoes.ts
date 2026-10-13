import { Router } from 'express';
import { pool } from '../db';

const router = Router();

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

// GET /api/movimentacoes - Histórico com nomes resolvidos
router.get('/', async (req, res) => {
  const patrimonioId = (req.query.patrimonio_id as string) || null;
  try {
    const result = await pool.query(
      `SELECT m.*,
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
       WHERE ($1::uuid IS NULL OR m.patrimonio_id = $1::uuid)
       ORDER BY m.data_movimentacao DESC`,
      [patrimonioId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar movimentações' });
  }
});

// POST /api/movimentacoes - Registra a movimentação e atualiza o património
router.post('/', async (req: any, res) => {
  const { patrimonio_id, setor_destino_id, responsavel_destino_id, localizacao_destino, motivo, observacoes } = req.body;
  if (!patrimonio_id) return res.status(400).json({ message: 'Património é obrigatório' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pat = await client.query('SELECT setor_id, responsavel_id, localizacao FROM patrimonios WHERE id = $1 FOR UPDATE', [patrimonio_id]);
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
    await client.query('COMMIT');
    res.status(201).json(inserted.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Erro ao registar movimentação' });
  } finally {
    client.release();
  }
});

export default router;
