import { Router } from 'express';
import { pool } from '../db'; // Importa a conexão do PostgreSQL

const router = Router();

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
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, json_build_object('nome', s.nome) AS setor,
        json_build_object('nome', r.nome, 'cargo', r.cargo) AS responsavel
       FROM patrimonios p
       LEFT JOIN setores s ON s.id = p.setor_id
       LEFT JOIN responsaveis r ON r.id = p.responsavel_id
       ORDER BY p.codigo`
    );
    res.json(result.rows);
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
    responsavel_id, setor_id, localizacao, observacoes, foto_url, specs,
  } = req.body;

  if (typeof nome !== 'string' || !nome.trim() || typeof categoria !== 'string' || !categoria.trim()) {
    return res.status(400).json({ message: 'Nome e categoria são obrigatórios' });
  }

  try {
    const codigoFinal = typeof codigo === 'string' && codigo.trim()
      ? codigo.trim()
      : await proximoCodigo(categoria.trim());

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
        numero_garantia || null, valor_aquisicao ?? 0, valor_atual ?? 0,
        estado_conservacao || 'Bom', status || 'Em uso', responsavel_id || null,
        setor_id || null, localizacao || null, observacoes || null, foto_url || null,
        specs ?? {},
      ]
    );

    const criado = result.rows[0];
    await registrarHistorico(criado.id, 'Cadastro', `Patrimônio ${criado.codigo ?? ''} - ${criado.nome} cadastrado`.replace('  ', ' '), req.auth?.id ?? null);
    res.status(201).json(criado);
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Já existe um patrimônio com este código' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erro ao cadastrar patrimônio' });
  }
});

// GET /api/patrimonios/:id - Obter um único património
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT p.*, json_build_object('nome', s.nome) AS setor,
        json_build_object('nome', r.nome, 'cargo', r.cargo) AS responsavel
       FROM patrimonios p
       LEFT JOIN setores s ON s.id = p.setor_id
       LEFT JOIN responsaveis r ON r.id = p.responsavel_id
       WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Património não encontrado' });
    }
    res.json(result.rows[0]);
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
    responsavel_id, setor_id, localizacao, observacoes, foto_url, specs,
  } = req.body;
  const codigoNovo = typeof codigo === 'string' && codigo.trim() ? codigo.trim() : null;

  try {
    const result = await pool.query(
      `UPDATE patrimonios SET
        codigo = COALESCE($1, codigo), nome = $2, categoria = $3, subcategoria = $4, descricao = $5,
        numero_serie = $6, marca = $7, modelo = $8, tag_empresa = $9, fornecedor = $10,
        data_aquisicao = $11, garantia_ate = $12, data_compra = $13,
        data_inicio_garantia = $14, data_fim_garantia = $15, numero_garantia = $16,
        valor_aquisicao = $17, valor_atual = $18, estado_conservacao = $19, status = $20,
        responsavel_id = $21, setor_id = $22, localizacao = $23, observacoes = $24,
        foto_url = $25, specs = $26, updated_at = NOW()
       WHERE id = $27
       RETURNING *`,
      [
        codigoNovo, nome, categoria, subcategoria || null, descricao || null,
        numero_serie || null, marca || null, modelo || null, tag_empresa || null, fornecedor || null,
        data_aquisicao || null, garantia_ate || null, data_compra || null,
        data_inicio_garantia || null, data_fim_garantia || null, numero_garantia || null,
        valor_aquisicao ?? 0, valor_atual ?? 0, estado_conservacao || 'Bom', status || 'Em uso',
        responsavel_id || null, setor_id || null, localizacao || null, observacoes || null,
        foto_url || null, specs ?? {}, id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Património não encontrado' });
    }

    const atualizado = result.rows[0];
    await registrarHistorico(atualizado.id, 'Edição', `Patrimônio ${atualizado.codigo ?? ''} - ${atualizado.nome} atualizado`.replace('  ', ' '), req.auth?.id ?? null);
    res.json(atualizado);
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Já existe um patrimônio com este código' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar património' });
  }
});

export default router; // Exporta as rotas para o server.ts poder registrar