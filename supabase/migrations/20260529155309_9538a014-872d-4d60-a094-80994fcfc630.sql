-- Tabela de documentos
CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patrimonio_id UUID NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  tamanho BIGINT,
  data_upload TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_upload UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_patrimonio ON public.documentos(patrimonio_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read docs" ON public.documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write docs" ON public.documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update docs" ON public.documentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete docs" ON public.documentos FOR DELETE TO authenticated USING (true);

-- Storage bucket (privado)
INSERT INTO storage.buckets (id, name, public) VALUES ('patrimonio-documentos', 'patrimonio-documentos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read documentos storage" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'patrimonio-documentos');
CREATE POLICY "auth upload documentos storage" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'patrimonio-documentos');
CREATE POLICY "auth delete documentos storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'patrimonio-documentos');