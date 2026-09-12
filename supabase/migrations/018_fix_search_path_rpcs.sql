-- ITEM 2 da auditoria de segurança (docs/ANALISE-PRODUTO-COMERCIAL-2026-09.md):
-- as 5 funções RPC (migrations 008/009/011/012/013) foram criadas sem
-- `search_path` fixo — o advisor de segurança do Supabase (function_search_path_mutable)
-- aponta as 5. Risco baixo hoje porque todas são SECURITY INVOKER (confirmado
-- via pg_proc.prosecdef = false), mas um search_path mutável ainda permite
-- que um objeto com o mesmo nome em outro schema no search_path do chamador
-- seja resolvido no lugar do esperado. Correção de uma linha por função —
-- não recria nenhuma function, só fixa o search_path.

ALTER FUNCTION public.proximo_numero_os(loja_id_param text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.concluir_os_atomica(
  p_os_id text, p_loja_id text, p_os_patch jsonb, p_lancamento_receita jsonb,
  p_garantia jsonb, p_cliente_id text, p_cliente_delta_total_gasto numeric,
  p_meta_id text, p_meta_delta_numero_os integer, p_estoque_deltas jsonb,
  p_lancamento_despesa_material jsonb, p_agendamento_id text
) SET search_path = public, pg_temp;

ALTER FUNCTION public.registrar_pagamento_os_atomica(
  p_os_id text, p_loja_id text, p_os_patch jsonb, p_lancamento_receita jsonb
) SET search_path = public, pg_temp;

ALTER FUNCTION public.salvar_materiais_os_atomica(
  p_os_id text, p_loja_id text, p_materiais_usados jsonb, p_estoque_deltas jsonb
) SET search_path = public, pg_temp;

ALTER FUNCTION public.cancelar_os_atomica(
  p_os_id text, p_loja_id text, p_agendamento_id text
) SET search_path = public, pg_temp;
