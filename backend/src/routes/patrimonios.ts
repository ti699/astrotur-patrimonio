import { Router } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db'; // Importa a conexão do PostgreSQL
import { requireAdminForWrites } from '../middleware/requireAdminForWrites';
import {
  getPatrimonioAccess,
  hasFinancialFields,
  patrimonioScope,
  protectFinancialResponse,
} from '../utils/patrimonioAccess';
import { ensurePatrimonioModelosColumn } from '../utils/patrimonioModelos';

const router = Router();
router.use(requireAdminForWrites);

router.get('/modelos', async (_req, res) => {
  try {
    await ensurePatrimonioModelosColumn();
    let result = await pool.query('SELECT patrimonio_modelos FROM app_settings LIMIT 1');
    if (result.rows.length === 0) {
      result = await pool.query('INSERT INTO app_settings DEFAULT VALUES RETURNING patrimonio_modelos');
    }
    res.json(result.rows[0].patrimonio_modelos ?? []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao listar modelos padrão' });
  }
});

async function comNomeResponsavel<T extends { responsavel_id?: string | null }>(patrimonio: T) {
  const result = patrimonio.responsavel_id
    ? await pool.query('SELECT nome FROM responsaveis WHERE id = $1', [patrimonio.responsavel_id])
    : { rows: [] };
  return { ...patrimonio, responsavel_nome: result.rows[0]?.nome ?? null };
}

async function resolverResponsavelId(nome: unknown, fallbackId: unknown): Promise<string | null> {
  if (nome === undefined) {
    return typeof fallbackId === 'string' && fallbackId ? fallbackId : null;
  }
  if (typeof nome !== 'string' || !nome.trim()) return null;

  const nomeNormalizado = nome.trim();
  const existing = await pool.query(
    'SELECT id FROM responsaveis WHERE LOWER(BTRIM(nome)) = LOWER($1) LIMIT 1',
    [nomeNormalizado]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const created = await pool.query(
    'INSERT INTO responsaveis (nome) VALUES ($1) RETURNING id',
    [nomeNormalizado]
  );
  return created.rows[0].id;
}

// O histórico nunca deve impedir o salvamento do patrimônio
const registrarHistorico = async (patrimonioId: string, acao: string, descricao: string, usuarioId: string | null) => {
  try {
    await pool.query(
      'INSERT INTO historico_patrimonio (patrimonio_id, acao, descricao, usuario_id) VALUES ($1, $2, $3, $4)',
      [patrimonioId, acao, descricao, usuarioId]
    );
  } catch (error) {
    console.error('Erro ao registrar histórico:', error);
  }
};

// GET /api/patrimonios - Listar patrimónios
router.get('/', async (req: any, res) => {
  try {
    const access = await getPatrimonioAccess(req.auth);
    const scope = patrimonioScope(access, 'p');
    const result = await pool.query(
      `SELECT p.*, r.nome AS responsavel_nome, json_build_object('nome', s.nome) AS setor,
        json_build_object('nome', r.nome, 'cargo', r.cargo) AS responsavel
       FROM patrimonios p
       LEFT JOIN setores s ON s.id = p.setor_id
       LEFT JOIN responsaveis r ON r.id = p.responsavel_id
       WHERE ${scope.clause}
       ORDER BY p.codigo`,
      scope.values
    );
    res.json(protectFinancialResponse(result.rows, access));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao listar patrimónios' });
  }
});

const FAIXAS_CODIGO: Record<string, number> = {
  'TI': 10000,
  'Mobiliário': 20000,
  'Equipamentos Eletrônicos': 30000,
};

// Próximo código livre dentro da faixa da categoria (ex.: 10001, 10002...)
async function proximoCodigo(categoria: string): Promise<string | null> {
  const base = FAIXAS_CODIGO[categoria];
  if (!base) return null;
  const result = await pool.query(
    `SELECT COALESCE(MAX(codigo::int), $1)::int AS ultimo
     FROM patrimonios
     WHERE codigo ~ '^[0-9]+$' AND codigo::int > $1 AND codigo::int < $2`,
    [base, base + 10000]
  );
  return String(result.rows[0].ultimo + 1);
}

// GET /api/patrimonios/proximo-codigo?categoria=TI - Sugestão de código
router.get('/proximo-codigo', async (req, res) => {
  try {
    res.json({ codigo: await proximoCodigo(String(req.query.categoria ?? '')) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao gerar código' });
  }
});

// POST /api/patrimonios - Criar património
router.post('/', async (req: any, res) => {
  const {
    codigo, nome, categoria, subcategoria, descricao, numero_serie, marca, modelo,
    tag_empresa, fornecedor, data_aquisicao, garantia_ate, data_compra,
    data_inicio_garantia, data_fim_garantia, numero_garantia,
    valor_aquisicao, valor_atual, estado_conservacao, status,
    responsavel_id, responsavel_nome, setor_id, localizacao, observacoes, foto_url, specs,
  } = req.body;

  if (typeof nome !== 'string' || !nome.trim() || typeof categoria !== 'string' || !categoria.trim()) {
    return res.status(400).json({ message: 'Nome e categoria são obrigatórios' });
  }
  if (responsavel_nome !== undefined && responsavel_nome !== null &&
      (typeof responsavel_nome !== 'string' || responsavel_nome.trim().length > 255)) {
    return res.status(400).json({ message: 'Nome do responsável inválido' });
  }

  try {
    const access = await getPatrimonioAccess(req.auth);
    if (!access.isAdmin && hasFinancialFields(req.body)) {
      return res.status(403).json({ message: 'Apenas administradores podem informar valores financeiros' });
    }
    const codigoFinal = typeof codigo === 'string' && codigo.trim()
      ? codigo.trim()
      : await proximoCodigo(categoria.trim());
    const responsavelId = await resolverResponsavelId(responsavel_nome, responsavel_id);

    const result = await pool.query(
      `INSERT INTO patrimonios (
        codigo, nome, categoria, subcategoria, descricao, numero_serie, marca, modelo,
        tag_empresa, fornecedor, data_aquisicao, garantia_ate, data_compra,
        data_inicio_garantia, data_fim_garantia, numero_garantia,
        valor_aquisicao, valor_atual, estado_conservacao, status,
        responsavel_id, setor_id, localizacao, observacoes, foto_url, specs
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      ) RETURNING *`,
      [
        codigoFinal, nome.trim(), categoria.trim(), subcategoria || null, descricao || null,
        numero_serie || null, marca || null, modelo || null, tag_empresa || null,
        fornecedor || null, data_aquisicao || null, garantia_ate || null,
        data_compra || null, data_inicio_garantia || null, data_fim_garantia || null,
        numero_garantia || null, access.isAdmin ? valor_aquisicao ?? 0 : 0,
        access.isAdmin ? valor_atual ?? 0 : 0,
        estado_conservacao || 'Bom', status || 'Em uso', responsavelId,
        setor_id || null, localizacao || null, observacoes || null, foto_url || null,
        specs ?? {},
      ]
    );

    const criado = await comNomeResponsavel(result.rows[0]);
    await registrarHistorico(criado.id, 'Cadastro', `Patrimônio ${criado.codigo ?? ''} - ${criado.nome} cadastrado`.replace('  ', ' '), req.auth?.id ?? null);
    res.status(201).json(protectFinancialResponse(criado, access));
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Já existe um patrimônio com este código' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erro ao cadastrar patrimônio' });
  }
});

// GET /api/patrimonios/:id - Obter um único património
router.get('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const access = await getPatrimonioAccess(req.auth);
    const scope = patrimonioScope(access, 'p', 2);
    const result = await pool.query(
      `SELECT p.*, r.nome AS responsavel_nome, json_build_object('nome', s.nome) AS setor,
        json_build_object('nome', r.nome, 'cargo', r.cargo) AS responsavel
       FROM patrimonios p
       LEFT JOIN setores s ON s.id = p.setor_id
       LEFT JOIN responsaveis r ON r.id = p.responsavel_id
       WHERE p.id = $1 AND ${scope.clause}`,
      [id, ...scope.values]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Património não encontrado' });
    }
    res.json(protectFinancialResponse(result.rows[0], access));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao procurar património' });
  }
});

// PUT /api/patrimonios/:id - Atualizar património
router.put('/:id', async (req: any, res) => {
  const { id } = req.params;
  const {
    codigo, nome, categoria, subcategoria, descricao, numero_serie, marca, modelo,
    tag_empresa, fornecedor, data_aquisicao, garantia_ate, data_compra,
    data_inicio_garantia, data_fim_garantia, numero_garantia,
    valor_aquisicao, valor_atual, estado_conservacao, status,
    responsavel_id, responsavel_nome, setor_id, localizacao, observacoes, foto_url, specs,
  } = req.body;
  const codigoNovo = typeof codigo === 'string' && codigo.trim() ? codigo.trim() : null;
  if (responsavel_nome !== undefined && responsavel_nome !== null &&
      (typeof responsavel_nome !== 'string' || responsavel_nome.trim().length > 255)) {
    return res.status(400).json({ message: 'Nome do responsável inválido' });
  }

  try {
    const access = await getPatrimonioAccess(req.auth);
    if (!access.isAdmin && hasFinancialFields(req.body)) {
      return res.status(403).json({ message: 'Apenas administradores podem editar valores financeiros' });
    }
    const scope = patrimonioScope(access, 'p', 2);
    const anterior = await pool.query(
      `SELECT p.status, p.valor_aquisicao, p.valor_atual FROM patrimonios p
       WHERE p.id = $1 AND ${scope.clause}`,
      [id, ...scope.values]
    );
    if (anterior.rows.length === 0) {
      return res.status(404).json({ message: 'Património não encontrado' });
    }
    const updateScope = patrimonioScope(access, 'p', 28);
    const responsavelId = await resolverResponsavelId(responsavel_nome, responsavel_id);
    const result = await pool.query(
      `UPDATE patrimonios AS p SET
        codigo = COALESCE($1, codigo), nome = $2, categoria = $3, subcategoria = $4, descricao = $5,
        numero_serie = $6, marca = $7, modelo = $8, tag_empresa = $9, fornecedor = $10,
        data_aquisicao = $11, garantia_ate = $12, data_compra = $13,
        data_inicio_garantia = $14, data_fim_garantia = $15, numero_garantia = $16,
        valor_aquisicao = $17, valor_atual = $18, estado_conservacao = $19, status = $20,
        responsavel_id = $21, setor_id = $22, localizacao = $23, observacoes = $24,
        foto_url = $25, specs = $26, updated_at = NOW()
       WHERE p.id = $27 AND ${updateScope.clause}
       RETURNING *`,
      [
        codigoNovo, nome, categoria, subcategoria || null, descricao || null,
        numero_serie || null, marca || null, modelo || null, tag_empresa || null, fornecedor || null,
        data_aquisicao || null, garantia_ate || null, data_compra || null,
        data_inicio_garantia || null, data_fim_garantia || null, numero_garantia || null,
        access.isAdmin ? valor_aquisicao ?? 0 : anterior.rows[0].valor_aquisicao,
        access.isAdmin ? valor_atual ?? 0 : anterior.rows[0].valor_atual,
        estado_conservacao || 'Bom', status || 'Em uso',
        responsavelId, setor_id || null, localizacao || null, observacoes || null,
        foto_url || null, specs ?? {}, id,
        ...updateScope.values,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Património não encontrado' });
    }

    const atualizado = result.rows[0];
    await registrarHistorico(atualizado.id, 'Edição', `Patrimônio ${atualizado.codigo ?? ''} - ${atualizado.nome} atualizado`.replace('  ', ' '), req.auth?.id ?? null);
    if (anterior.rows.length > 0 && anterior.rows[0].status !== atualizado.status) {
      await registrarHistorico(
        atualizado.id,
        'Mudança de status',
        `Status alterado de ${anterior.rows[0].status ?? 'não informado'} para ${atualizado.status}`,
        req.auth?.id ?? null
      );
    }
    res.json(protectFinancialResponse(await comNomeResponsavel(atualizado), access));
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Já existe um patrimônio com este código' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar património' });
  }
});

// DELETE /api/patrimonios/:id - Excluir património
router.delete('/:id', async (req: any, res) => {
  try {
    const access = await getPatrimonioAccess(req.auth);
    const scope = patrimonioScope(access, 'p', 2);
    const result = await pool.query(
      `DELETE FROM patrimonios AS p WHERE p.id = $1 AND ${scope.clause} RETURNING p.id`,
      [req.params.id, ...scope.values]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Património não encontrado' });
    }
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir património' });
  }
});

// POST /api/patrimonios/:id/descarte - Registar descarte/baixa com justificativa
router.post('/:id/descarte', async (req: any, res) => {
  const { id } = req.params;
  const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
  if (!motivo) {
    return res.status(400).json({ message: 'A justificativa do descarte é obrigatória' });
  }

  let client: PoolClient | undefined;
  try {
    const access = await getPatrimonioAccess(req.auth);
    client = await pool.connect();
    await client.query('BEGIN');
    const scope = patrimonioScope(access, 'p', 2);
    const patrimonio = await client.query(
      `SELECT p.id, p.codigo, p.nome, p.status FROM patrimonios p
       WHERE p.id = $1 AND ${scope.clause} FOR UPDATE`,
      [id, ...scope.values]
    );
    if (patrimonio.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Patrimônio não encontrado' });
    }
    if (String(patrimonio.rows[0].status ?? '').trim().toUpperCase() === 'DESCARTADO') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Este patrimônio já foi descartado' });
    }

    const atualizado = await client.query(
      `UPDATE patrimonios SET status = 'DESCARTADO', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    await client.query(
      `INSERT INTO historico_patrimonio (patrimonio_id, acao, descricao, usuario_id)
       VALUES ($1, 'Descarte', $2, $3)`,
      [id, motivo, req.auth?.id ?? null]
    );
    await client.query('COMMIT');
    res.json(protectFinancialResponse(await comNomeResponsavel(atualizado.rows[0]), access));
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Erro ao registrar descarte/baixa' });
  } finally {
    client?.release();
  }
});

// POST /api/patrimonios/:id/termo-responsabilidade - Registrar emissão do termo
router.post('/:id/termo-responsabilidade', async (req: any, res) => {
  const { id } = req.params;
  const modelo = req.body?.modelo;
  let responsavel = typeof req.body?.responsavel === 'string' ? req.body.responsavel.trim() : '';
  if (!['smartphone', 'notebook'].includes(modelo) || !responsavel) {
    return res.status(400).json({ message: 'Modelo do termo e funcionário são obrigatórios' });
  }

  try {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const requestedResponsavelId = typeof req.body?.responsavel_id === 'string'
      ? req.body.responsavel_id.trim()
      : null;
    if (requestedResponsavelId && !uuidPattern.test(requestedResponsavelId)) {
      return res.status(400).json({ message: 'Responsável inválido' });
    }
    const suppliedResponsavelId = typeof req.body?.responsavel_id === 'string'
      ? requestedResponsavelId
      : uuidPattern.test(responsavel)
        ? responsavel
        : null;
    if (suppliedResponsavelId) {
      const responsavelResult = await pool.query(
        'SELECT nome FROM responsaveis WHERE id = $1',
        [suppliedResponsavelId]
      );
      if (responsavelResult.rows.length === 0) {
        return res.status(404).json({ message: 'Responsável não encontrado' });
      }
      responsavel = responsavelResult.rows[0].nome;
    }
    const access = await getPatrimonioAccess(req.auth);
    const scope = patrimonioScope(access, 'p', 2);
    const descricaoParameter = 2 + scope.values.length;
    const usuarioParameter = descricaoParameter + 1;
    const result = await pool.query(
      `INSERT INTO historico_patrimonio (patrimonio_id, acao, descricao, usuario_id)
       SELECT p.id, 'Termo de Responsabilidade', $${descricaoParameter}, $${usuarioParameter}
       FROM patrimonios p WHERE p.id = $1::uuid AND ${scope.clause}
       RETURNING *`,
      [
        id,
        ...scope.values,
        `Termo de Responsabilidade (${modelo === 'smartphone' ? 'Smartphone de Trabalho' : 'Notebook de Trabalho'}) emitido para ${responsavel}.`,
        req.auth?.id ?? null,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Patrimônio não encontrado' });
    }
    const evento = await pool.query(
      `SELECT h.*, p.categoria, r.nome AS responsavel_nome, u.nome AS usuario_nome,
        json_build_object('codigo', p.codigo, 'nome', p.nome, 'categoria', p.categoria) AS patrimonios
       FROM historico_patrimonio h
       LEFT JOIN patrimonios p ON p.id = h.patrimonio_id
       LEFT JOIN responsaveis r ON r.id = p.responsavel_id
       LEFT JOIN users u ON u.id = h.usuario_id
       WHERE h.id = $1`,
      [result.rows[0].id]
    );
    res.status(201).json(evento.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao registrar a emissão do termo' });
  }
});

export default router; // Exporta as rotas para o server.ts poder registrar