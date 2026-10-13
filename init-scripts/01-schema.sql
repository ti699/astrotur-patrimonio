-- Habilitar extensão para UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Setores
CREATE TABLE IF NOT EXISTS setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Responsáveis
CREATE TABLE IF NOT EXISTS responsaveis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    cargo VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Patrimônios
CREATE TABLE IF NOT EXISTS patrimonios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    subcategoria VARCHAR(100),
    descricao TEXT,
    numero_serie VARCHAR(100),
    marca VARCHAR(100),
    modelo VARCHAR(100),
    tag_empresa VARCHAR(100),
    fornecedor VARCHAR(255),
    data_aquisicao DATE,
    garantia_ate DATE,
    data_compra DATE,
    data_inicio_garantia DATE,
    data_fim_garantia DATE,
    numero_garantia VARCHAR(100),
    valor_aquisicao NUMERIC(12, 2) DEFAULT 0.00,
    valor_atual NUMERIC(12, 2) DEFAULT 0.00,
    estado_conservacao VARCHAR(50) DEFAULT 'Bom',
    status VARCHAR(50) DEFAULT 'Em uso',
    responsavel_id UUID REFERENCES responsaveis(id) ON DELETE SET NULL,
    setor_id UUID REFERENCES setores(id) ON DELETE SET NULL,
    localizacao VARCHAR(255),
    observacoes TEXT,
    foto_url TEXT,
    specs JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Movimentações
CREATE TABLE IF NOT EXISTS movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrimonio_id UUID NOT NULL REFERENCES patrimonios(id) ON DELETE CASCADE,
    setor_origem_id UUID REFERENCES setores(id) ON DELETE SET NULL,
    setor_destino_id UUID REFERENCES setores(id) ON DELETE SET NULL,
    responsavel_origem_id UUID REFERENCES responsaveis(id) ON DELETE SET NULL,
    responsavel_destino_id UUID REFERENCES responsaveis(id) ON DELETE SET NULL,
    localizacao_origem VARCHAR(255),
    localizacao_destino VARCHAR(255),
    motivo TEXT,
    observacoes TEXT,
    usuario_id UUID,
    data_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir alguns dados de teste em Setores e Responsáveis
INSERT INTO setores (nome, descricao) VALUES 
('TI / Tecnologia', 'Departamento de Informática e Infraestrutura'),
('RH / Recursos Humanos', 'Gestão de Pessoas'),
('Financeiro', 'Contabilidade e Contas');

INSERT INTO responsaveis (nome, email, cargo) VALUES 
('Administrador', 'admin@empresa.com', 'Gestor de TI'),
('Suporte Técnico', 'suporte@empresa.com', 'Analista de Suporte');