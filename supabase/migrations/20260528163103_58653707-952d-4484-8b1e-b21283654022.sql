
-- 1) Novos campos em patrimonios
ALTER TABLE public.patrimonios ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.patrimonios ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Em uso';
ALTER TABLE public.patrimonios ADD COLUMN IF NOT EXISTS tag_empresa TEXT;
ALTER TABLE public.patrimonios ADD COLUMN IF NOT EXISTS fornecedor TEXT;
ALTER TABLE public.patrimonios ADD COLUMN IF NOT EXISTS garantia_ate DATE;

-- 2) Sequências por categoria + trigger
CREATE SEQUENCE IF NOT EXISTS public.pat_seq_ti START 10001;
CREATE SEQUENCE IF NOT EXISTS public.pat_seq_mob START 20001;
CREATE SEQUENCE IF NOT EXISTS public.pat_seq_elet START 30001;

ALTER TABLE public.patrimonios ALTER COLUMN codigo DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.set_patrimonio_codigo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    IF NEW.categoria = 'TI' THEN
      NEW.codigo := nextval('public.pat_seq_ti')::TEXT;
    ELSIF NEW.categoria = 'Mobiliário' THEN
      NEW.codigo := nextval('public.pat_seq_mob')::TEXT;
    ELSIF NEW.categoria = 'Equipamentos Eletrônicos' THEN
      NEW.codigo := nextval('public.pat_seq_elet')::TEXT;
    ELSE
      NEW.codigo := 'AST-' || LPAD(nextval('public.patrimonio_codigo_seq')::TEXT, 4, '0');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_pat_codigo ON public.patrimonios;
CREATE TRIGGER trg_set_pat_codigo BEFORE INSERT ON public.patrimonios
  FOR EACH ROW EXECUTE FUNCTION public.set_patrimonio_codigo();

-- 3) Movimentacoes
CREATE TABLE IF NOT EXISTS public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patrimonio_id UUID NOT NULL REFERENCES public.patrimonios(id) ON DELETE CASCADE,
  data_movimentacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  setor_origem_id UUID REFERENCES public.setores(id),
  setor_destino_id UUID REFERENCES public.setores(id),
  responsavel_origem_id UUID REFERENCES public.responsaveis(id),
  responsavel_destino_id UUID REFERENCES public.responsaveis(id),
  localizacao_origem TEXT,
  localizacao_destino TEXT,
  motivo TEXT,
  observacoes TEXT,
  usuario_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO authenticated;
GRANT ALL ON public.movimentacoes TO service_role;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mov" ON public.movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write mov" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update mov" ON public.movimentacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete mov" ON public.movimentacoes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 4) Manutencoes
CREATE TABLE IF NOT EXISTS public.manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patrimonio_id UUID NOT NULL REFERENCES public.patrimonios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'Corretiva',
  descricao TEXT,
  tecnico TEXT,
  fornecedor TEXT,
  custo NUMERIC DEFAULT 0,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao DATE,
  status TEXT NOT NULL DEFAULT 'Em andamento',
  observacoes TEXT,
  usuario_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencoes TO authenticated;
GRANT ALL ON public.manutencoes TO service_role;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read man" ON public.manutencoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write man" ON public.manutencoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update man" ON public.manutencoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete man" ON public.manutencoes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_manutencoes_updated BEFORE UPDATE ON public.manutencoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5) Setores oficiais Astrotur (limpa e repopula somente os que ainda não estão usados)
INSERT INTO public.setores (nome)
SELECT s FROM unnest(ARRAY[
  'Tráfego','RH','DP','Financeiro','Jurídico','Diretoria','TI','Operações',
  'Marketing','Compras','Almoxarifado','CCO','Manutenção','Qualidade',
  'Portaria','Obras','Comercial','Fretamento/Turismo'
]) AS s
WHERE NOT EXISTS (SELECT 1 FROM public.setores WHERE setores.nome = s);
