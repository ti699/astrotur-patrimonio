import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db';
import { isCorporateEmail } from '../utils/email';

const router = Router();

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.auth?.role !== 'admin') return res.status(403).json({ message: 'Acesso restrito a administradores' });
  next();
};

router.use(requireAdmin);

const USER_COLS = 'id, nome, email, role, cargo, setor, status, avatar_url, created_at';

/* ---------- Utilizadores ---------- */
router.get('/users', async (_req, res) => {
  try {
    const result = await pool.query(`SELECT ${USER_COLS} FROM users ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao listar utilizadores' });
  }
});

router.post('/users', async (req, res) => {
  const { nome, email, password, cargo, setor, role } = req.body;
  if (typeof email !== 'string' || !isCorporateEmail(email)) {
    return res.status(400).json({ message: 'E-mail deve pertencer a um domínio corporativo permitido' });
  }
  if (!nome || !email || !password || String(password).length < 6) return res.status(400).json({ message: 'Dados inválidos' });
  if (role !== undefined && !['admin', 'gestor', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Perfil de usuário inválido' });
  }
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const exists = await pool.query('SELECT 1 FROM users WHERE LOWER(BTRIM(email)) = $1', [normalizedEmail]);
    if (exists.rows.length > 0) return res.status(400).json({ message: 'Este e-mail já está cadastrado' });
    const result = await pool.query(
      `INSERT INTO users (nome, email, password_hash, role, cargo, setor) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${USER_COLS}`,
      [nome, normalizedEmail, await bcrypt.hash(password, 10), role ?? 'user', cargo || null, setor || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar utilizador' });
  }
});

router.put('/users/:id', async (req: any, res) => {
  const { nome, email, cargo, setor, role, status } = req.body;
  if (role !== undefined && !['admin', 'gestor', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Perfil de usuário inválido' });
  }
  let normalizedEmail: string | null = null;
  if (email !== undefined) {
    if (typeof email !== 'string' || !isCorporateEmail(email)) {
      return res.status(400).json({ message: 'E-mail deve pertencer a um domínio corporativo permitido' });
    }
    normalizedEmail = email.trim().toLowerCase();
  }
  if (req.params.id === req.auth.id && ((role !== undefined && role !== 'admin') || status === 'inactive')) {
    return res.status(400).json({ message: 'Não é possível remover o seu próprio acesso de administrador' });
  }
  try {
    if (normalizedEmail) {
      const exists = await pool.query(
        'SELECT 1 FROM users WHERE LOWER(BTRIM(email)) = $1 AND id <> $2',
        [normalizedEmail, req.params.id]
      );
      if (exists.rows.length > 0) return res.status(400).json({ message: 'Este e-mail já está cadastrado' });
    }
    const result = await pool.query(
      `UPDATE users SET nome = COALESCE($1, nome), email = COALESCE($2, email), cargo = COALESCE($3, cargo), setor = COALESCE($4, setor),
        role = COALESCE($5, role), status = COALESCE($6, status) WHERE id = $7 RETURNING ${USER_COLS}`,
      [nome ?? null, normalizedEmail, cargo ?? null, setor ?? null, role ?? null, status ?? null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Utilizador não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar utilizador' });
  }
});

router.delete('/users/:id', async (req: any, res) => {
  if (req.params.id === req.auth.id) return res.status(400).json({ message: 'Não é possível excluir a sua própria conta' });
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir utilizador' });
  }
});

/* ---------- Configurações da aplicação ---------- */
const SETTINGS_FIELDS = ['company_name', 'cnpj', 'email', 'phone', 'address', 'website', 'logo_url',
  'primary_color', 'patrimonio_prefix', 'currency', 'items_per_page', 'dark_mode'];

router.get('/settings', async (_req, res) => {
  try {
    let result = await pool.query('SELECT * FROM app_settings LIMIT 1');
    if (result.rows.length === 0) result = await pool.query('INSERT INTO app_settings DEFAULT VALUES RETURNING *');
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao obter configurações' });
  }
});

router.put('/settings', async (req, res) => {
  const fields = SETTINGS_FIELDS.filter((f) => req.body[f] !== undefined);
  if (fields.length === 0) return res.status(400).json({ message: 'Nada para atualizar' });
  try {
    const current = await pool.query('SELECT id FROM app_settings LIMIT 1');
    const id = current.rows.length ? current.rows[0].id : (await pool.query('INSERT INTO app_settings DEFAULT VALUES RETURNING id')).rows[0].id;
    const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const result = await pool.query(
      `UPDATE app_settings SET ${sets} WHERE id = $${fields.length + 1} RETURNING *`,
      [...fields.map((f) => req.body[f]), id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao guardar configurações' });
  }
});

/* ---------- Exportação ---------- */
const EXPORT_TABLES = ['patrimonios', 'setores', 'responsaveis'];

router.get('/export/:table', async (req, res) => {
  if (!EXPORT_TABLES.includes(req.params.table)) return res.status(400).json({ message: 'Tabela inválida' });
  try {
    const result = await pool.query(`SELECT * FROM ${req.params.table}`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao exportar' });
  }
});

export default router;
