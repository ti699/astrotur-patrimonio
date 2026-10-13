import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/inventarios?sessao_id=&limit=
router.get('/', async (req, res) => {
  const sessaoId = (req.query.sessao_id as string) || null;
  const limit = Math.min(Number(req.query.limit) || 5000, 5000);
  try {
    const result = await pool.query(
      `SELECT * FROM inventarios WHERE ($1::uuid IS NULL OR sessao_id = $1::uuid)
       ORDER BY data_verificacao DESC LIMIT $2`,
      [sessaoId, limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar inventários' });
  }
});

router.post('/', async (req: any, res) => {
  const b = req.body;
  if (!b.patrimonio_id || !b.sessao_id || !b.status_verificacao) {
    return res.status(400).json({ message: 'Dados obrigatórios em falta' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO inventarios (patrimonio_id, sessao_id, status_verificacao, observacao, usuario_responsavel)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [b.patrimonio_id, b.sessao_id, b.status_verificacao, b.observacao || null, req.auth?.id ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao registar verificação' });
  }
});

router.put('/:id', async (req: any, res) => {
  const b = req.body;
  try {
    const result = await pool.query(
      `UPDATE inventarios SET status_verificacao = $1, observacao = $2, usuario_responsavel = $3, data_verificacao = NOW()
       WHERE id = $4 RETURNING *`,
      [b.status_verificacao, b.observacao || null, req.auth?.id ?? null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Verificação não encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar verificação' });
  }
});

export default router;
