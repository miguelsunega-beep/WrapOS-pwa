# WrapOS — Análise de Prontidão Comercial

**Data:** 2026-09-10
**Escopo:** avaliação do produto para venda a lojas de envelopamento/estética automotiva, com o cliente usando sozinho.
**Método:** leitura do código em `main` (commit `e5ffa51`), do schema Prisma, das 15 migrations, e inspeção direta do banco de produção (`lasafrkmjfjkjhrleogo`) via SQL. Nenhum código foi alterado.

---

## Veredito em uma linha

O núcleo operacional (OS, pátio, agendamento, clientes, financeiro) está **funcional e maduro o bastante para uma loja real usar**. O que impede a venda hoje não é o núcleo — é a **borda**: não existe caminho de entrada de um cliente novo sem você no banco, o reset de senha não fecha o ciclo, e a tela de Configurações promete três coisas que não acontecem. São correções de dias, não de meses.

---

## 1. Auditoria de funcionalidades

### Estado de build

- `npx tsc --noEmit` limpo.
- 7 specs Playwright cobrindo fluxo de OS, OS a receber, cancelamento, exclusão de cliente, estoque crítico, numeração por loja e conclusão atômica.
- **A suíte e2e roda contra o banco de PRODUÇÃO** (`.env` e `.env.e2e.local` apontam ambos para `lasafrkmjfjkjhrleogo`) e faz `DELETE` em 11 tabelas. Ver seção 4.
,
### Módulos ativos

| Módulo | Rota | Ponta a ponta? | Gap que aparece nos primeiros dias |
|---|---|---|---|
| Início | `/` | Sim | Loja vazia mostra estados vazios corretos, mas nenhum CTA de "comece por aqui" |
| Pátio | `/patio` | Sim | — |
| Ordens de Serviço | `/ordens` | Sim | Impressão quebrada; pagamento binário |
| Agendamento | `/agendamento` | Sim | Nenhum aviso ao cliente |
| Clientes | `/clientes` | Sim | Sem validação de CPF nem dedupe |
| Financeiro (+ aba Relatórios) | `/financeiro` | Sim | Sem exportação de dados |
| Estoque | `/estoque` | Parcial | Sem histórico de movimentação |
| Equipe | `/equipe` | Sim | Instaladores não são usuários do sistema |
| Configurações | `/configuracoes` | Parcial | Três funções decorativas e um botão destrutivo |

**Código morto:** `src/pages/Metas.tsx`, `src/hooks/useMetas.ts`, `src/pages/Avisos.tsx`, `src/hooks/useAvisos.ts` — sem rota e sem import. `Relatorios.tsx` **não** é código morto (é aba dentro de Financeiro), apesar de `/relatorios` ser redirect.

### Detalhamento por módulo

**Ordens de Serviço — o módulo mais maduro do sistema.**

- Ciclo completo: `checkin` → `aguardando_aprovacao` → `em_andamento` → `concluido` → entregue. Cancelamento e exclusão cobertos.
- Conclusão, pagamento, materiais e cancelamento rodam em RPC Postgres atômica (migrations 009/011/012/013). Não há escrita multi-tabela solta.
- Numeração sequencial por loja via `proximo_numero_os()`, à prova de corrida.
- **Gap:** o botão "Imprimir" é um `window.print()` cru, sem nenhuma folha `@media print` associada ([OSModal.tsx:714](src/components/OSModal.tsx#L714)). O que sai na impressora é a tela inteira com menu lateral, não um documento. Não existe orçamento nem OS em PDF para entregar ao cliente final.
- **Gap:** `StatusPagamento` é binário (`pago` / `a_receber`). Não há sinal/entrada, parcelamento nem data de vencimento. Uma loja que cobra 50% na entrada não consegue representar isso na OS — só como lançamento avulso na categoria "Adiantamento", desconectado do saldo.

**Estoque — em meio de refatoração, e é o módulo mais frágil para o nicho.**

- Migration 014 trocou `quantidade`/`minimo` de `Int` para `numeric(10,2)` e introduziu `tipoControle` (`unidade` / `bobina` / `volume`). Correto e bem executado.
- **O enum tem `volume`, mas nenhuma tela cria produto com esse tipo.** O formulário só produz `bobina` ou `unidade`, decidido pela categoria (`PPF`/`Envelopamento`). Produto líquido (ceramic coating, ML) continua sem tratamento real.
- **`isRetalho` existe no schema e nenhuma UI o cria.** O campo entrou pronto esperando o "Round 2".
- **Gap crítico para o nicho:** não existe histórico de movimentação. A tela pede o motivo da baixa, o hook recebe e descarta: `void motivo` em [useProdutosSupabase.ts:103](src/hooks/useProdutosSupabase.ts#L103), com o comentário "não existe tabela de histórico de movimentação". Uma loja de envelopamento perde metros de bobina em corte e erro; sem histórico, o dono não tem como responder "para onde foi o filme".

**Configurações — o módulo que mais expõe o produto a uma reclamação de confiança.**

- **Três toggles de notificação não fazem nada.** `notifEstoque`, `notifGarantia` e `notifPosVenda` são persistidos em `configuracoes` e lidos por zero consumidores no código inteiro. O cliente liga "Alertas de Garantia Vencendo" e nada acontece, nunca.
- **O toggle de 2FA é falso.** É `useState` local, não persistido e não conectado ao Supabase Auth — o próprio comentário no código diz "local, não persistido" ([useConfiguracoes.ts](src/hooks/useConfiguracoes.ts)). O cliente acredita que ativou dois fatores.
- **"Exportar backup agora" não exporta mais nenhum dado de negócio.** `exportarBackup()` varre só chaves `wrapos_*` do `localStorage`; desde que as 11 entidades migraram para o Supabase, sobrou lixo não-transacional (flags de migração). O botão baixa um JSON que parece um backup e não é.
- **"Zona de Perigo" apaga a loja inteira sem restrição.** `resetarDadosTeste(lojaId)` deleta OS, veículos, clientes, produtos, lançamentos, agendamentos, instaladores, garantias, serviços e meta. Qualquer pessoa logada na loja alcança esse botão, e não existe backup funcional para desfazer.
- **Cadastro de serviços não captura preço.** O tipo `Servico` tem `preco` e `tempEstimado`, mas o formulário coleta apenas `nome` (`blankServico = () => ({ nome: '' })`). Resultado: a tabela de preços da loja não guarda preço, e a criação de OS exige digitar o valor à mão toda vez ([useOrdemServico.ts:332](src/hooks/useOrdemServico.ts#L332) bloqueia se nenhum serviço tiver valor).

**Clientes**

- Exclusão é inteligente: cliente com OS ou agendamento é inativado, não apagado.
- **Gap:** sem validação de CPF e sem detecção de duplicata por telefone ou placa. Duas semanas de uso e a base tem o mesmo cliente três vezes.
- **Gap menor:** a FK `veiculos → clientes` é `ON DELETE CASCADE` no banco (confirmado em produção), mas `deletarCliente` não remove os veículos do estado React. O veículo some do banco e continua na tela até dar refresh.

**Agendamento**

- Redesenhado (grid semanal, lista no mobile). Conflito de horário tratado em `agendamentoStatus.ts`.
- **Gap:** zero comunicação com o cliente final. Não há lembrete por WhatsApp, SMS ou email. O status `confirmado` é uma marcação manual de quem atendeu o telefone.

**Financeiro / Relatórios**

- Entradas e saídas categorizadas, 6 meses de série, ticket médio, a receber, gráficos Recharts. A aba Relatórios tem `@media print` de verdade (único lugar do app que tem).
- **Gap:** nenhuma exportação CSV/Excel. O contador da loja pede a planilha e não existe caminho — nem no Financeiro, nem em lugar nenhum.
- **Gap:** não há contas a pagar com vencimento; a saída é sempre um lançamento já realizado.

**Equipe**

- CRUD de instaladores + metas do mês. **Instaladores não são usuários do sistema** — não logam, não têm conta. É um cadastro de nomes e comissão.

---

## 2. Onboarding de um novo tenant

### O que acontece hoje, passo a passo

| Passo | Estado | Quem faz |
|---|---|---|
| Criar conta de acesso | Não existe na UI | Você, no painel Auth do Supabase |
| Criar a loja (`lojas`) | Não existe na UI | Você, via SQL |
| Vincular conta à loja (`usuarios`) | Não existe na UI | Você, via SQL |
| Nomear a loja | Parcial | Cliente, em Configurações — mas grava em `configuracoes.nomeLoja`, não em `lojas.nome` |
| Cadastrar serviços | Existe, incompleto | Cliente — sem campo de preço |
| Cadastrar instaladores | Existe | Cliente |
| Primeiro produto no estoque | Existe | Cliente |
| Primeiro agendamento | Existe | Cliente |
| Primeira OS | Existe, com pré-requisito | Cliente — bloqueado até haver ao menos um serviço cadastrado |

### Onde o fluxo quebra

- **Não existe cadastro self-serve.** `LoginPage.tsx` expõe apenas login e "esqueci minha senha". `signUp` continua exportado em `useAuth.ts` mas nenhuma tela o chama. Toda loja nova depende de você executar SQL.
- **Não existe nenhuma tela que crie ou edite a linha de `lojas`.** O frontend inteiro nunca faz `from('lojas')` — só a RPC de numeração toca essa tabela. Consequência prática: `lojas.nome` é definido por você no INSERT e fica congelado para sempre, enquanto o cliente edita um nome diferente em Configurações. Hoje as 4 lojas em produção têm nome em dois lugares que ninguém reconcilia.
- **O reset de senha não fecha o ciclo.** `LoginPage` chama `resetPasswordForEmail(email)` sem `redirectTo`, e **não existe nenhuma tela no app para definir a nova senha** — nenhuma ocorrência de `updateUser`, `PASSWORD_RECOVERY` ou equivalente em todo o `src/`. O cliente clica no link do email, cai na aplicação já logado pela sessão de recuperação, e não tem onde digitar a senha nova. Na prática: o primeiro esquecimento de senha vira um chamado para você.
- **A conta existe antes do vínculo.** Se você criar o usuário no Auth e esquecer o INSERT em `usuarios`, o cliente loga e vê `ContaNaoVinculada` ("Peça para o administrador finalizar seu cadastro"). O tratamento é elegante, mas o estado só existe por causa do processo manual.
- **`plano` é decorativo.** As 4 lojas em produção estão com `plano = 'free'`. Não há cobrança, trial, limite ou qualquer leitura desse campo no código.

### Passos que hoje só funcionam porque você mexeu no Supabase

1. Criação do usuário no Supabase Auth (painel).
2. `INSERT INTO lojas` com `id`, `nome`, `plano`, `proximoNumero`.
3. `INSERT INTO usuarios` com `authUserId` copiado do Auth + `lojaId`.
4. Aplicação manual de cada migration de schema no SQL Editor.
5. Aplicação manual das policies de RLS — processo **separado** do de migrations, e que já dessincronizou uma vez (as 6 tabelas da migration 007 chegaram em produção com RLS ligado e zero policies).
6. Backfills de dados via `UPDATE` direto (migrations 014 e 016).
7. Correção de UUID com quebra de linha colada do Table Editor (documentado no CLAUDE.md porque aconteceu).

---

## 3. Gaps que bloqueiam a venda

### Bloqueador crítico — impede uso ou expõe risco

- **Tabelas `_backup_*` sem RLS, legíveis com a chave anon.** Oito tabelas em `public` (`_backup_20260724b_clientes`, `_backup_20260724b_lancamentos_financeiro`, `_backup_20260724b_ordens_servico`, `_backup_20260724_lojas`, e mais quatro) estão com RLS **desabilitado**, com `SELECT` concedido a `anon` e expostas via PostgREST. Contêm 11 clientes, 21 OS, 22 lançamentos e a lista das 3 lojas. Hoje o conteúdo é da loja de teste (dado fictício), então **não há vazamento real de cliente pagante ainda** — mas a chave anon está publicada no bundle do frontend, e o padrão "duplicar tabela antes de migration" é o que você vai repetir na próxima migração, aí já com dados reais.
- **Reset de senha sem tela de conclusão.** Recuperação de acesso depende de você.
- **Onboarding 100% manual.** Aceitável para o cliente nº 1, inviável a partir do nº 5.
- **Uma loja = um usuário, na prática.** As 4 lojas em produção têm exatamente 1 usuário cada, todos `OWNER`. O enum `Role` (`OWNER`/`MANAGER`/`OPERATOR`) existe no schema, é gravado no banco, e **é lido por zero linhas de código** — `usuario.role` nunca é consultado em lugar nenhum. Não há convite de funcionário, nem restrição de tela. Se a loja tem 3 instaladores, ou todos compartilham a senha do dono (com acesso irrestrito ao Financeiro e ao botão que apaga tudo), ou só o dono usa o sistema.
- **Estoque sem histórico de movimentação.** Para esse nicho específico, é a promessa central do produto.
- **Serviços sem preço.** Atrito diário desde a primeira OS.

### Incômodo — usa, mas reclama

- Impressão de OS sem folha de estilo (sai a tela inteira).
- Nenhuma exportação de dados (CSV/Excel) para contador ou análise.
- Pagamento binário, sem sinal, parcela ou vencimento.
- Nenhum lembrete de agendamento para o cliente final.
- Três toggles de notificação e um de 2FA que não fazem nada — corrói confiança quando o cliente percebe.
- "Exportar backup" que não exporta dado de negócio.
- Botão de reset destrutivo acessível a qualquer um, sem backup real para desfazer.
- PWA instalável mas sem dado offline: sem rede, o app abre vazio. Relevante se o pátio tem wifi ruim.
- Sem validação de CPF e sem dedupe de cliente/placa.

### Nice-to-have — não decide a compra

- Notificações push, assinatura digital do cliente na entrega, integração WhatsApp, um usuário atendendo várias lojas, dashboard de comissão por instalador, controle de retalho/sobra (`isRetalho` já está no schema), tipo `volume` no estoque.

---

## 4. Riscos técnicos para multi-tenant real

### O que está genuinamente validado (verificado no banco de produção, não suposto)

- **Isolamento por RLS está correto e completo.** As 13 tabelas de negócio têm RLS ligado com exatamente 1 policy cada, `FOR ALL`, com `with_check` nulo — o que significa que o predicado `USING` também governa INSERT e UPDATE. As duas exceções estruturais (`lojas` comparando `id`, `usuarios` comparando `authUserId` direto para evitar a recursão `42P17`) estão como documentado.
- **As 5 RPCs são `SECURITY INVOKER`.** Isso é importante e é um acerto: elas recebem `p_loja_id` como parâmetro vindo do cliente, mas rodam com as permissões de quem chamou, então a RLS se aplica dentro delas. Um tenant que passasse o `lojaId` de outro afetaria zero linhas em vez de vazar dados. Se alguma delas virasse `SECURITY DEFINER` numa refatoração futura, isso viraria um bypass completo de isolamento — é a linha mais perigosa de mudar no projeto inteiro.
- **PK composta `(lojaId, id)`** nas 11 entidades, com as 3 FKs compostas esperadas. Quatro lojas coexistem no mesmo banco sem colisão.

### O que ainda é hipótese

- **Não existe nenhum tenant "Soulwraps" no banco de produção.** As 4 lojas são: `Loja Teste E2E`, `GSB Wrapping` (sua), `Loja Teste - Germany` e `Loja Teste - Gabi`. Busca por "soulwrap" no repositório e em todo o histórico do git não retorna nada. O segundo tenant de fato mais exercitado é **Loja Teste - Germany**: 15 clientes, 10 OS todas concluídas, 10 produtos, 6 agendamentos, última OS em 2026-09-09. É uso real o bastante para ter validado o isolamento básico — mas convém corrigir a premissa antes de tratar "já testamos com um segundo tenant real" como verdade estabelecida.
- **Nenhuma loja jamais teve mais de um usuário.** Todo o caminho multi-usuário — dois logins simultâneos na mesma loja, edição concorrente da mesma OS, lost update em `totalGasto` — é inteiramente não validado. E como a suíte e2e roda com `workers: 1` justamente por causa disso, nem os testes exercitam concorrência.
- **Volume é irrelevante.** A maior loja tem 23 OS. Nenhuma consulta foi exercitada contra milhares de linhas, e o app carrega **todas** as entidades da loja em memória no `AppContext` sem paginação. Uma loja com 2 anos de histórico é território desconhecido.
- **Nenhum teste automatizado de isolamento cross-tenant.** Os 7 specs rodam sempre com o mesmo usuário. Não existe um teste que logue como loja A e tente ler dado da loja B.

### Fragilidades que um tenant pagante expõe e um de teste não

1. **Migrations com `UPDATE` sem filtro de `lojaId`.** As migrations 014 e 016 rodam `UPDATE "produtos" SET "tipoControle"='bobina', "quantidadeOriginal"="quantidade" WHERE "categoria" IN ('PPF','Envelopamento')` — **em todas as lojas de uma vez**. Hoje isso é inofensivo porque os dados são seus. Com um cliente pagante, uma migration desse feitio reescreve silenciosamente o inventário dele. Regra que falta: todo backfill declara explicitamente o escopo de lojas.
2. **A suíte e2e faz `DELETE` em 11 tabelas do banco de produção.** O `lojaId` alvo vem da linha do próprio usuário de teste, e a RLS impede que atinja outra loja — **a RLS é a única rede de proteção**. Se algum dia o seed passar a usar a service-role key (que ignora RLS), um `npx playwright test` apaga a loja do cliente. Além disso, rodar a suíte já reverteu um backfill de produção uma vez: é exatamente a razão de existir a migration 016.
3. **Schema e RLS são dois processos manuais separados.** Já dessincronizaram uma vez (migration 007). Com cliente pagante, a janela entre "código deployado" e "policy aplicada" é downtime, não inconveniente. O Vercel faz auto-deploy em todo push para `main`, sem gate.
4. **Zero auditoria.** Nenhuma entidade de negócio tem `createdAt`, `updatedAt` ou autoria — só `lojas` e `usuarios` têm `createdAt`. Quando o cliente perguntar "quem cancelou essa OS?", não há resposta possível. Com um usuário só isso não incomoda; com três, é a primeira pergunta que aparece.
5. **`search_path` mutável nas 5 funções** (advisor do Supabase). Risco baixo enquanto são `SECURITY INVOKER`, mas é correção de uma linha por função.
6. **Proteção contra senha vazada desligada** no Supabase Auth. Um clique no painel.
7. **`proximoNumero` diverge da contagem real.** A Loja Teste - Germany está em 27 com 10 OS; a Loja Teste E2E em 24 com 23. Não é bug (OS apagadas consomem número), mas se o cliente esperar numeração sem buracos na nota, vai reclamar.

---

## 5. Priorização

### Esforço × impacto

| Item | Esforço | Impacto na venda/retenção | Faixa |
|---|---|---|---|
| Dropar ou ligar RLS nas 8 tabelas `_backup_*` | 30 min | Elimina exposição e risco legal | **Fazer agora** |
| Ligar proteção de senha vazada + `search_path` nas RPCs | 30 min | Higiene de segurança | **Fazer agora** |
| Tela de definir nova senha (`updateUser`) | 0,5 dia | Remove você do suporte de acesso | **Fazer agora** |
| Remover/desativar 2FA falso, toggles inertes e "exportar backup" | 0,5 dia | Protege a confiança na primeira semana | **Fazer agora** |
| Campo de preço no cadastro de serviços | 0,5 dia | Remove atrito de toda OS | **Fazer agora** |
| Proteger a "Zona de Perigo" (confirmação + restrição) | 0,5 dia | Evita perda irreversível de dados | **Fazer agora** |
| Histórico de movimentação de estoque | 2–3 dias | É a promessa central para o nicho | Antes do 2º cliente |
| Folha de estilo de impressão da OS | 1 dia | Documento entregável ao cliente final | Antes do 2º cliente |
| Exportação CSV do Financeiro e de Clientes | 1 dia | Desbloqueia o contador; reduz medo de lock-in | Antes do 2º cliente |
| Convite de usuário + papéis (`role` já existe) | 3–5 dias | Desbloqueia loja com equipe | Antes do 5º cliente |
| Provisionamento de loja self-serve | 3–5 dias | Remove você do funil de vendas | Antes do 5º cliente |
| Sinal/parcelas/vencimento na OS | 3–5 dias | Fecha o buraco do fluxo de caixa real | Antes do 5º cliente |
| Lembrete de agendamento ao cliente final | 5+ dias | Diferencial de venda, não requisito | Depois |
| Tipo `volume` e retalho no estoque | 5+ dias | Completa a refatoração já iniciada | Depois |
| Auditoria (`createdAt`/`updatedAt`/autoria) | 2–3 dias | Só importa com equipe usando | Depois |

### Os 5 itens para resolver antes de abordar a primeira loja

1. **Apagar as 8 tabelas `_backup_*` ou ligar RLS nelas.** Meia hora. É a única coisa na lista que é risco, não gap — e o padrão que as criou vai se repetir na próxima migração, aí com dado de cliente real. Junto disso, adotar a regra de que todo backfill de migration filtra por `lojaId` explicitamente.

2. **Fechar o ciclo de reset de senha.** Uma tela que trate o evento `PASSWORD_RECOVERY` e chame `supabase.auth.updateUser({ password })`. Sem isso, o primeiro esquecimento de senha da loja é um telefonema para você — que é exatamente o cenário que a pergunta "usar sem mim do lado" quer evitar.

3. **Limpar as promessas falsas de Configurações.** Remover o toggle de 2FA, remover ou implementar os três toggles de notificação, e remover ou renomear "Exportar backup". Um cliente que descobre que o 2FA que ele ativou nunca existiu não reclama do 2FA — ele passa a duvidar de tudo que o sistema diz. Na mesma passada, proteger a "Zona de Perigo", que hoje apaga a loja inteira sem rede de segurança.

4. **Preço no cadastro de serviços.** O campo já existe no tipo e no banco; falta o input no formulário e o preenchimento automático na OS. É a diferença entre uma tabela de preços e uma lista de nomes, e o atrito aparece em cada OS aberta.

5. **Histórico de movimentação de estoque.** Uma tabela `movimentacoes_estoque` (produto, delta, motivo, origem, data) e a gravação nos pontos que já calculam o delta. É o item de maior esforço dos cinco, e o único que eu colocaria aqui por razão de *produto* e não de higiene: você está vendendo para lojas cujo principal custo variável é bobina de filme. "Onde foi parar meu PPF" é a pergunta que justifica o preço da assinatura, e hoje o sistema coleta o motivo da baixa e joga fora.

### Uma observação sobre ordem

O onboarding manual **não** está nessa lista, de propósito. Para o cliente nº 1, criar a loja à mão é aceitável — é meia hora do seu tempo e você vai querer acompanhar de perto essa implantação de qualquer jeito. O que não é aceitável no cliente nº 1 é ele **não conseguir voltar a entrar na conta**, ou descobrir que uma proteção de segurança que ele ligou não existe. Automatize o provisionamento quando estiver vendendo para o quinto, não para o primeiro.
