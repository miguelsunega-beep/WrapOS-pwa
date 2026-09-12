-- ITEM 1 da auditoria de segurança (docs/ANALISE-PRODUTO-COMERCIAL-2026-09.md):
-- as 8 tabelas _backup_* criadas manualmente antes de migrations passadas
-- (2026-07-24) ficaram com RLS desabilitado e com GRANT de anon/authenticated
-- concedido pelo Supabase por padrão (novo objeto em `public` herda os
-- privilégios default do schema). Como têm RLS desligado, PostgREST expõe
-- CRUD completo pra qualquer chamada com a chave anon.
--
-- Confirmado antes de aplicar (2026-09-11/12):
-- (a) nenhuma tem RLS habilitado;
-- (b) todas concedem SELECT/INSERT/UPDATE/DELETE/etc a anon e authenticated;
-- (c) nenhuma é referenciada em src/, e2e/ ou supabase/ (grep limpo).
--
-- Esta migration NÃO apaga nenhuma tabela nem dado — só bloqueia acesso:
-- habilita RLS sem nenhuma policy (nega tudo por padrão) e revoga os grants
-- explícitos de anon/authenticated.

ALTER TABLE public."_backup_20260724_lojas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_backup_20260724_ordens_servico" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_backup_20260724b_clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_backup_20260724b_garantias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_backup_20260724b_lancamentos_financeiro" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_backup_20260724b_metas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_backup_20260724b_ordens_servico" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_backup_20260724b_produtos" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public."_backup_20260724_lojas" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."_backup_20260724_ordens_servico" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."_backup_20260724b_clientes" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."_backup_20260724b_garantias" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."_backup_20260724b_lancamentos_financeiro" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."_backup_20260724b_metas" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."_backup_20260724b_ordens_servico" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."_backup_20260724b_produtos" FROM anon, authenticated;
