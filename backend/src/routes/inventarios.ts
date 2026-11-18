import { Router } from 'express';
import { pool } from '../db';
import {
  getPatrimonioAccess,
  patrimonioScope,
  protectFinancialResponse,
} from '../utils/patrimonioAccess';

const router = Router();

// GET /api/inventarios?sessao_id=&limit=
router.get('/', async (req: any, res) => {
  const sessaoId = (req.query.sessao_id as string) || null;
  const limit = Math.min(Number(req.query.limit) || 5000, 5000);
  try {
    const access = await getPatrimonioAccess(req.auth);
    const scope = patrimonioScope(access, 'p', 3);
    const result = await pool.query(
      `SELECT i.* FROM inventarios i
       JOIN patrimonios p ON p.id = i.patrimonio_id
       WHERE ($1::uuid IS NULL OR i.sessao_id = $1::uuid) AND ${scope.clause}
       ORDER BY i.data_verificacao DESC LIMIT $2`,
      [sessaoId, limit, ...scope.values]
    );
    res.json(protectFinancialResponse(result.rows, access));
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
    const access = await getPatrimonioAccess(req.auth);
    const scope = patrimonioScope(access, 'p', 6);
    const result = await pool.query(
      `INSERT INTO inventarios (patrimonio_id, sessao_id, status_verificacao, observacao, usuario_responsavel)
       SELECT p.id, $2, $3, $4, $5 FROM patrimonios p
       WHERE p.id = $1 AND ${scope.clause}
       RETURNING *`,
      [
        b.patrimonio_id, b.sessao_id, b.status_verificacao, b.observacao || null,
        req.auth?.id ?? null,
        ...scope.values,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Património não encontrado' });
    }
    res.status(201).json(protectFinancialResponse(result.rows[0], access));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao registar verificação' });
  }
});

router.put('/:id', async (req: any, res) => {
  const b = req.body;
  try {
    const access = await getPatrimonioAccess(req.auth);
    const scope = patrimonioScope(access, 'p', 5);
    const result = await pool.query(
      `UPDATE inventarios AS i
       SET status_verificacao = $1, observacao = $2, usuario_responsavel = $3, data_verificacao = NOW()
       WHERE i.id = $4 AND EXISTS (
         SELECT 1 FROM patrimonios p WHERE p.id = i.patrimonio_id AND ${scope.clause}
       ) RETURNING i.*`,
      [
        b.status_verificacao, b.observacao || null, req.auth?.id ?? null, req.params.id,
        ...scope.values,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Verificação não encontrada' });
    res.json(protectFinancialResponse(result.rows[0], access));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar verificação' });
  }
});

export default router;
