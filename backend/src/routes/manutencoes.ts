import { Router } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db';
import {
  getPatrimonioAccess,
  hasFinancialFields,
  patrimonioScope,
  protectFinancialResponse,
} from '../utils/patrimonioAccess';

const router = Router();

// GET /api/manutencoes?patrimonio_id=
router.get('/', async (req: any, res) => {
  const patrimonioId = (req.query.patrimonio_id as string) || null;
  try {
    const access = await getPatrimonioAccess(req.auth);
    const scope = patrimonioScope(access, 'p', 2);
    const result = await pool.query(
      `SELECT m.*, json_build_object('codigo', p.codigo, 'nome', p.nome) AS patrimonios
       FROM manutencoes m LEFT JOIN patrimonios p ON p.id = m.patrimonio_id
       WHERE ($1::uuid IS NULL OR m.patrimonio_id = $1::uuid) AND ${scope.clause}
       ORDER BY m.data_inicio DESC`,
      [patrimonioId, ...scope.values]
    );
    res.json(protectFinancialResponse(result.rows, access));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar manutenções' });
  }
});

router.post('/', async (req: any, res) => {
  const b = req.body;
  if (!b.patrimonio_id) return res.status(400).json({ message: 'Património é obrigatório' });
  let client: PoolClient | undefined;
  try {
    const access = await getPatrimonioAccess(req.auth);
    if (!access.isAdmin && hasFinancialFields(b)) {
      return res.status(403).json({ message: 'Apenas administradores podem informar custos' });
    }
    client = await pool.connect();
    await client.query('BEGIN');
    const scope = patrimonioScope(access, 'p', 2);
    const asset = await client.query(
      `SELECT p.id FROM patrimonios p
       WHERE p.id = $1 AND ${scope.clause} FOR UPDATE`,
      [b.patrimonio_id, ...scope.values]
    );
    if (asset.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Património não encontrado' });
    }
    const result = await client.query(
      `INSERT INTO manutencoes (patrimonio_id, tipo, descricao, tecnico, fornecedor, custo, data_inicio, data_conclusao, status, observacoes, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::date, CURRENT_DATE),$8,$9,$10,$11) RETURNING *`,
      [b.patrimonio_id, b.tipo || 'Corretiva', b.descricao || null, b.tecnico || null, b.fornecedor || null,
        access.isAdmin ? Number(b.custo) || 0 : 0, b.data_inicio || null, b.data_conclusao || null, b.status || 'Em andamento',
        b.observacoes || null, req.auth?.id ?? null]
    );
    if ((b.status || 'Em andamento') === 'Em andamento') {
      await client.query(`UPDATE patrimonios SET status = 'Em manutenção', updated_at = NOW() WHERE id = $1`, [b.patrimonio_id]);
    }
    await client.query('COMMIT');
    res.status(201).json(protectFinancialResponse(result.rows[0], access));
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Erro ao registar manutenção' });
  } finally {
    client?.release();
  }
});

export default router;
