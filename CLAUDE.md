# WrapOS — Contexto do Projeto

## Stack
React 18 + TypeScript 5.2 + Vite 5 + Tailwind + Framer Motion + Recharts + Sonner + lucide-react

## Estrutura
- src/context/AppContext.tsx — estado global, 14 entidades, funções de CRUD e cascade
- src/context/ThemeContext.tsx — dark/light mode
- src/layouts/MainLayout.tsx — layout principal
- src/pages/ — 11 páginas (Dashboard, OrdemServico, Agendamento, Clientes, Operacional, Financeiro, Estoque, Precificacao, Equipe [+Metas tab], Garantia, Configuracoes, SelecionarPerfil)
- src/components/ — ActionButton, Badge, Button, Card, Modal, Table
- src/types/index.ts — todos os tipos TypeScript

## Entidades no AppContext
ordens, clientes, veiculos, servicos, agendamentos, instaladores, lancamentos, produtos, garantias, meta, configuracoes, alertas, tecnicos, produtosEstoque
Persistência: usePersistedState → localStorage com namespace por perfil

## Design System (novo — em implementação)
Fontes: Syne (títulos) + DM Sans (corpo) — já no index.html
Tokens em src/styles/tokens.css:
--wrap-bg: #0d0f14
--wrap-surface: #13161e
--wrap-surface2: #1a1e28
--wrap-border: rgba(255,255,255,0.07)
--wrap-border2: rgba(255,255,255,0.13)
--wrap-text: #f0f0f4
--wrap-muted: #5a6070
--wrap-accent: #e8304a
--wrap-accent-rgb: 232,48,74
--wrap-ok: #34d399
--wrap-warn: #ff6b35

## Regras invioláveis
- NUNCA alterar AppContext.tsx nem types/index.ts
- NUNCA quebrar lógica existente das páginas
- SEMPRE zero erros TypeScript
- Cor de acento injetada em runtime via ThemeContext

## Fases do redesign
- [x] Fase 1: MainLayout + Sidebar + Topbar + tokens
- [x] Fase 2: Patio.tsx — kanban de boxes com silhueta de carro, timer ao vivo, animação de saída
- [x] Fase 3: Dashboard de Gestão — absorve Avisos, KPIs gerenciais
- [x] Fase 4: Polimento das páginas + quick wins (bugs conhecidos)
- [x] Fase 5: Relatórios, busca ⌘K, API de placa, CEP automático

## Bugs corrigidos (Fase 4)
- corPrimaria aplicada em runtime via hexToRgb + CSS var injection
- Toggles de notificação persistem via configuracoes context
- UI de editar/deletar veículo em Clientes.tsx
- Motivo da baixa de estoque passado corretamente
- Deletar serviço em Precificação
- Estado de manutenção dos boxes persiste no localStorage por perfil
- Metas fundidas em Equipe.tsx como segunda aba; /metas → /equipe

## Fase 5 — features implementadas
- SearchSpotlight (Ctrl+K/Cmd+K): busca global em clientes, veículos e OS, com grupos e navegação
- API de placa (brasilapi.com.br/api/veiculos): auto-preenche marca/modelo/ano/cor em Clientes + CheckinRapido
- CEP automático (viacep.com.br): auto-preenche cidade + preview de endereço em Clientes
- Relatorios.tsx: 4 abas (Financeiro com LineChart + seletor de período, Técnicos com ranking + BarChart, Serviços com PieChart, Clientes com top/sem-retorno)
- Botão "Exportar PDF" com window.print() e @media print que oculta sidebar e topbar
- src/hooks/usePlacaLookup.ts + src/hooks/useCepLookup.ts
- src/components/SearchSpotlight.tsx

## Redesign completo — todas as 5 fases concluídas!
