# WrapOS — Contexto do Projeto

## Stack
React 18 + TypeScript 5.2 + Vite 5 + Tailwind + Framer Motion + Recharts + Sonner + lucide-react
Testes: Playwright (e2e/) — 6 specs cobrindo fluxo principal de OS, OS a receber, cancelamento, exclusão de cliente, estoque crítico. A suíte roda atrás do login do Supabase Auth: `e2e/global-setup.ts` loga uma vez com um usuário de teste já confirmado (credenciais em `.env.e2e.local`, nunca commitado) e salva a sessão em `e2e/.auth/user.json` (gitignored), reaproveitada por todos os specs via `storageState` no `playwright.config.ts`. A conta de teste é **dedicada só para e2e** (`teste-e2e@wrapos.local`), não uma conta pessoal/de uso real — já tem linha correspondente em `usuarios`, vinculada a uma loja de teste separada (`lojaId = e2e00000-0000-4000-8000-000000000001`, "Loja Teste E2E"), seguindo o processo em "Como adicionar um novo usuário/funcionário" abaixo. Isso evita misturar dado de teste com dado real e evita conflito se alguém estiver logado com a própria conta em outro navegador. Para rodar localmente, crie `.env.e2e.local` com `E2E_TEST_EMAIL` e `E2E_TEST_PASSWORD` dessa conta de teste (peça as credenciais, não use sua própria conta).

## Estrutura real
- src/context/AppContext.tsx — estado global, 11 entidades, CRUD e cascade (protegido — ver regras abaixo)
- src/context/ThemeContext.tsx — dark/light mode
- src/layouts/MainLayout.tsx — layout principal
- src/pages/ — Home (Início), Patio, OrdemServico, Agendamento, Clientes, Financeiro, Estoque, Equipe, Metas, Avisos, Relatorios, Configuracoes, SelecionarPerfil
- src/hooks/ — um hook por página, contém toda a lógica de negócio (useHome, usePatio, useOrdemServico, useAgendamento, useClientes, useFinanceiro, useEstoque, useEquipe, useMetas, useAvisos, useRelatorios, useConfiguracoes, useSelecionarPerfil, + usePlacaLookup, useCepLookup)
- src/lib/ — funções puras de status/regra reaproveitadas entre hooks (agendamentoStatus.ts, osStatus.ts, patioEtapa.ts)
- src/components/ — ActionButton, Badge, Button, Card, Modal, Table, BoxCard, CarSilhouette, AgendaGrid, CheckinRapido, ConcluirOSModal, DateField, OSDrawer, SearchSpotlight, StatusQuickEdit, LoginPage, ProtectedRoute, ContaNaoVinculada
- src/types/index.ts — todos os tipos TypeScript
- src/utils/backup.ts — exportarBackup()/importarBackup() para backup manual do localStorage (ver "Backup manual" abaixo)

## Padrão de arquitetura (importante)
- **Toda lógica de negócio fica em hooks**, nunca na página (`.tsx` de página só renderiza, usa o hook correspondente). Página overgrown → extrair pra hook, não reescrever do zero.
- **Lógica de status/regra compartilhada entre telas vai em src/lib/** como função pura (ex: `getStatusEfetivo` em agendamentoStatus.ts, mapeamento de etapa em patioEtapa.ts) — nunca duplicar essa lógica dentro de um hook.
- Persistência: `usePersistedState` → localStorage com namespace por perfil (dentro de AppContext.tsx).

## Entidades no AppContext
clientes, veiculos, ordens, agendamentos, instaladores, lancamentos, produtos, garantias, meta, configuracoes, servicos

## Arquitetura de Dados
- **Persistência ATUAL**: localStorage via `usePersistedState` em `AppContext.tsx` (11 entidades, namespace por perfil). Migração para Supabase está em andamento, mas ainda não ligada no runtime do app.
- **Banco**: Supabase (Postgres gerenciado), projeto "wrapos pwa latest version", região sa-east-1. Schema aplicado manualmente via SQL Editor do Supabase (não via migration automatizada).
- **Schema Prisma completo**: `prisma/schema.prisma` cobre hoje as 13 entidades — as 5 originais (Loja, Usuario, Cliente, Veiculo, OrdemServico) mais as 8 adicionadas depois (Agendamento, Instalador, LancamentoFinanceiro, Produto, Garantia, Meta, Configuracoes, Servico), espelhando os campos de `src/types/index.ts`. Todo model de entidade (exceto `Loja`) tem `lojaId: String` + relação/`@@index` para `Loja`, seguindo o padrão multi-tenant já existente. `Configuracoes` é a exceção: `lojaId` é `@unique` (relação 1:1, uma config por loja). Campos que apontam pra outra entidade "de negócio" (ex: `instaladorId` em `Agendamento`/`OrdemServico`, `osId` em `Garantia`/`LancamentoFinanceiro`, `clienteId`/`veiculoId`/`servicoId` fora do próprio dono) ficam como `String`/`String?` simples, **sem relação Prisma** — não há FK entre esses models, só entre cada entidade e `Loja`. `schema.sql` (raiz) é sempre a regeneração completa via `npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` — não editar à mão, sempre regenerar depois de mudar o schema.
- **Auth**: Supabase Auth (não Firebase). Implementado no frontend: `src/hooks/useAuth.ts` (signIn/signUp/signOut + estado de sessão, e busca a linha correspondente do usuário logado na tabela `usuarios` por `authUserId`) e `src/components/ProtectedRoute.tsx` (gate em torno de todo `App.tsx`, com três estados: `LoginPage` quando não há sessão, `ContaNaoVinculada` quando há sessão válida mas nenhuma linha em `usuarios` foi encontrada pra esse `authUserId`, e as páginas normais quando ambos existem). **Cadastro público está desabilitado**: `LoginPage.tsx` só expõe login (email/senha) e "Esqueci minha senha" (`supabase.auth.resetPasswordForEmail`). `signUp` continua exportado em `useAuth.ts` só para uso manual/scripts — novas contas são criadas por convite, não pela UI (ver "Como adicionar um novo usuário/funcionário" abaixo).
- **Prisma**: mantido **apenas** como schema-as-code (`prisma/schema.prisma`) para gerar SQL via `npx prisma migrate diff` — não há `PrismaClient` rodando no app. **Nunca rodar `npx prisma db push` ou `npx prisma migrate dev`** — a rede bloqueia conexão direta nas portas 5432/6543. `prisma migrate diff` entre dois schemas locais (`--from-schema`/`--to-schema`, ambos arquivos) não precisa de conexão com o banco e funciona normalmente.
- **Para alterar o banco**: editar `prisma/schema.prisma`, gerar o SQL incremental comparando a versão anterior do schema (salva antes de editar) com a nova via `npx prisma migrate diff --from-schema <schema-antigo.prisma> --to-schema prisma/schema.prisma --script`, salvar o resultado em `supabase/migrations/NNN_descricao.sql` (numeração sequencial — hoje até `002_entidades_completas.sql`), regenerar `schema.sql` completo (ver acima), e aplicar manualmente no SQL Editor do Supabase.
- **RLS (Row Level Security)**: `supabase/policies.sql` é a fonte da verdade das políticas de RLS para as 13 tabelas — todas com padrão confirmado em produção (inspecionado, não suposição), nenhuma pendente. Padrão: policy `FOR ALL TO public`, nome `{tabela}_por_loja` (exceto `ordens_servico` → `ordens_por_loja`), `USING ("lojaId" IN (SELECT usuarios."lojaId" FROM usuarios WHERE usuarios."authUserId" = auth.uid()::text))` — subquery direta na tabela `usuarios`, sem função auxiliar, com cast explícito de `auth.uid()` pra `::text`. Confirmado pra `clientes_por_loja`, `veiculos_por_loja`, `ordens_por_loja` e `usuarios_por_loja`. `lojas` é a única exceção estrutural (também confirmada): a policy `lojas_por_usuario` compara `id` — a própria linha, já que `lojas` não tem coluna `lojaId` — com o `lojaId` do usuário logado, em vez de `lojaId = lojaId` como nas demais. Igual às migrations, **aplicar esse arquivo não é automático** — sempre que uma policy mudar (aqui ou direto no painel do Supabase), atualize os dois lados manualmente para não ficarem dessincronizados.
- Docker/Express/Firebase foram removidos do projeto e **não devem ser reintroduzidos**.

## Como adicionar um novo usuário/funcionário
Criar um usuário no Supabase Auth **não** cria automaticamente a linha correspondente na tabela `usuarios` — sem essa linha, `useAuth.ts` nunca encontra o `usuario` (fica `null`) e o app mostra a tela `ContaNaoVinculada` em vez de liberar acesso, mesmo com login válido. Até esse vínculo ser automatizado, o processo é manual, sempre nesta ordem:

1. **Criar o usuário no Supabase Auth**: painel do Supabase → Authentication → Users → "Add user". Preencher email e senha (ou enviar convite, conforme o caso) e confirmar a conta.
2. **Copiar o `id` gerado** para esse usuário na tabela `auth.users` (é o UUID mostrado na lista de Users).
3. **Inserir manualmente a linha correspondente na tabela `usuarios`** (SQL Editor do Supabase), com:
   - `authUserId` = o `id` copiado no passo 2 (mesmo formato usado em `usuarios.authUserId` e comparado contra `auth.uid()::text` nas policies de RLS — ver `supabase/policies.sql`);
   - `lojaId` = o `id` da loja correta em `lojas`, para esse funcionário ficar no tenant certo;
   - demais campos (`nome`, `email`, `role`) preenchidos conforme o funcionário.

Sem os passos 2–3, o login funciona (a sessão do Supabase Auth é criada normalmente) mas o app trata a conta como não vinculada a nenhuma loja.

**Atenção ao colar UUIDs no Table Editor**: colar um UUID copiado (`authUserId`, `lojaId`) direto nos campos do formulário visual do Table Editor às vezes gruda uma quebra de linha invisível no final do valor — o erro de foreign key que o Postgres retorna nesse caso não deixa óbvio que a causa é essa. Se um INSERT/UPDATE falhar por FK mesmo com o valor parecendo correto visualmente, rode `SELECT id, length(id) FROM tabela WHERE ...;` — um UUID válido sempre tem `length = 36`; se vier diferente, limpe com `UPDATE tabela SET id = regexp_replace(id, '[^a-zA-Z0-9\-]', '', 'g') WHERE ...;`. Pra evitar o problema, prefira inserir via SQL Editor (`INSERT INTO ...`) em vez do formulário visual quando for copiar/colar UUIDs.

## Backup manual (rede de segurança até a migração pro Supabase)
Enquanto todos os dados de negócio (clientes, ordens, agendamentos, financeiro, estoque etc.) vivem só no `localStorage` do navegador, sem backup automático, `src/utils/backup.ts` oferece:
- `exportarBackup()` — varre todas as chaves do `localStorage` que começam com `wrapos_` (inclui as por perfil, `wrapos_perfil_<id>_<entidade>`) e baixa um JSON `wrapos-backup-{data}.json`.
- `importarBackup(arquivo: File)` — lê um JSON nesse mesmo formato e restaura as chaves no `localStorage`.
UI em Configurações (`src/pages/Configuracoes.tsx` + `src/hooks/useConfiguracoes.ts`), seção "Backup", com confirmação explícita em modal antes de sobrescrever dados na importação. Após importar, a página recarrega (`window.location.reload()`) porque `usePersistedState` só lê do `localStorage` na montagem inicial.

## Design System — atenção: dois sistemas coexistem
1. `src/index.css` define `--surface-900/800/700`, `--ui-border`, `--ui-text` — **esse é o que está plugado no tailwind.config** (classes `bg-surface-700`, `text-ui-text`, `border-ui-border`). Usar esse pra qualquer componente/página nova.
2. `src/styles/tokens.css` define `--wrap-bg`, `--wrap-surface`, `--wrap-text`, `--wrap-accent` etc — sistema mais antigo, ainda usado em ~199 lugares no código existente, importado em `main.tsx`. Não remover sem revisar todo uso primeiro.
Fontes: Syne (títulos, `font-display`) + DM Sans (corpo, `font-sans`).
Cor de acento (`--wrap-accent-rgb`) é injetada em runtime via ThemeContext.

## Regras
- **AppContext.tsx e types/index.ts**: não alterar sem antes parar e confirmar comigo o motivo e o escopo da mudança. Não é proibição absoluta — é "avise antes", porque afetam o sistema inteiro.
- NUNCA quebrar lógica existente das páginas.
- SEMPRE zero erros TypeScript (`npx tsc --noEmit` limpo antes de considerar concluído).
- Suíte Playwright (`e2e/`) deve continuar passando após qualquer mudança — rodar antes de finalizar.

## Redesign visual em andamento
Tela de Agendamento e tela Início já passaram por redesign completo (grid semanal, cards de ação, KPIs com tendência). Pátio está em fila pra virar kanban por etapa (Aguardando/Execução/Concluído, baseado em patioEtapa.ts), com troca de etapa automática por status mas também arrastável manualmente. Configurações (metas avançadas, colaboradores, avisos/alertas, cadastro de serviços) ainda não foi redesenhado — fica pra depois.
