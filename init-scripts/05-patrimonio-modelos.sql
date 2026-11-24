CREATE TABLE IF NOT EXISTS patrimonio_modelos_config (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    modelos JSONB NOT NULL DEFAULT '[
      {"id":"notebook-padrao-1","nome":"Notebook Padrão 1","categoria":"TI","subcategoria":"Notebooks","marca":"","modelo":"","specs":{}},
      {"id":"notebook-padrao-2","nome":"Notebook Padrão 2","categoria":"TI","subcategoria":"Notebooks","marca":"","modelo":"","specs":{}}
    ]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $migration$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'app_settings'
          AND column_name = 'patrimonio_modelos'
    ) THEN
        EXECUTE $copy$
            INSERT INTO patrimonio_modelos_config (id, modelos)
            SELECT 1, patrimonio_modelos
            FROM app_settings
            WHERE patrimonio_modelos IS NOT NULL
            ORDER BY id
            LIMIT 1
            ON CONFLICT (id) DO NOTHING
        $copy$;
    END IF;
END
$migration$;

INSERT INTO patrimonio_modelos_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
