
-- Auto-log patrimonio transfers (responsavel, setor, localizacao changes) into movimentacoes
CREATE OR REPLACE FUNCTION public.auto_log_patrimonio_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origem_loc TEXT;
  v_destino_loc TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    COALESCE(NEW.responsavel_id::TEXT,'') IS DISTINCT FROM COALESCE(OLD.responsavel_id::TEXT,'')
    OR COALESCE(NEW.setor_id::TEXT,'') IS DISTINCT FROM COALESCE(OLD.setor_id::TEXT,'')
    OR COALESCE(NEW.localizacao,'') IS DISTINCT FROM COALESCE(OLD.localizacao,'')
  ) THEN
    -- Skip if a movimentacao for this patrimonio was just inserted in the last 3 seconds
    -- (avoids duplicate when movimentacoes page already inserts one and then updates patrimonio)
    IF NOT EXISTS (
      SELECT 1 FROM public.movimentacoes
      WHERE patrimonio_id = NEW.id
        AND created_at > now() - INTERVAL '3 seconds'
    ) THEN
      INSERT INTO public.movimentacoes (
        patrimonio_id,
        setor_origem_id, setor_destino_id,
        responsavel_origem_id, responsavel_destino_id,
        localizacao_origem, localizacao_destino,
        motivo, observacoes, usuario_id, data_movimentacao
      ) VALUES (
        NEW.id,
        OLD.setor_id, NEW.setor_id,
        OLD.responsavel_id, NEW.responsavel_id,
        OLD.localizacao, NEW.localizacao,
        'Alteração automática via edição do patrimônio',
        NULL, auth.uid(), now()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_log_patrimonio_movimentacao ON public.patrimonios;
CREATE TRIGGER trg_auto_log_patrimonio_movimentacao
AFTER UPDATE ON public.patrimonios
FOR EACH ROW
EXECUTE FUNCTION public.auto_log_patrimonio_movimentacao();
