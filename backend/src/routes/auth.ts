import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { authenticate, JWT_SECRET } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query('SELECT * FROM users WHERE LOWER(BTRIM(email)) = $1', [normalizedEmail]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Utilizador não encontrado' });
    }

    const user = result.rows[0];

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Utilizador desativado' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ message: 'Palavra-passe inválida' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao efetuar login' });
  }
});

const publicUser = (u: any) => ({
  id: u.id, nome: u.nome, email: u.email, role: u.role, cargo: u.cargo, setor: u.setor,
  status: u.status, avatar_url: u.avatar_url, created_at: u.created_at,
});

// POST /api/auth/signup - o primeiro utilizador torna-se admin
router.post('/signup', async (req, res) => {
  const { nome, email, password, cargo, setor } = req.body;
  if (!nome || !email || !password || String(password).length < 6) {
    return res.status(400).json({ message: 'Dados inválidos' });
  }
  try {
    const count = await pool.query('SELECT COUNT(*)::int AS n FROM users');
    if (count.rows[0].n > 0) {
      return res.status(403).json({ message: 'Cadastro público desativado. Solicite acesso a um administrador.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await pool.query('SELECT 1 FROM users WHERE LOWER(BTRIM(email)) = $1', [normalizedEmail]);
    if (exists.rows.length > 0) return res.status(400).json({ message: 'Este e-mail já está cadastrado' });
    const role = 'admin';
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (nome, email, password_hash, role, cargo, setor) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [String(nome).trim(), normalizedEmail, hash, role, cargo || null, setor || null]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar conta' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: any, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.auth.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Utilizador não encontrado' });
    res.json(publicUser(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao obter perfil' });
  }
});

// PUT /api/auth/me - atualizar perfil
router.put('/me', authenticate, async (req: any, res) => {
  const { nome, cargo, setor, avatar_url } = req.body;
  if (!nome) return res.status(400).json({ message: 'Nome é obrigatório' });
  try {
    const result = await pool.query(
      'UPDATE users SET nome=$1, cargo=$2, setor=$3, avatar_url=$4 WHERE id=$5 RETURNING *',
      [nome, cargo || null, setor || null, avatar_url || null, req.auth.id]
    );
    res.json(publicUser(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

// PUT /api/auth/me/password
router.put('/me/password', authenticate, async (req: any, res) => {
  const { password } = req.body;
  if (!password || String(password).length < 6) return res.status(400).json({ message: 'Mínimo 6 caracteres' });
  try {
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(password, 10), req.auth.id]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao alterar senha' });
  }
});

export default router;