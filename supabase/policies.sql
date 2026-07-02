-- ============================================================================
-- supabase/policies.sql — fonte da verdade das políticas de RLS do WrapOS
-- ============================================================================
--
-- Este arquivo é a ÚNICA documentação versionada das políticas de Row Level
-- Security (RLS) do projeto.
--
-- PADRÃO CONFIRMADO EM PRODUÇÃO (não é suposição): a policy "clientes_por_loja",
-- já aplicada em produção, foi inspecionada e usa exatamente esta expressão —
--
--   alter policy "clientes_por_loja"
--   on "public"."clientes"
--   to public
--   using (
--     ("lojaId" IN ( SELECT usuarios."lojaId"
--      FROM usuarios
--      WHERE (usuarios."authUserId" = (auth.uid())::text)))
--   );
--
-- — comando ALL (sem separar SELECT/INSERT/UPDATE/DELETE), role "public"
-- (não "authenticated"), com auth.uid() castado explicitamente para ::text
-- antes de comparar com authUserId (sem o cast a comparação quebra, já que
-- auth.uid() retorna uuid e authUserId é text), e a subquery resolve o
-- lojaId do usuário logado via usuarios."lojaId" (não filtra authUserId
-- direto na tabela de destino). A convenção de nome já usada no projeto é
-- "{tabela}_por_loja": clientes_por_loja, veiculos_por_loja, ordens_por_loja,
-- usuarios_por_loja já existem em produção com esse mesmo padrão — abaixo
-- eles estão documentados com a mesma expressão confirmada, e as 8 tabelas
-- novas (Fase 1.1) replicam literalmente o mesmo padrão.
--
-- Exceção de nome/coluna: a tabela "lojas" não tem coluna "lojaId" (é a
-- própria tabela raiz) — sua policy, "lojas_por_usuario", também foi
-- inspecionada e confirmada em produção, e compara "id" (não "lojaId") com
-- o lojaId do usuário logado:
--
--   alter policy "lojas_por_usuario"
--   on "public"."lojas"
--   to public
--   using (
--     (id IN ( SELECT usuarios."lojaId"
--      FROM usuarios
--      WHERE (usuarios."authUserId" = (auth.uid())::text)))
--   );
--
-- Com essa confirmação, as 13 tabelas do projeto têm policy com padrão
-- verificado em produção — nenhuma pendente.
--
-- IMPORTANTE: aplicar este arquivo NÃO é automático. Não existe migration
-- runner rodando isso contra o banco. Sempre que uma policy mudar (aqui ou
-- no painel do Supabase), atualize os dois lados manualmente:
--   1. Rode o SQL relevante no SQL Editor do Supabase.
--   2. Atualize este arquivo para refletir exatamente o que foi aplicado.
--
-- Estado atual (2026-07-01): as 13 tabelas (5 originais + 8 novas da Fase 1.1)
-- têm policy documentada aqui com padrão confirmado em produção — nenhuma
-- pendente. RLS já foi habilitado manualmente via Dashboard nas 8 tabelas
-- novas (agendamentos, instaladores, lancamentos_financeiro, produtos,
-- garantias, metas, configuracoes, servicos); as instruções
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY seguem aqui em todas as tabelas
-- apenas por completude/idempotência — rodá-las de novo não quebra nada.
-- ============================================================================


-- ── lojas ────────────────────────────────────────────────────────────────
-- Padrão confirmado em produção. Único caso que difere das demais tabelas:
-- compara "id" (a própria linha da loja) com o lojaId do usuário, já que
-- "lojas" não tem coluna "lojaId" (é a tabela raiz do multi-tenant).
ALTER TABLE lojas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lojas_por_usuario" ON "public"."lojas";
CREATE POLICY "lojas_por_usuario"
ON "public"."lojas"
FOR ALL
TO public
USING (
  ("id" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);


-- ── usuarios ─────────────────────────────────────────────────────────────
-- Convenção confirmada: usuarios_por_loja já existe em produção.
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_por_loja" ON "public"."usuarios";
CREATE POLICY "usuarios_por_loja"
ON "public"."usuarios"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);


-- ── clientes ─────────────────────────────────────────────────────────────
-- Padrão confirmado em produção (referência exata usada para replicar as demais).
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes_por_loja" ON "public"."clientes";
CREATE POLICY "clientes_por_loja"
ON "public"."clientes"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);


-- ── veiculos ─────────────────────────────────────────────────────────────
-- Convenção confirmada: veiculos_por_loja já existe em produção.
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "veiculos_por_loja" ON "public"."veiculos";
CREATE POLICY "veiculos_por_loja"
ON "public"."veiculos"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);


-- ── ordens_servico ───────────────────────────────────────────────────────
-- Convenção confirmada: a policy chama "ordens_por_loja" (não
-- "ordens_servico_por_loja"), já existe em produção.
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ordens_por_loja" ON "public"."ordens_servico";
CREATE POLICY "ordens_por_loja"
ON "public"."ordens_servico"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);


-- ── agendamentos (nova — Fase 1.1) ──────────────────────────────────────
-- RLS já habilitado via Dashboard; falta aplicar a policy abaixo.
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agendamentos_por_loja" ON "public"."agendamentos";
CREATE POLICY "agendamentos_por_loja"
ON "public"."agendamentos"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);


-- ── instaladores (nova — Fase 1.1) ──────────────────────────────────────
-- RLS já habilitado via Dashboard; falta aplicar a policy abaixo.
ALTER TABLE instaladores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instaladores_por_loja" ON "public"."instaladores";
CREATE POLICY "instaladores_por_loja"
ON "public"."instaladores"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);


-- ── lancamentos_financeiro (nova — Fase 1.1) ────────────────────────────
-- RLS já habilitado via Dashboard; falta aplicar a policy abaixo.
ALTER TABLE lancamentos_financeiro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lancamentos_financeiro_por_loja" ON "public"."lancamentos_financeiro";
CREATE POLICY "lancamentos_financeiro_por_loja"
ON "public"."lancamentos_financeiro"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);


-- ── produtos (nova — Fase 1.1) ───────────────────────────────────────────
-- RLS já habilitado via Dashboard; falta aplicar a policy abaixo.
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "produtos_por_loja" ON "public"."produtos";
CREATE POLICY "produtos_por_loja"
ON "public"."produtos"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);


-- ── garantias (nova — Fase 1.1) ──────────────────────────────────────────
-- RLS já habilitado via Dashboard; falta aplicar a policy abaixo.
ALTER TABLE garantias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garantias_por_loja" ON "public"."garantias";
CREATE POLICY "garantias_por_loja"
ON "public"."garantias"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);


-- ── metas (nova — Fase 1.1) ──────────────────────────────────────────────
-- RLS já habilitado via Dashboard; falta aplicar a policy abaixo.
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metas_por_loja" ON "public"."metas";
CREATE POLICY "metas_por_loja"
ON "public"."metas"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);


-- ── configuracoes (nova — Fase 1.1) ──────────────────────────────────────
-- 1:1 com loja ("lojaId" é único), mesma regra de isolamento se aplica.
-- RLS já habilitado via Dashboard; falta aplicar a policy abaixo.
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "configuracoes_por_loja" ON "public"."configuracoes";
CREATE POLICY "configuracoes_por_loja"
ON "public"."configuracoes"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);


-- ── servicos (nova — Fase 1.1) ───────────────────────────────────────────
-- RLS já habilitado via Dashboard; falta aplicar a policy abaixo.
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "servicos_por_loja" ON "public"."servicos";
CREATE POLICY "servicos_por_loja"
ON "public"."servicos"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);
