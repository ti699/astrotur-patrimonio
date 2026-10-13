-- Idempotente: pode ser executado manualmente em bancos já existentes.
ALTER TABLE responsaveis ADD COLUMN IF NOT EXISTS setor_id UUID REFERENCES setores(id) ON DELETE SET NULL;
ALTER TABLE responsaveis ADD COLUMN IF NOT EXISTS contato_email VARCHAR(255);
ALTER TABLE responsaveis ADD COLUMN IF NOT EXISTS contato_telefone VARCHAR(50);

CREATE TABLE IF NOT EXISTS manutencoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrimonio_id UUID NOT NULL REFERENCES patrimonios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL DEFAULT 'Corretiva',
    descricao TEXT,
    tecnico VARCHAR(255),
    fornecedor VARCHAR(255),
    custo NUMERIC(12, 2) DEFAULT 0.00,
    data_inicio DATE DEFAULT CURRENT_DATE,
    data_conclusao DATE,
    status VARCHAR(50) DEFAULT 'Em andamento',
    observacoes TEXT,
    usuario_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrimonio_id UUID NOT NULL REFERENCES patrimonios(id) ON DELETE CASCADE,
    sessao_id UUID NOT NULL,
    status_verificacao VARCHAR(50) NOT NULL,
    observacao TEXT,
    usuario_responsavel UUID,
    data_verificacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historico_patrimonio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrimonio_id UUID REFERENCES patrimonios(id) ON DELETE CASCADE,
    acao VARCHAR(100) NOT NULL,
    descricao TEXT,
    usuario_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
