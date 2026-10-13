import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/historico?patrimonio_id=&limit=
router.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 500, 5000);
  const patrimonioId = (req.query.patrimonio_id as string) || null;
  try {
    const result = await pool.query(
      `SELECT h.*, p.categoria,
        json_build_object('codigo', p.codigo, 'nome', p.nome, 'categoria', p.categoria) AS patrimonios
       FROM historico_patrimonio h LEFT JOIN patrimonios p ON p.id = h.patrimonio_id
       WHERE ($1::uuid IS NULL OR h.patrimonio_id = $1::uuid)
       ORDER BY h.created_at DESC LIMIT $2`,
      [patrimonioId, limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar histórico' });
  }
});

export default router;
