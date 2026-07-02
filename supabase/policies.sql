-- ============================================================================
-- supabase/policies.sql — fonte da verdade das políticas de RLS do WrapOS
-- ============================================================================
--
-- Este arquivo é a ÚNICA documentação versionada das políticas de Row Level
-- Security (RLS) do projeto. As políticas para as 5 tabelas originais
-- (lojas, usuarios, clientes, veiculos, ordens_servico) já existiam
-- configuradas diretamente no painel do Supabase (SQL Editor / Authentication
-- > Policies) ANTES deste arquivo existir, e nunca tinham sido versionadas —
-- então o conteúdo abaixo para essas 5 tabelas é uma reconstrução de melhor
-- esforço do padrão que o app assume (isolamento por lojaId via
-- auth.uid() → usuarios.authUserId), não uma cópia garantida do que está
-- de fato aplicado hoje. Se, ao comparar com o painel do Supabase, houver
-- divergência, o painel é a fonte da verdade até este arquivo ser corrigido
-- para bater com ele.
--
-- Para as 8 tabelas novas (agendamentos, instaladores,
-- lancamentos_financeiro, produtos, garantias, metas, configuracoes,
-- servicos), este arquivo é a especificação do que AINDA PRECISA ser
-- aplicado manualmente no Supabase — hoje elas não têm nenhuma política.
--
-- IMPORTANTE: aplicar este arquivo NÃO é automático. Não existe migration
-- runner rodando isso contra o banco. Sempre que uma política mudar (aqui ou
-- no painel), atualize os dois lados manualmente:
--   1. Rode o SQL relevante no SQL Editor do Supabase.
--   2. Atualize este arquivo para refletir exatamente o que foi aplicado.
--
-- Modelo de multi-tenancy: cada linha de negócio pertence a uma "loja"
-- (lojaId). Um usuário autenticado (auth.uid(), do schema auth.users do
-- Supabase Auth) só pode ler/escrever linhas cujo lojaId seja igual ao lojaId
-- do registro em "usuarios" cujo authUserId bate com auth.uid().
-- ============================================================================


-- ── Função auxiliar ─────────────────────────────────────────────────────────
-- Evita duplicar a subquery "SELECT lojaId FROM usuarios WHERE authUserId =
-- auth.uid()" em 13 policies e, principalmente, evita recursão infinita na
-- própria tabela "usuarios" (uma policy em "usuarios" que faz SELECT em
-- "usuarios" via subquery reaplicaria a mesma policy recursivamente).
-- SECURITY DEFINER faz a função rodar com o privilégio de quem a criou
-- (dono da tabela), que por padrão ignora RLS — esse é o padrão recomendado
-- pela própria Supabase para esse caso.
CREATE OR REPLACE FUNCTION public.current_loja_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT "lojaId" FROM usuarios WHERE "authUserId" = auth.uid()::text LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_loja_id() TO authenticated;


-- ── lojas ────────────────────────────────────────────────────────────────
-- Exceção de nome de coluna: aqui é "id" (a própria loja), não "lojaId".
ALTER TABLE lojas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lojas_tenant_isolation ON lojas;
CREATE POLICY lojas_tenant_isolation ON lojas
  FOR ALL
  USING (id = public.current_loja_id())
  WITH CHECK (id = public.current_loja_id());


-- ── usuarios ─────────────────────────────────────────────────────────────
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_tenant_isolation ON usuarios;
CREATE POLICY usuarios_tenant_isolation ON usuarios
  FOR ALL
  USING ("lojaId" = public.current_loja_id())
  WITH CHECK ("lojaId" = public.current_loja_id());


-- ── clientes ─────────────────────────────────────────────────────────────
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clientes_tenant_isolation ON clientes;
CREATE POLICY clientes_tenant_isolation ON clientes
  FOR ALL
  USING ("lojaId" = public.current_loja_id())
  WITH CHECK ("lojaId" = public.current_loja_id());


-- ── veiculos ─────────────────────────────────────────────────────────────
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS veiculos_tenant_isolation ON veiculos;
CREATE POLICY veiculos_tenant_isolation ON veiculos
  FOR ALL
  USING ("lojaId" = public.current_loja_id())
  WITH CHECK ("lojaId" = public.current_loja_id());


-- ── ordens_servico ───────────────────────────────────────────────────────
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ordens_servico_tenant_isolation ON ordens_servico;
CREATE POLICY ordens_servico_tenant_isolation ON ordens_servico
  FOR ALL
  USING ("lojaId" = public.current_loja_id())
  WITH CHECK ("lojaId" = public.current_loja_id());


-- ── agendamentos (nova — Fase 1.1) ──────────────────────────────────────
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agendamentos_tenant_isolation ON agendamentos;
CREATE POLICY agendamentos_tenant_isolation ON agendamentos
  FOR ALL
  USING ("lojaId" = public.current_loja_id())
  WITH CHECK ("lojaId" = public.current_loja_id());


-- ── instaladores (nova — Fase 1.1) ──────────────────────────────────────
ALTER TABLE instaladores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS instaladores_tenant_isolation ON instaladores;
CREATE POLICY instaladores_tenant_isolation ON instaladores
  FOR ALL
  USING ("lojaId" = public.current_loja_id())
  WITH CHECK ("lojaId" = public.current_loja_id());


-- ── lancamentos_financeiro (nova — Fase 1.1) ────────────────────────────
ALTER TABLE lancamentos_financeiro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lancamentos_financeiro_tenant_isolation ON lancamentos_financeiro;
CREATE POLICY lancamentos_financeiro_tenant_isolation ON lancamentos_financeiro
  FOR ALL
  USING ("lojaId" = public.current_loja_id())
  WITH CHECK ("lojaId" = public.current_loja_id());


-- ── produtos (nova — Fase 1.1) ───────────────────────────────────────────
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS produtos_tenant_isolation ON produtos;
CREATE POLICY produtos_tenant_isolation ON produtos
  FOR ALL
  USING ("lojaId" = public.current_loja_id())
  WITH CHECK ("lojaId" = public.current_loja_id());


-- ── garantias (nova — Fase 1.1) ──────────────────────────────────────────
ALTER TABLE garantias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS garantias_tenant_isolation ON garantias;
CREATE POLICY garantias_tenant_isolation ON garantias
  FOR ALL
  USING ("lojaId" = public.current_loja_id())
  WITH CHECK ("lojaId" = public.current_loja_id());


-- ── metas (nova — Fase 1.1) ──────────────────────────────────────────────
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS metas_tenant_isolation ON metas;
CREATE POLICY metas_tenant_isolation ON metas
  FOR ALL
  USING ("lojaId" = public.current_loja_id())
  WITH CHECK ("lojaId" = public.current_loja_id());


-- ── configuracoes (nova — Fase 1.1) ──────────────────────────────────────
-- 1:1 com loja ("lojaId" é único), mesma regra de isolamento se aplica.
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS configuracoes_tenant_isolation ON configuracoes;
CREATE POLICY configuracoes_tenant_isolation ON configuracoes
  FOR ALL
  USING ("lojaId" = public.current_loja_id())
  WITH CHECK ("lojaId" = public.current_loja_id());


-- ── servicos (nova — Fase 1.1) ───────────────────────────────────────────
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS servicos_tenant_isolation ON servicos;
CREATE POLICY servicos_tenant_isolation ON servicos
  FOR ALL
  USING ("lojaId" = public.current_loja_id())
  WITH CHECK ("lojaId" = public.current_loja_id());
