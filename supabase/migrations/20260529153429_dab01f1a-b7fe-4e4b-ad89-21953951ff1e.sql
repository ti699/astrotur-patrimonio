
CREATE TABLE public.inventarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patrimonio_id UUID NOT NULL,
  status_verificacao TEXT NOT NULL DEFAULT 'Encontrado',
  observacao TEXT,
  usuario_responsavel UUID,
  data_verificacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sessao_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventarios_patrimonio ON public.inventarios(patrimonio_id);
CREATE INDEX idx_inventarios_sessao ON public.inventarios(sessao_id);
CREATE INDEX idx_inventarios_data ON public.inventarios(data_verificacao DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventarios TO authenticated;
GRANT ALL ON public.inventarios TO service_role;

ALTER TABLE public.inventarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read inv" ON public.inventarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write inv" ON public.inventarios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update inv" ON public.inventarios FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete inv" ON public.inventarios FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
