
-- Adicionar campos para preservar info do item excluído
ALTER TABLE public.historico_patrimonio
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS valor NUMERIC;

-- Preencher dados antigos
UPDATE public.historico_patrimonio h
SET codigo = p.codigo, nome = p.nome, categoria = p.categoria, valor = p.valor_atual
FROM public.patrimonios p
WHERE h.patrimonio_id = p.id AND h.codigo IS NULL;

-- Mudar FK para SET NULL (preservar histórico após exclusão)
ALTER TABLE public.historico_patrimonio
  DROP CONSTRAINT IF EXISTS historico_patrimonio_patrimonio_id_fkey;
ALTER TABLE public.historico_patrimonio
  ALTER COLUMN patrimonio_id DROP NOT NULL;
ALTER TABLE public.historico_patrimonio
  ADD CONSTRAINT historico_patrimonio_patrimonio_id_fkey
  FOREIGN KEY (patrimonio_id) REFERENCES public.patrimonios(id) ON DELETE SET NULL;

-- Atualizar trigger para logar INSERT/UPDATE/DELETE com snapshot
CREATE OR REPLACE FUNCTION public.log_patrimonio_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_patrimonio (patrimonio_id, acao, descricao, usuario_id, codigo, nome, categoria, valor)
    VALUES (NEW.id, 'CRIADO', 'Item cadastrado: ' || NEW.nome, NEW.created_by, NEW.codigo, NEW.nome, NEW.categoria, NEW.valor_atual);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.historico_patrimonio (patrimonio_id, acao, descricao, usuario_id, codigo, nome, categoria, valor)
    VALUES (NEW.id, 'ATUALIZADO', 'Item atualizado', auth.uid(), NEW.codigo, NEW.nome, NEW.categoria, NEW.valor_atual);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.historico_patrimonio (patrimonio_id, acao, descricao, usuario_id, codigo, nome, categoria, valor)
    VALUES (NULL, 'EXCLUIDO', 'Item excluído: ' || OLD.codigo || ' — ' || OLD.nome, auth.uid(), OLD.codigo, OLD.nome, OLD.categoria, OLD.valor_atual);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Recriar triggers
DROP TRIGGER IF EXISTS trg_log_patrimonio_changes ON public.patrimonios;
DROP TRIGGER IF EXISTS trg_log_patrimonio_delete ON public.patrimonios;

CREATE TRIGGER trg_log_patrimonio_changes
AFTER INSERT OR UPDATE ON public.patrimonios
FOR EACH ROW EXECUTE FUNCTION public.log_patrimonio_changes();

CREATE TRIGGER trg_log_patrimonio_delete
BEFORE DELETE ON public.patrimonios
FOR EACH ROW EXECUTE FUNCTION public.log_patrimonio_changes();
