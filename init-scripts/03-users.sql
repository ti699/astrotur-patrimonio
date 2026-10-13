CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    cargo VARCHAR(100),
    setor VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'Astrotur',
    cnpj VARCHAR(30),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    website VARCHAR(255),
    logo_url TEXT,
    primary_color VARCHAR(20) NOT NULL DEFAULT '#C0392B',
    patrimonio_prefix VARCHAR(20) NOT NULL DEFAULT 'AST',
    currency VARCHAR(10) NOT NULL DEFAULT 'R$',
    items_per_page INTEGER NOT NULL DEFAULT 20
);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrimonio_id UUID NOT NULL REFERENCES patrimonios(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    tipo VARCHAR(150),
    categoria VARCHAR(50) DEFAULT 'Outros',
    storage_path TEXT NOT NULL,
    tamanho BIGINT,
    usuario_upload UUID,
    data_upload TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
