import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import { pool } from '../db';
import { isCorporateEmail } from '../utils/email';

const router = Router();

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.auth?.role !== 'admin') return res.status(403).json({ message: 'Acesso restrito a administradores' });
  next();
};

router.use(requireAdmin);

const USER_COLS = 'id, nome, email, role, cargo, setor, status, avatar_url, created_at';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isValidPatrimonioModelos(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  const names = new Set<string>();
  const specKeys = new Set(['processador', 'ram_gb', 'ram_tipo', 'armaz_tipo', 'armaz_gb', 'so']);

  for (const item of value) {
    if (!isRecord(item) || !isRecord(item.specs)) return false;
    const { id, nome, categoria, subcategoria, marca, modelo, specs } = item;
    if (
      typeof id !== 'string' || !id.trim() || id === 'manual' ||
      typeof nome !== 'string' || !nome.trim() || nome.trim().length > 100 ||
      typeof categoria !== 'string' || !categoria.trim() ||
      typeof subcategoria !== 'string' || !subcategoria.trim() ||
      typeof marca !== 'string' || typeof modelo !== 'string'
    ) return false;

    const normalizedName = nome.trim().toLocaleLowerCase();
    if (ids.has(id) || names.has(normalizedName)) return false;
    ids.add(id);
    names.add(normalizedName);

    for (const [key, spec] of Object.entries(specs)) {
      if (!specKeys.has(key)) return false;
      if (key === 'ram_gb' || key === 'armaz_gb') {
        if (spec !== null && (typeof spec !== 'number' || !Number.isFinite(spec))) return false;
      } else if (typeof spec !== 'string') {
        return false;
      }
    }
  }
  return true;
}

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
    const modelos = await pool.query('SELECT modelos FROM patrimonio_modelos_config WHERE id = 1');
    res.json({ ...result.rows[0], patrimonio_modelos: modelos.rows[0]?.modelos ?? [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao obter configurações' });
  }
});

router.put('/settings', async (req, res) => {
  const fields = SETTINGS_FIELDS.filter((f) => req.body[f] !== undefined);
  const hasModelos = req.body.patrimonio_modelos !== undefined;
  if (fields.length === 0 && !hasModelos) return res.status(400).json({ message: 'Nada para atualizar' });
  if (hasModelos && !isValidPatrimonioModelos(req.body.patrimonio_modelos)) {
    return res.status(400).json({ message: 'Lista de modelos padrão inválida' });
  }
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    let settings: Record<string, unknown> = {};
    if (fields.length > 0) {
      await client.query("SELECT pg_advisory_xact_lock(8432, hashtext('app-settings'))");
      const current = await client.query('SELECT id FROM app_settings ORDER BY id LIMIT 1 FOR UPDATE');
      const id = current.rows.length
        ? current.rows[0].id
        : (await client.query('INSERT INTO app_settings DEFAULT VALUES RETURNING id')).rows[0].id;
      const sets = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      const result = await client.query(
        `UPDATE app_settings SET ${sets} WHERE id = $${fields.length + 1} RETURNING *`,
        [...fields.map((field) => req.body[field]), id]
      );
      settings = result.rows[0];
    }

    let patrimonioModelos: unknown;
    if (hasModelos) {
      const result = await client.query(
        `INSERT INTO patrimonio_modelos_config (id, modelos, updated_at)
         VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE
         SET modelos = EXCLUDED.modelos, updated_at = NOW()
         RETURNING modelos`,
        [JSON.stringify(req.body.patrimonio_modelos)]
      );
      patrimonioModelos = result.rows[0].modelos;
    }

    await client.query('COMMIT');
    res.json({
      ...settings,
      ...(hasModelos ? { patrimonio_modelos: patrimonioModelos } : {}),
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Erro ao guardar configurações' });
  } finally {
    client?.release();
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
