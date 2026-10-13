-- Idempotente: cria o registro de cadastro para patrimônios que ainda não têm histórico.
INSERT INTO historico_patrimonio (patrimonio_id, acao, descricao, created_at)
SELECT p.id, 'Cadastro', 'Patrimônio ' || COALESCE(p.codigo || ' - ', '') || p.nome || ' cadastrado', p.created_at
FROM patrimonios p
WHERE NOT EXISTS (SELECT 1 FROM historico_patrimonio h WHERE h.patrimonio_id = p.id);
