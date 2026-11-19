import { pool } from '../db';

type UserForResponsavel = {
  nome?: string | null;
  email?: string | null;
  setor?: string | null;
};

export async function ensureResponsavelForUser(user: UserForResponsavel) {
  const email = user.email?.trim().toLowerCase();
  if (!email) throw new Error('Não é possível cadastrar um responsável sem e-mail');

  const nome = user.nome?.trim() || email.split('@')[0];
  const setor = user.setor?.trim() || null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(8432, hashtext($1))', [`responsavel-email:${email}`]);

    const existing = await client.query(
      `SELECT id FROM responsaveis
       WHERE LOWER(BTRIM(email)) = $1
       LIMIT 1`,
      [email]
    );

    if (existing.rows.length === 0) {
      let setorId: string | null = null;
      if (setor) {
        await client.query('SELECT pg_advisory_xact_lock(8432, hashtext($1))', [`hub-sector:${setor.toLowerCase()}`]);
        const setorResult = await client.query(
          'SELECT id FROM setores WHERE LOWER(BTRIM(nome)) = $1 LIMIT 1',
          [setor.toLowerCase()]
        );
        if (setorResult.rows.length > 0) {
          setorId = setorResult.rows[0].id;
        } else {
          const createdSetor = await client.query(
            'INSERT INTO setores (nome) VALUES ($1) RETURNING id',
            [setor]
          );
          setorId = createdSetor.rows[0].id;
        }
      }

      await client.query(
        'INSERT INTO responsaveis (nome, email, setor_id, ativo) VALUES ($1, $2, $3, TRUE)',
        [nome, email, setorId]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
