# WrapOS — Contexto do Projeto

## Stack
React 18 + TypeScript 5.2 + Vite 5 + Tailwind + Framer Motion + Recharts + Sonner + lucide-react
Testes: Playwright (e2e/) — 6 specs cobrindo fluxo principal de OS, OS a receber, cancelamento, exclusão de cliente, estoque crítico

## Estrutura real
- src/context/AppContext.tsx — estado global, 11 entidades, CRUD e cascade (protegido — ver regras abaixo)
- src/context/ThemeContext.tsx — dark/light mode
- src/layouts/MainLayout.tsx — layout principal
- src/pages/ — Home (Início), Patio, OrdemServico, Agendamento, Clientes, Financeiro, Estoque, Equipe, Metas, Avisos, Relatorios, Configuracoes, SelecionarPerfil
- src/hooks/ — um hook por página, contém toda a lógica de negócio (useHome, usePatio, useOrdemServico, useAgendamento, useClientes, useFinanceiro, useEstoque, useEquipe, useMetas, useAvisos, useRelatorios, useConfiguracoes, useSelecionarPerfil, + usePlacaLookup, useCepLookup)
- src/lib/ — funções puras de status/regra reaproveitadas entre hooks (agendamentoStatus.ts, osStatus.ts, patioEtapa.ts)
- src/components/ — ActionButton, Badge, Button, Card, Modal, Table, BoxCard, CarSilhouette, AgendaGrid, CheckinRapido, ConcluirOSModal, DateField, OSDrawer, SearchSpotlight, StatusQuickEdit
- src/types/index.ts — todos os tipos TypeScript

## Padrão de arquitetura (importante)
- **Toda lógica de negócio fica em hooks**, nunca na página (`.tsx` de página só renderiza, usa o hook correspondente). Página overgrown → extrair pra hook, não reescrever do zero.
- **Lógica de status/regra compartilhada entre telas vai em src/lib/** como função pura (ex: `getStatusEfetivo` em agendamentoStatus.ts, mapeamento de etapa em patioEtapa.ts) — nunca duplicar essa lógica dentro de um hook.
- Persistência: `usePersistedState` → localStorage com namespace por perfil (dentro de AppContext.tsx).

## Entidades no AppContext
clientes, veiculos, ordens, agendamentos, instaladores, lancamentos, produtos, garantias, meta, configuracoes, servicos

## Arquitetura de Dados
- **Persistência ATUAL**: localStorage via `usePersistedState` em `AppContext.tsx` (11 entidades, namespace por perfil). Migração para Supabase está em andamento, mas ainda não ligada no runtime do app.
- **Banco**: Supabase (Postgres gerenciado), projeto "wrapos pwa latest version", região sa-east-1. Schema aplicado manualmente via SQL Editor do Supabase (não via migration automatizada).
- **Auth**: Supabase Auth (não Firebase). Ainda não implementado no frontend.
- **Prisma**: mantido **apenas** como schema-as-code (`prisma/schema.prisma`) para gerar SQL via `npx prisma migrate diff` — não há `PrismaClient` rodando no app. **Nunca rodar `npx prisma db push` ou `npx prisma migrate dev`** — a rede bloqueia conexão direta nas portas 5432/6543.
- **Para alterar o banco**: editar `prisma/schema.prisma`, gerar o SQL com `npx prisma migrate diff --from-schema prisma/schema.prisma --to-schema prisma/schema-new.prisma --script`, e aplicar manualmente no SQL Editor do Supabase.
- Docker/Express/Firebase foram removidos do projeto e **não devem ser reintroduzidos**.

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
