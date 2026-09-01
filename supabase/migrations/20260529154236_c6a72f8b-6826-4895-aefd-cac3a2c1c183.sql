ALTER TABLE public.patrimonios
  ADD COLUMN IF NOT EXISTS data_compra DATE,
  ADD COLUMN IF NOT EXISTS data_inicio_garantia DATE,
  ADD COLUMN IF NOT EXISTS data_fim_garantia DATE,
  ADD COLUMN IF NOT EXISTS numero_garantia TEXT;

CREATE INDEX IF NOT EXISTS idx_patrimonios_data_fim_garantia ON public.patrimonios(data_fim_garantia);