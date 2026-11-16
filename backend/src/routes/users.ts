import { randomBytes, timingSafeEqual } from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db';

const router = Router();

const normalizeRole = (role: string, email: string) => {
  const normalizedRole = role.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (
    email === 'ti@astroturviagens.com' ||
    ['admin', 'administrator', 'administrador', 'master', 'gestor_master', 'gestormaster'].includes(normalizedRole)
  ) {
    return 'admin';
  }
  return 'user';
};

router.post('/sync-from-hub', async (req, res) => {
  const expectedSecret = process.env.PATRIMONIO_SSO_CLIENT_SECRET;
  if (!expectedSecret) {
    console.error('PATRIMONIO_SSO_CLIENT_SECRET não configurado');
    return res.status(500).json({ message: 'Sincronização SSO não configurada' });
  }

  const receivedSecret = req.get('x-sso-secret') ?? '';
  const receivedBuffer = Buffer.from(receivedSecret);
  const expectedBuffer = Buffer.from(expectedSecret);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const role = typeof req.body?.role === 'string' ? req.body.role : '';
  const setor = typeof req.body?.setor === 'string' ? req.body.setor.trim() : '';

  if (
    !nome ||
    nome.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 255 ||
    !role.trim() ||
    !setor ||
    setor.length > 100
  ) {
    return res.status(400).json({ message: 'Nome, e-mail, perfil e setor válidos são obrigatórios' });
  }

  const userRole = normalizeRole(role, email);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(8432, hashtext($1))', [`hub-email:${email}`]);
    await client.query('SELECT pg_advisory_xact_lock(8432, hashtext($1))', [`hub-sector:${setor.toLowerCase()}`]);

    const sectorResult = await client.query(
      'SELECT id FROM setores WHERE LOWER(BTRIM(nome)) = $1 LIMIT 1',
      [setor.toLowerCase()]
    );
    if (sectorResult.rows.length === 0) {
      await client.query('INSERT INTO setores (nome) VALUES ($1)', [setor]);
    }

    const existing = await client.query(
      'SELECT id FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
      [email]
    );
    let result;
    let statusCode = 200;
    if (existing.rows.length > 0) {
      result = await client.query(
        'UPDATE users SET nome = $1, role = $2, setor = $3 WHERE id = $4 RETURNING id, nome, email, role, setor, status',
        [nome, userRole, setor, existing.rows[0].id]
      );
    } else {
      const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      result = await client.query(
        `INSERT INTO users (nome, email, password_hash, role, setor)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome, role = EXCLUDED.role, setor = EXCLUDED.setor
         RETURNING id, nome, email, role, setor, status`,
        [nome, email, passwordHash, userRole, setor]
      );
      statusCode = 201;
    }

    await client.query('COMMIT');
    res.status(statusCode).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Erro ao sincronizar usuário do Hub' });
  } finally {
    client.release();
  }
});

export default router;
