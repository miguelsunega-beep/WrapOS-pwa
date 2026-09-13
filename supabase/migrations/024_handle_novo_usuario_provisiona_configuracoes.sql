-- Fecha o bug encontrado por investigação em 2026-09-13: handle_novo_usuario()
-- (migration 023) provisiona "lojas"+"usuarios" no signup via /cadastro, mas
-- nunca "configuracoes". A primeira vez que o app carregava pra essa loja,
-- useConfiguracoesSupabase.ts (ver hook) inseria sozinho uma linha com um
-- placeholder hardcoded ("WrapOS Studio"/"São Paulo"/"(11) 3456-7890"/
-- "contato@wrapos.com.br") — completamente desconectado do que foi digitado
-- no formulário de cadastro. Essa linha já nascia persistida no banco como se
-- fosse dado real da loja (não era só um estado transitório de tela).
-- Confirmado em 3 lojas reais de produção afetadas antes desta migration:
-- "GSB Wrapping" (a0000000-0000-4000-8000-000000000001, telefone/cidade
-- ainda no placeholder), "Loja Teste - Gabi" (ee72b01e-3c04-43e5-87dc-
-- c5a3563f94e4, telefone ainda no placeholder) e "beaver"
-- (138a06d9-d03c-41a8-81dc-bad7475f3af5, os 3 campos intocados) — reparadas
-- manualmente em seguida, fora desta migration.
--
-- Fix: a própria trigger passa a inserir a linha de "configuracoes" na mesma
-- transação de "lojas"/"usuarios", herdando nomeLoja do mesmo nome_loja usado
-- em lojas.nome. cidade/telefone/email não têm campo equivalente no
-- formulário de /cadastro (só pede nome da loja) — ficam '' (nunca NULL: as
-- 3 colunas são NOT NULL sem default, confirmado via information_schema; e
-- nunca um segundo placeholder inventado). corPrimaria/numeroBoxes/
-- comissaoPadrao mantêm os mesmos valores-padrão de sempre
-- (CONFIGURACOES_PADRAO/configuracoesPadrao em useConfiguracoesSupabase.ts)
-- — não são dado de identidade da loja, não há "valor errado" a evitar aqui.
-- notifEstoque/notifGarantia/notifPosVenda ficam de fora do INSERT de
-- propósito — a própria coluna já tem DEFAULT true no schema.
--
-- Nota: isto NÃO cobre o fluxo manual de "adicionar funcionário a uma loja
-- existente" (ver CLAUDE.md) — esse fluxo cria o usuário pelo painel do
-- Supabase Auth sem passar `nome_loja` no metadata, então handle_novo_usuario()
-- continua sendo no-op pra ele (mesmo comportamento de sempre) e não tenta
-- inserir uma segunda linha de "configuracoes" pra uma loja que já tem uma.
-- useConfiguracoesSupabase.ts manteve seu próprio insert-if-missing como
-- fallback só pra esse caso (loja já existe, nome real já existe em
-- "lojas" — sem risco de reintroduzir o placeholder).
--
-- Mesma assinatura de antes (RETURNS trigger, sem parâmetros) — CREATE OR
-- REPLACE basta, sem precisar DROP FUNCTION. Grants (REVOKE EXECUTE da
-- migration 023) são preservados automaticamente pelo Postgres quando a
-- function não é recriada do zero, mas o REVOKE abaixo é repetido de forma
-- idempotente por clareza/defesa em profundidade, mesmo padrão da 023.

CREATE OR REPLACE FUNCTION public.handle_novo_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nome_loja    text;
  v_nome_usuario text;
  v_loja_id      text;
BEGIN
  v_nome_loja := nullif(trim(new.raw_user_meta_data ->> 'nome_loja'), '');

  IF v_nome_loja IS NULL THEN
    RETURN new;
  END IF;

  v_nome_usuario := nullif(trim(new.raw_user_meta_data ->> 'nome_usuario'), '');
  v_loja_id := gen_random_uuid()::text;

  INSERT INTO public.lojas (id, nome, plano)
  VALUES (v_loja_id, v_nome_loja, 'free');

  INSERT INTO public.usuarios (id, "authUserId", nome, email, role, "lojaId")
  VALUES (
    gen_random_uuid()::text,
    new.id::text,
    coalesce(v_nome_usuario, split_part(new.email, '@', 1)),
    new.email,
    'OWNER',
    v_loja_id
  );

  INSERT INTO public.configuracoes (
    id, "lojaId", "nomeLoja", cidade, telefone, email,
    "corPrimaria", "numeroBoxes", "comissaoPadrao"
  )
  VALUES (
    gen_random_uuid()::text,
    v_loja_id,
    v_nome_loja,
    '',
    '',
    '',
    '#E94560',
    6,
    12
  );

  RETURN new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_novo_usuario() FROM PUBLIC, anon, authenticated;
