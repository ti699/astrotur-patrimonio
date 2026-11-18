import { Router } from 'express';
import { pool } from '../db';
import { getPatrimonioAccess, patrimonioScope, protectFinancialResponse } from '../utils/patrimonioAccess';

const router = Router();

// GET /api/historico?patrimonio_id=&limit=
router.get('/', async (req: any, res) => {
  const limit = Math.min(Number(req.query.limit) || 500, 5000);
  const patrimonioId = (req.query.patrimonio_id as string) || null;
  try {
    const access = await getPatrimonioAccess(req.auth);
    const scope = patrimonioScope(access, 'p', 3);
    const result = await pool.query(
      `SELECT h.*, p.categoria,
        json_build_object('codigo', p.codigo, 'nome', p.nome, 'categoria', p.categoria) AS patrimonios
       FROM historico_patrimonio h LEFT JOIN patrimonios p ON p.id = h.patrimonio_id
       WHERE ($1::uuid IS NULL OR h.patrimonio_id = $1::uuid) AND ${scope.clause}
       ORDER BY h.created_at DESC LIMIT $2`,
      [patrimonioId, limit, ...scope.values]
    );
    res.json(protectFinancialResponse(result.rows, access));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar histórico' });
  }
});

export default router;
