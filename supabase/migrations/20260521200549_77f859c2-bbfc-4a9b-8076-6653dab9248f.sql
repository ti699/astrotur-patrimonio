
-- Sequence for patrimonio code
CREATE SEQUENCE IF NOT EXISTS patrimonio_codigo_seq START 1;

CREATE OR REPLACE FUNCTION generate_patrimonio_codigo()
RETURNS TEXT AS $$
BEGIN
  RETURN 'AST-' || LPAD(nextval('patrimonio_codigo_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Setores
CREATE TABLE public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Responsaveis
CREATE TABLE public.responsaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cargo TEXT,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  contato_email TEXT,
  contato_telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patrimonios
CREATE TABLE public.patrimonios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE DEFAULT generate_patrimonio_codigo(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  descricao TEXT,
  numero_serie TEXT,
  marca TEXT,
  modelo TEXT,
  data_aquisicao DATE,
  valor_aquisicao NUMERIC(12,2) DEFAULT 0,
  valor_atual NUMERIC(12,2) DEFAULT 0,
  estado_conservacao TEXT NOT NULL DEFAULT 'Bom',
  responsavel_id UUID REFERENCES public.responsaveis(id) ON DELETE SET NULL,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  localizacao TEXT,
  observacoes TEXT,
  foto_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Historico
CREATE TABLE public.historico_patrimonio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patrimonio_id UUID NOT NULL REFERENCES public.patrimonios(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  descricao TEXT,
  usuario_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_setores_updated BEFORE UPDATE ON public.setores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_responsaveis_updated BEFORE UPDATE ON public.responsaveis FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patrimonios_updated BEFORE UPDATE ON public.patrimonios FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Historico trigger
CREATE OR REPLACE FUNCTION log_patrimonio_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_patrimonio (patrimonio_id, acao, descricao, usuario_id)
    VALUES (NEW.id, 'CRIADO', 'Item cadastrado: ' || NEW.nome, NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.historico_patrimonio (patrimonio_id, acao, descricao, usuario_id)
    VALUES (NEW.id, 'ATUALIZADO', 'Item atualizado', auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_patrimonio_historico
AFTER INSERT OR UPDATE ON public.patrimonios
FOR EACH ROW EXECUTE FUNCTION log_patrimonio_changes();

-- RLS
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimonios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_patrimonio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read setores" ON public.setores FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write setores" ON public.setores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update setores" ON public.setores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete setores" ON public.setores FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read resp" ON public.responsaveis FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write resp" ON public.responsaveis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update resp" ON public.responsaveis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete resp" ON public.responsaveis FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read pat" ON public.patrimonios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write pat" ON public.patrimonios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update pat" ON public.patrimonios FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete pat" ON public.patrimonios FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read hist" ON public.historico_patrimonio FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write hist" ON public.historico_patrimonio FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('patrimonio-fotos', 'patrimonio-fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read fotos" ON storage.objects FOR SELECT USING (bucket_id = 'patrimonio-fotos');
CREATE POLICY "auth upload fotos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'patrimonio-fotos');
CREATE POLICY "auth update fotos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'patrimonio-fotos');
CREATE POLICY "auth delete fotos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'patrimonio-fotos');

-- Seed default setores
INSERT INTO public.setores (nome) VALUES
  ('Administrativo'), ('Financeiro'), ('RH'), ('TI'),
  ('Operacional'), ('Comercial'), ('Diretoria'), ('Outros')
ON CONFLICT DO NOTHING;
