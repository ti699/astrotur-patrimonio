import express, { Router } from 'express';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { pool } from '../db';

const router = Router();
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx'];

router.get('/', async (req, res) => {
  const patrimonioId = req.query.patrimonio_id as string;
  if (!patrimonioId) return res.status(400).json({ message: 'patrimonio_id é obrigatório' });
  try {
    const result = await pool.query('SELECT * FROM documentos WHERE patrimonio_id = $1 ORDER BY data_upload DESC', [patrimonioId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao listar documentos' });
  }
});

// POST /api/documentos?patrimonio_id=&nome=&categoria= com o ficheiro como corpo binário
router.post('/', express.raw({ type: () => true, limit: MAX_BYTES }), async (req: any, res) => {
  const { patrimonio_id, nome, categoria } = req.query as Record<string, string>;
  const ext = (nome?.split('.').pop() ?? '').toLowerCase();
  if (!patrimonio_id || !nome || !ALLOWED_EXT.includes(ext)) return res.status(400).json({ message: 'Ficheiro inválido' });
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ message: 'Ficheiro vazio' });
  const storagePath = `${randomUUID()}.${ext}`;
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, storagePath), req.body);
    const result = await pool.query(
      `INSERT INTO documentos (patrimonio_id, nome_arquivo, tipo, categoria, storage_path, tamanho, usuario_upload)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [patrimonio_id, nome, req.headers['content-type'] || ext, categoria || 'Outros', storagePath, req.body.length, req.auth.id ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await fs.rm(path.join(UPLOAD_DIR, storagePath), { force: true });
    console.error(error);
    res.status(500).json({ message: 'Erro ao enviar documento' });
  }
});

router.get('/:id/file', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM documentos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Documento não encontrado' });
    const doc = result.rows[0];
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(doc.nome_arquivo)}`);
    res.sendFile(path.join(UPLOAD_DIR, path.basename(doc.storage_path)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao obter documento' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM documentos WHERE id = $1 RETURNING storage_path', [req.params.id]);
    if (result.rows.length > 0) await fs.rm(path.join(UPLOAD_DIR, path.basename(result.rows[0].storage_path)), { force: true });
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir documento' });
  }
});

export default router;
