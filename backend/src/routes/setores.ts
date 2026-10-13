import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM setores ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar setores' });
  }
});

router.post('/', async (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome) return res.status(400).json({ message: 'Nome é obrigatório' });
  try {
    const result = await pool.query('INSERT INTO setores (nome, descricao) VALUES ($1, $2) RETURNING *', [nome, descricao || null]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar setor' });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome) return res.status(400).json({ message: 'Nome é obrigatório' });
  try {
    const result = await pool.query('UPDATE setores SET nome = $1, descricao = $2 WHERE id = $3 RETURNING *', [nome, descricao || null, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Setor não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar setor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM setores WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir setor' });
  }
});

export default router;