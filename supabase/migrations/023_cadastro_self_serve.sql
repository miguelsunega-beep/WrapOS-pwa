-- Cadastro self-serve (docs do prompt de privacidade de onboarding, 2026-09-13):
-- cliente cria a própria conta/senha via /cadastro, sem passar pela sua mão.
-- Duas partes nesta migration, aplicadas juntas porque uma depende da outra
-- pra ser segura:
--
-- 1) Corrige um achado da investigação (item 1.3 do prompt): a policy
--    "usuarios_por_loja" não tinha WITH CHECK, e pra uma policy FOR ALL sem
--    WITH CHECK o Postgres reusa o USING também pra validar INSERT/UPDATE.
--    O USING de "usuarios_por_loja" só exige authUserId = auth.uid()::text —
--    não restringe lojaId nem role. Na prática, ANTES desta migration,
--    qualquer usuário autenticado (mesmo sem nenhuma linha em "usuarios")
--    já conseguia se auto-inserir com lojaId de QUALQUER loja existente e
--    role = 'OWNER', ou um usuário já vinculado podia fazer UPDATE trocando
--    seu próprio lojaId/role pra assumir outra loja — falha de isolamento
--    multi-tenant pré-existente, independente desta feature. Confirmado por
--    grep que nenhum código do app faz INSERT/UPDATE em "usuarios" hoje (só
--    SELECT em useAuth.ts e nos specs e2e) — travar isso não quebra nada.
--    Fix: WITH CHECK (false) explícito, bloqueando INSERT/UPDATE de
--    QUALQUER role coberto por "public" (anon + authenticated). SELECT/DELETE
--    continuam exatamente como antes (USING inalterado). "lojas" não precisou
--    de mudança — a subquery de lojas_por_usuario já retorna vazio pra quem
--    não tem linha em usuarios, bloqueando o INSERT corretamente (confirmado
--    antes de escrever esta migration).
--
-- 2) Função SECURITY DEFINER + trigger AFTER INSERT em auth.users que
--    provisiona "lojas"+"usuarios" automaticamente no signup — a ÚNICA forma
--    de escrever em "usuarios" continua sendo por aqui, já que o item 1
--    acima fechou a porta de INSERT direto do client. SECURITY DEFINER roda
--    como o dono da function (postgres, que tem rolbypassrls=true — confirmado
--    antes de escrever esta migration), então o INSERT dentro da function
--    ignora RLS por completo, independente de quão restritiva a policy fique.
--
--    Só provisiona quando `raw_user_meta_data->>'nome_loja'` vem preenchido
--    (é o que options.data.nome_loja em supabase.auth.signUp() do /cadastro
--    manda) — se vier ausente/vazio, a function não faz nada e deixa o
--    INSERT em auth.users seguir normal. Isso é deliberado: o fluxo manual
--    documentado em "Como adicionar um novo usuário/funcionário" (você cria
--    o usuário no painel do Supabase Auth e depois insere manualmente a
--    linha em "usuarios" vinculando à loja certa) NÃO passa esse metadata.
--    Se a function sempre provisionasse uma loja nova incondicionalmente,
--    todo funcionário criado pelo fluxo manual ganharia uma loja-lixo como
--    OWNER e o INSERT manual do passo 3 desse processo passaria a falhar por
--    violação do UNIQUE em "usuarios"."authUserId" (a linha já existiria,
--    criada pelo trigger, antes de você rodar o INSERT manual). Com o no-op
--    em metadata ausente, o fluxo manual continua idêntico a hoje.
--
--    id de "lojas"/"usuarios" gerado com gen_random_uuid()::text — mora em
--    pg_catalog (nativo do Postgres, não precisa de extensão), então resolve
--    mesmo com o search_path restrito abaixo (pg_catalog é sempre pesquisado
--    primeiro, não pode ser sequestrado por search_path).

-- ── 1) Fecha o INSERT/UPDATE direto do client em "usuarios" ────────────────
DROP POLICY IF EXISTS "usuarios_por_loja" ON "public"."usuarios";
CREATE POLICY "usuarios_por_loja"
ON "public"."usuarios"
FOR ALL
TO public
USING (
  ("authUserId" = (auth.uid())::text)
)
WITH CHECK (false);

-- ── 2) Provisionamento automático via trigger em auth.users ────────────────
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

  RETURN new;
END;
$$;

-- Defesa em profundidade: por padrão, o projeto concede EXECUTE em novas
-- functions de public pra anon/authenticated (confirmado via pg_default_acl
-- antes de escrever esta migration — não é o default "puro" do Postgres,
-- é a configuração deste projeto Supabase). Revoga explicitamente dos dois:
-- a única forma de chamar esta function passa a ser o trigger (que não
-- depende de EXECUTE — o executor de trigger invoca a function diretamente).
-- Isso soma com a proteção de RETURNS trigger em si (chamar via SELECT/rpc
-- direto já falha com "trigger functions can only be called as triggers"
-- independente de grant).
REVOKE EXECUTE ON FUNCTION public.handle_novo_usuario() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_provisiona_conta ON auth.users;
CREATE TRIGGER on_auth_user_created_provisiona_conta
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_novo_usuario();
