import { Router } from 'express';
import { pool } from '../db';
import { requireAdmin } from '../middleware/requireAdminForWrites';

const router = Router();
router.use(requireAdmin);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, json_build_object('nome', s.nome) AS setor
       FROM responsaveis r LEFT JOIN setores s ON s.id = r.setor_id
       ORDER BY r.nome`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar responsáveis' });
  }
});

const values = (b: any) => [
  b.nome,
  b.cargo || null,
  b.setor_id || null,
  typeof b.email === 'string' ? b.email.trim() || null : null,
  typeof b.contato_email === 'string' ? b.contato_email.trim() || null : null,
  b.contato_telefone || null,
  typeof b.ativo === 'boolean' ? b.ativo : null,
];

router.post('/', async (req, res) => {
  if (!req.body.nome) return res.status(400).json({ message: 'Nome é obrigatório' });
  try {
    const result = await pool.query(
      `INSERT INTO responsaveis (nome, cargo, setor_id, email, contato_email, contato_telefone, ativo)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, TRUE)) RETURNING *`,
      values(req.body)
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar responsável' });
  }
});

router.put('/:id', async (req, res) => {
  if (!req.body.nome) return res.status(400).json({ message: 'Nome é obrigatório' });
  try {
    const result = await pool.query(
      `UPDATE responsaveis
       SET nome=$1, cargo=$2, setor_id=$3, email=$4, contato_email=$5, contato_telefone=$6,
           ativo=COALESCE($7, ativo)
       WHERE id=$8 RETURNING *`,
      [...values(req.body), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Responsável não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar responsável' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM responsaveis WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir responsável' });
  }
});

export default router;