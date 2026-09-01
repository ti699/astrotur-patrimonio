
CREATE INDEX IF NOT EXISTS idx_patrimonios_setor ON public.patrimonios(setor_id);
CREATE INDEX IF NOT EXISTS idx_patrimonios_responsavel ON public.patrimonios(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_patrimonio ON public.movimentacoes(patrimonio_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_patrimonio ON public.manutencoes(patrimonio_id);
CREATE INDEX IF NOT EXISTS idx_historico_patrimonio ON public.historico_patrimonio(patrimonio_id);
