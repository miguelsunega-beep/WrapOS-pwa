import fs from 'node:fs'
import path from 'node:path'
import { chromium, type FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * Carrega .env.e2e.local (e .env) manualmente: o global-setup roda em Node
 * puro, fora do pipeline do Vite, então import.meta.env não está disponível
 * aqui.
 */
function loadEnvFile(filename: string) {
  const envPath = path.resolve(process.cwd(), filename)
  if (!fs.existsSync(envPath)) return

  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const idx = trimmed.indexOf('=')
    if (idx === -1) continue

    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) process.env[key] = value
  }
}

/**
 * Mesmos 10 clientes de initialClientes (src/context/AppContext.tsx) — não
 * importamos o módulo diretamente aqui pra não puxar a árvore de imports do
 * app (React, sonner, o client do Supabase do próprio app etc.) pra dentro
 * de um script Node puro sem DOM. Se initialClientes mudar, atualize aqui
 * também.
 */
const DEMO_CLIENTES = [
  { id: 'c1',  nome: 'Carlos Oliveira',  telefone: '(11) 98432-7651', email: 'carlos.oliveira@email.com',  cpf: '329.451.870-12', comoConheceu: 'Instagram', dataCadastro: '2024-02-10', totalGasto: 19600 },
  { id: 'c2',  nome: 'Rodrigo Mendes',   telefone: '(11) 97654-3210', email: 'rodrigo.mendes@email.com',   cpf: '581.234.920-88', comoConheceu: 'Indicação', dataCadastro: '2024-03-15', totalGasto: 12400 },
  { id: 'c3',  nome: 'Amanda Costa',     telefone: '(11) 96543-8821', email: 'amanda.costa@email.com',     cpf: '102.873.456-55', comoConheceu: 'Google',    dataCadastro: '2024-05-20', totalGasto:  3200 },
  { id: 'c4',  nome: 'Felipe Santos',    telefone: '(11) 99871-4432', email: 'felipe.santos@email.com',    cpf: '745.632.180-21', comoConheceu: 'Indicação', dataCadastro: '2023-11-08', totalGasto: 28700 },
  { id: 'c5',  nome: 'Thiago Lima',      telefone: '(11) 98123-5567', email: 'thiago.lima@email.com',      cpf: '398.211.674-09', comoConheceu: 'Instagram', dataCadastro: '2024-04-03', totalGasto:  5600 },
  { id: 'c6',  nome: 'Isabela Martins',  telefone: '(11) 97890-1123', email: 'isabela.martins@email.com',  cpf: '512.904.731-44', comoConheceu: 'Google',    dataCadastro: '2024-06-12', totalGasto:  8900 },
  { id: 'c7',  nome: 'Ricardo Fonseca',  telefone: '(11) 96321-9876', email: 'ricardo.fonseca@email.com',  cpf: '234.567.890-34', comoConheceu: 'Facebook',  dataCadastro: '2024-01-20', totalGasto: 16200 },
  { id: 'c8',  nome: 'Mariana Souza',    telefone: '(11) 99234-5678', email: 'mariana.souza@email.com',    cpf: '876.543.210-98', comoConheceu: 'Indicação', dataCadastro: '2024-07-05', totalGasto:  4500 },
  { id: 'c9',  nome: 'Bruno Ferreira',   telefone: '(11) 98765-4321', email: 'bruno.ferreira@email.com',   cpf: '456.789.012-56', comoConheceu: 'TikTok',    dataCadastro: '2024-08-15', totalGasto:  1800 },
  { id: 'c10', nome: 'Gabriela Alves',   telefone: '(11) 97456-7890', email: 'gabriela.alves@email.com',   cpf: '678.901.234-78', comoConheceu: 'Instagram', dataCadastro: '2024-09-22', totalGasto:  3200 },
]

/**
 * Mesmos 10 veículos de initialVeiculos (src/context/AppContext.tsx) — mesma
 * ressalva de DEMO_CLIENTES acima (cópia local, não importa o app). Cada
 * clienteId aqui precisa já existir em DEMO_CLIENTES (mesma loja) por causa
 * da FK composta (lojaId, clienteId) → clientes(lojaId, id).
 */
const DEMO_VEICULOS = [
  { id: 'v1',  clienteId: 'c1',  marca: 'Audi',          modelo: 'Q5',                  ano: 2023, cor: 'Branco',    placa: 'GHT-3A21' },
  { id: 'v2',  clienteId: 'c2',  marca: 'BMW',           modelo: 'M3',                  ano: 2022, cor: 'Azul',      placa: 'PKZ-9D43' },
  { id: 'v3',  clienteId: 'c3',  marca: 'Land Rover',    modelo: 'Range Rover Evoque',  ano: 2024, cor: 'Cinza',     placa: 'MVB-2F67' },
  { id: 'v4',  clienteId: 'c4',  marca: 'Porsche',       modelo: '911 Carrera',         ano: 2023, cor: 'Amarelo',   placa: 'RLN-7E52' },
  { id: 'v5',  clienteId: 'c5',  marca: 'Mercedes-Benz', modelo: 'GLE 400d',            ano: 2024, cor: 'Preto',     placa: 'CBK-1H89' },
  { id: 'v6',  clienteId: 'c6',  marca: 'Jeep',          modelo: 'Wrangler Rubicon',    ano: 2023, cor: 'Verde',     placa: 'SDF-4J01' },
  { id: 'v7',  clienteId: 'c7',  marca: 'Tesla',         modelo: 'Model 3 Performance', ano: 2023, cor: 'Vermelho',  placa: 'WQP-6K33' },
  { id: 'v8',  clienteId: 'c8',  marca: 'Toyota',        modelo: 'Corolla Cross',       ano: 2022, cor: 'Branco',    placa: 'MTP-5L77' },
  { id: 'v9',  clienteId: 'c9',  marca: 'Honda',         modelo: 'Civic',               ano: 2023, cor: 'Preto',     placa: 'FKR-2M44' },
  { id: 'v10', clienteId: 'c10', marca: 'Volkswagen',    modelo: 'Golf GTI',            ano: 2022, cor: 'Cinza',     placa: 'NJX-8P92' },
]

/**
 * Mesmas 15 ordens de serviço de initialOrdens (src/context/AppContext.tsx) —
 * mesma ressalva de DEMO_CLIENTES/DEMO_VEICULOS acima (cópia local). Sem
 * `numero`: é autoincrement no Postgres desde a migration 005 (ver
 * useOrdensServicoSupabase.ts) — nunca setado explicitamente aqui, o banco
 * gera. Array mantido na mesma ordem (mais recente → mais antiga) de
 * initialOrdens só por legibilidade/paridade com a fonte; a inserção em
 * semearDados percorre em ordem REVERSA (mais antiga primeiro) pra que o
 * autoincrement ascendente preserve a mesma relação de recência que o
 * `numero` fixo original tinha (maior número = OS mais nova), já que telas
 * como OrdemServico/Clientes ordenam por `numero` desc.
 */
const DEMO_ORDENS = [
  // em_andamento
  { id: 'os1', clienteId: 'c1', veiculoId: 'v1',
    servicos: [{ servicoId: 's2', nome: 'PPF Full', preco: 4500 }],
    valorTotal: 4500, formaPagamento: 'Cartão de Crédito', instaladorId: 'i1',
    box: 1, comissao: 675, observacoes: 'Cliente VIP - Prioridade',
    status: 'em_andamento', dataCriacao: '2025-05-09' },
  { id: 'os2', clienteId: 'c2', veiculoId: 'v2',
    servicos: [{ servicoId: 's4', nome: 'Envelopamento Full', preco: 3200 }],
    valorTotal: 3200, formaPagamento: 'PIX', instaladorId: 'i2',
    box: 2, comissao: 384, observacoes: '',
    status: 'em_andamento', dataCriacao: '2025-05-08' },
  { id: 'os3', clienteId: 'c4', veiculoId: 'v4',
    servicos: [{ servicoId: 's2', nome: 'PPF Full', preco: 4500 }, { servicoId: 's5', nome: 'Chrome Delete', preco: 890 }],
    valorTotal: 5390, formaPagamento: 'Transferência', instaladorId: 'i3',
    box: 3, comissao: 700.7, observacoes: 'Porsche - cuidado redobrado',
    status: 'em_andamento', dataCriacao: '2025-05-05' },
  { id: 'os4', clienteId: 'c5', veiculoId: 'v5',
    servicos: [{ servicoId: 's4', nome: 'Envelopamento Full', preco: 3200 }, { servicoId: 's6', nome: 'Teto Preto', preco: 320 }],
    valorTotal: 3520, formaPagamento: 'Cartão de Crédito', instaladorId: 'i2',
    box: 2, comissao: 422.4, observacoes: '',
    status: 'em_andamento', dataCriacao: '2025-05-04' },
  // aguardando_material
  { id: 'os5', clienteId: 'c7', veiculoId: 'v7',
    servicos: [{ servicoId: 's2', nome: 'PPF Full', preco: 4500 }],
    valorTotal: 4500, formaPagamento: 'PIX', instaladorId: 'i1',
    box: 1, comissao: 675, observacoes: 'Aguardando rolo PPF Xpel',
    status: 'aguardando_material', dataCriacao: '2025-04-30' },
  { id: 'os6', clienteId: 'c8', veiculoId: 'v8',
    servicos: [{ servicoId: 's1', nome: 'PPF Parcial', preco: 1800 }],
    valorTotal: 1800, formaPagamento: 'PIX', instaladorId: 'i3',
    box: 4, comissao: 234, observacoes: '',
    status: 'aguardando_material', dataCriacao: '2025-05-02' },
  // aguardando_aprovacao
  { id: 'os7', clienteId: 'c3', veiculoId: 'v3',
    servicos: [{ servicoId: 's4', nome: 'Envelopamento Full', preco: 3200 }],
    valorTotal: 3200, formaPagamento: 'A definir', instaladorId: 'i2',
    box: 5, comissao: 384, observacoes: 'Cliente avaliando orçamento',
    status: 'aguardando_aprovacao', dataCriacao: '2025-05-07' },
  { id: 'os8', clienteId: 'c9', veiculoId: 'v9',
    servicos: [{ servicoId: 's7', nome: 'Insulfilm', preco: 450 }, { servicoId: 's5', nome: 'Chrome Delete', preco: 890 }],
    valorTotal: 1340, formaPagamento: 'A definir', instaladorId: 'i2',
    box: 6, comissao: 160.8, observacoes: '',
    status: 'aguardando_aprovacao', dataCriacao: '2025-05-06' },
  // concluido
  { id: 'os9', clienteId: 'c6', veiculoId: 'v6',
    servicos: [{ servicoId: 's4', nome: 'Envelopamento Full', preco: 3200 }],
    valorTotal: 3200, formaPagamento: 'Cartão de Débito', instaladorId: 'i3',
    box: 3, comissao: 416, observacoes: '',
    status: 'concluido', dataCriacao: '2025-05-02', dataFinalizacao: '2025-05-08', entregue: true },
  { id: 'os10', clienteId: 'c1', veiculoId: 'v1',
    servicos: [{ servicoId: 's5', nome: 'Chrome Delete', preco: 890 }],
    valorTotal: 890, formaPagamento: 'PIX', instaladorId: 'i1',
    box: 1, comissao: 133.5, observacoes: '',
    status: 'concluido', dataCriacao: '2025-04-25', dataFinalizacao: '2025-04-26', entregue: true },
  { id: 'os11', clienteId: 'c4', veiculoId: 'v4',
    servicos: [{ servicoId: 's1', nome: 'PPF Parcial', preco: 1800 }],
    valorTotal: 1800, formaPagamento: 'Cartão de Crédito', instaladorId: 'i3',
    box: 2, comissao: 234, observacoes: '',
    status: 'concluido', dataCriacao: '2025-04-20', dataFinalizacao: '2025-04-22', entregue: true },
  { id: 'os12', clienteId: 'c10', veiculoId: 'v10',
    servicos: [{ servicoId: 's3', nome: 'Envelopamento Capô', preco: 380 }, { servicoId: 's6', nome: 'Teto Preto', preco: 320 }],
    valorTotal: 700, formaPagamento: 'PIX', instaladorId: 'i2',
    box: 4, comissao: 84, observacoes: '',
    status: 'concluido', dataCriacao: '2025-04-28', dataFinalizacao: '2025-04-29', entregue: true },
  { id: 'os13', clienteId: 'c2', veiculoId: 'v2',
    servicos: [{ servicoId: 's8', nome: 'Higienização', preco: 180 }],
    valorTotal: 180, formaPagamento: 'PIX', instaladorId: 'i1',
    box: 5, comissao: 27, observacoes: '',
    status: 'concluido', dataCriacao: '2025-04-15', dataFinalizacao: '2025-04-15', entregue: true },
  // cancelado
  { id: 'os14', clienteId: 'c7', veiculoId: 'v7',
    servicos: [{ servicoId: 's2', nome: 'PPF Full', preco: 4500 }],
    valorTotal: 4500, formaPagamento: 'A definir', instaladorId: 'i1',
    box: 1, comissao: 0, observacoes: 'Cliente desistiu - mudou de cidade',
    status: 'cancelado', dataCriacao: '2025-04-10' },
  { id: 'os15', clienteId: 'c5', veiculoId: 'v5',
    servicos: [{ servicoId: 's7', nome: 'Insulfilm', preco: 450 }],
    valorTotal: 450, formaPagamento: 'A definir', instaladorId: 'i2',
    box: 3, comissao: 0, observacoes: 'Veículo vendido pelo cliente',
    status: 'cancelado', dataCriacao: '2025-04-08' },
]

/**
 * Mesmos 6 produtos de initialProdutos (src/context/AppContext.tsx) — mesma
 * ressalva de DEMO_CLIENTES acima (cópia local). Sem FK com nenhuma outra
 * tabela (só com lojas).
 */
const DEMO_PRODUTOS = [
  { id: 'p1', nome: 'Filme PPF Xpel Ultimate Plus',  sku: 'XPEL-ULT-60',    categoria: 'PPF',          fornecedor: 'Xpel Brasil',         quantidade:  2, minimo:  5, unidade: 'rolo',    valorUnitario: 1850 },
  { id: 'p2', nome: 'Filme PPF Llumar Platinum',     sku: 'LLUM-PLT-60',    categoria: 'PPF',          fornecedor: 'Llumar',              quantidade:  7, minimo:  4, unidade: 'rolo',    valorUnitario: 1420 },
  { id: 'p3', nome: 'Vinil Oracal 970 Preto Fosco',  sku: 'ORACAL-970-070', categoria: 'Envelopamento', fornecedor: 'Oracal Distribuidora', quantidade: 12, minimo:  3, unidade: 'rolo',    valorUnitario:  340 },
  { id: 'p4', nome: 'Primer de Adesão 3M 94',        sku: '3M-94-100ML',    categoria: 'Acessórios',   fornecedor: '3M Brasil',           quantidade:  1, minimo:  4, unidade: 'unidade', valorUnitario:   89 },
  { id: 'p5', nome: 'Ceramic Pro 9H (30ml)',          sku: 'CP-9H-30',       categoria: 'Cerâmica',     fornecedor: 'Ceramic Pro Brasil',  quantidade:  6, minimo:  3, unidade: 'frasco',  valorUnitario:  680 },
  { id: 'p6', nome: 'Espátula de Plástico 15cm',     sku: 'ESP-PLAS-15',    categoria: 'Ferramentas',  fornecedor: 'Tools Auto',          quantidade: 24, minimo: 10, unidade: 'unidade', valorUnitario:   12 },
]

/**
 * Mesmos 20 lançamentos de initialLancamentos (src/context/AppContext.tsx) —
 * mesma ressalva de DEMO_CLIENTES acima (cópia local). `osId` é uma
 * referência solta (sem FK) pro id de uma linha de DEMO_ORDENS — nada impede
 * inserir antes ou depois de ordens_servico.
 */
const DEMO_LANCAMENTOS = [
  { id: 'l1',  tipo: 'entrada', categoria: 'OS',           descricao: 'OS #1079 - Envelopamento Full - Isabela Martins',  valor: 3200, data: '2025-05-08', formaPagamento: 'Cartão de Débito', osId: 'os9'  },
  { id: 'l2',  tipo: 'entrada', categoria: 'OS',           descricao: 'OS #1078 - Chrome Delete - Carlos Oliveira',       valor:  890, data: '2025-04-26', formaPagamento: 'PIX',              osId: 'os10' },
  { id: 'l3',  tipo: 'entrada', categoria: 'OS',           descricao: 'OS #1077 - PPF Parcial - Felipe Santos',           valor: 1800, data: '2025-04-22', formaPagamento: 'Cartão de Crédito',osId: 'os11' },
  { id: 'l4',  tipo: 'entrada', categoria: 'OS',           descricao: 'OS #1076 - Capô + Teto Preto - Gabriela Alves',   valor:  700, data: '2025-04-29', formaPagamento: 'PIX',              osId: 'os12' },
  { id: 'l5',  tipo: 'entrada', categoria: 'OS',           descricao: 'OS #1075 - Higienização - Rodrigo Mendes',         valor:  180, data: '2025-04-15', formaPagamento: 'PIX',              osId: 'os13' },
  { id: 'l6',  tipo: 'entrada', categoria: 'Adiantamento', descricao: 'Adiantamento OS #1087 - Carlos Oliveira',          valor: 2000, data: '2025-05-09', formaPagamento: 'PIX'                          },
  { id: 'l7',  tipo: 'entrada', categoria: 'Adiantamento', descricao: 'Adiantamento OS #1083 - Ricardo Fonseca',          valor: 1500, data: '2025-04-30', formaPagamento: 'Cartão de Crédito'            },
  { id: 'l8',  tipo: 'entrada', categoria: 'Outros',       descricao: 'Venda de material sobressalente',                  valor:  340, data: '2025-05-03', formaPagamento: 'PIX'                          },
  { id: 'l9',  tipo: 'entrada', categoria: 'Adiantamento', descricao: 'Adiantamento OS #1085 - Felipe Santos',            valor: 2500, data: '2025-05-05', formaPagamento: 'Transferência'               },
  { id: 'l10', tipo: 'entrada', categoria: 'Adiantamento', descricao: 'Adiantamento OS #1086 - Rodrigo Mendes',           valor: 1600, data: '2025-05-08', formaPagamento: 'PIX'                          },
  { id: 'l11', tipo: 'saida',   categoria: 'Estoque',      descricao: 'Compra 3 rolos PPF Xpel Ultimate Plus',            valor: 5550, data: '2025-05-01', formaPagamento: 'Boleto'                       },
  { id: 'l12', tipo: 'saida',   categoria: 'Folha',        descricao: 'Comissão Lucas Mota — Abril/2025',                 valor: 2100, data: '2025-05-05', formaPagamento: 'Transferência'               },
  { id: 'l13', tipo: 'saida',   categoria: 'Folha',        descricao: 'Comissão Felipe Torres — Abril/2025',              valor: 1650, data: '2025-05-05', formaPagamento: 'Transferência'               },
  { id: 'l14', tipo: 'saida',   categoria: 'Folha',        descricao: 'Comissão Matheus Vieira — Abril/2025',             valor: 1430, data: '2025-05-05', formaPagamento: 'Transferência'               },
  { id: 'l15', tipo: 'saida',   categoria: 'Aluguel',      descricao: 'Aluguel oficina — Maio/2025',                      valor: 4500, data: '2025-05-01', formaPagamento: 'Boleto'                       },
  { id: 'l16', tipo: 'saida',   categoria: 'Estoque',      descricao: 'Compra vinil Oracal 970 — 5 rolos',                valor: 1700, data: '2025-05-03', formaPagamento: 'PIX'                          },
  { id: 'l17', tipo: 'saida',   categoria: 'Marketing',    descricao: 'Impulsionamento Instagram — Maio',                 valor:  800, data: '2025-05-02', formaPagamento: 'Cartão de Crédito'            },
  { id: 'l18', tipo: 'saida',   categoria: 'Utilities',    descricao: 'Conta de energia elétrica — Abril',                valor:  680, data: '2025-05-04', formaPagamento: 'Débito automático'            },
  { id: 'l19', tipo: 'saida',   categoria: 'Manutenção',   descricao: 'Reparo ar condicionado da oficina',                valor:  450, data: '2025-05-07', formaPagamento: 'PIX'                          },
  { id: 'l20', tipo: 'saida',   categoria: 'Estoque',      descricao: 'Compra Ceramic Pro 9H — 5 frascos',                valor: 3400, data: '2025-05-06', formaPagamento: 'Boleto'                       },
]

/**
 * `clientes`, `veiculos`, `ordens_servico`, `produtos` e `lancamentos_financeiro`
 * já vivem no Supabase (ver CLAUDE.md, "Migração de entidades pro Supabase")
 * — diferente do resto dos dados (ainda em localStorage, isolado por
 * BrowserContext), o Supabase é estado real e compartilhado entre execuções
 * da suíte. Sem esse passo, cada rodada herdaria o lixo (linhas
 * criadas/editadas) da rodada anterior — por exemplo, o "Produto Crítico E2E"
 * que 05-estoque-critico.spec.ts cria e nunca apaga — e specs que dependem
 * dos 10 clientes/veículos/15 OS/6 produtos de demonstração por nome/placa/
 * status (ex: "Gabriela Alves", "Volkswagen Golf GTI · NJX-8P92") falhariam
 * por não encontrá-los. Roda uma vez por execução da suíte, antes de
 * qualquer spec: apaga tudo em `ordens_servico`/`veiculos`/`clientes` da loja
 * de teste e reinsere os fixos de cada, e faz o mesmo (delete + insert, sem
 * ordem específica) pra `produtos`/`lancamentos_financeiro` — nenhuma FK
 * composta envolve essas duas, só `osId` solto em `lancamentos_financeiro`
 * (sem constraint) apontando pra ids de DEMO_ORDENS. Ordem de delete/insert
 * de clientes/veiculos/ordens_servico segue as FKs compostas: ordens_servico
 * referencia clientes E veiculos, então é apagada primeiro e inserida por
 * último; veiculos referencia clientes, então é apagada depois e inserida
 * antes de ordens_servico.
 */
async function semearDados(email: string, password: string) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidos em .env pra semear dados de teste.')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: signInData, error: erroLogin } = await supabase.auth.signInWithPassword({ email, password })
  if (erroLogin || !signInData.user) {
    throw new Error(`semearDados: falha ao logar com a conta de teste — ${erroLogin?.message ?? 'sem usuário retornado'}`)
  }

  const { data: usuario, error: erroUsuario } = await supabase
    .from('usuarios')
    .select('lojaId')
    .eq('authUserId', signInData.user.id)
    .maybeSingle()

  if (erroUsuario || !usuario) {
    throw new Error(
      `semearDados: não encontrei a linha de "usuarios" da conta de teste (authUserId=${signInData.user.id}) — ` +
      `${erroUsuario?.message ?? 'sem linha vinculada'}. Confira se a conta e2e está vinculada a uma loja neste projeto Supabase.`
    )
  }

  const lojaId = usuario.lojaId as string

  const { error: erroDeleteLancamentos } = await supabase.from('lancamentos_financeiro').delete().eq('lojaId', lojaId)
  if (erroDeleteLancamentos) {
    throw new Error(`semearDados: falha ao limpar lançamentos financeiros antigos da loja de teste — ${erroDeleteLancamentos.message}`)
  }

  const { error: erroDeleteProdutos } = await supabase.from('produtos').delete().eq('lojaId', lojaId)
  if (erroDeleteProdutos) {
    throw new Error(`semearDados: falha ao limpar produtos antigos da loja de teste — ${erroDeleteProdutos.message}`)
  }

  const { error: erroDeleteOrdens } = await supabase.from('ordens_servico').delete().eq('lojaId', lojaId)
  if (erroDeleteOrdens) {
    throw new Error(`semearDados: falha ao limpar ordens de serviço antigas da loja de teste — ${erroDeleteOrdens.message}`)
  }

  const { error: erroDeleteVeiculos } = await supabase.from('veiculos').delete().eq('lojaId', lojaId)
  if (erroDeleteVeiculos) {
    throw new Error(`semearDados: falha ao limpar veículos antigos da loja de teste — ${erroDeleteVeiculos.message}`)
  }

  const { error: erroDelete } = await supabase.from('clientes').delete().eq('lojaId', lojaId)
  if (erroDelete) {
    throw new Error(`semearDados: falha ao limpar clientes antigos da loja de teste — ${erroDelete.message}`)
  }

  const { error: erroInsert } = await supabase
    .from('clientes')
    .insert(DEMO_CLIENTES.map(c => ({ ...c, lojaId })))

  if (erroInsert) {
    throw new Error(`semearDados: falha ao inserir os clientes de demonstração — ${erroInsert.message}`)
  }

  const { error: erroInsertVeiculos } = await supabase
    .from('veiculos')
    .insert(DEMO_VEICULOS.map(v => ({ ...v, lojaId })))

  if (erroInsertVeiculos) {
    throw new Error(`semearDados: falha ao inserir os veículos de demonstração — ${erroInsertVeiculos.message}`)
  }

  // Reversa: numero é autoincrement (migration 005) — inserindo da OS mais
  // antiga (os15) pra mais nova (os1), o autoincrement ascendente preserva a
  // mesma relação de recência que o `numero` fixo original tinha.
  const { error: erroInsertOrdens } = await supabase
    .from('ordens_servico')
    .insert([...DEMO_ORDENS].reverse().map(o => ({ ...o, lojaId })))

  if (erroInsertOrdens) {
    throw new Error(`semearDados: falha ao inserir as ordens de serviço de demonstração — ${erroInsertOrdens.message}`)
  }

  const { error: erroInsertProdutos } = await supabase
    .from('produtos')
    .insert(DEMO_PRODUTOS.map(p => ({ ...p, lojaId })))

  if (erroInsertProdutos) {
    throw new Error(`semearDados: falha ao inserir os produtos de demonstração — ${erroInsertProdutos.message}`)
  }

  const { error: erroInsertLancamentos } = await supabase
    .from('lancamentos_financeiro')
    .insert(DEMO_LANCAMENTOS.map(l => ({ ...l, lojaId })))

  if (erroInsertLancamentos) {
    throw new Error(`semearDados: falha ao inserir os lançamentos financeiros de demonstração — ${erroInsertLancamentos.message}`)
  }

  await supabase.auth.signOut()
}

/**
 * Faz login uma vez com um usuário confirmado do Supabase Auth e salva a
 * sessão em e2e/.auth/user.json, reaproveitada por todos os specs (ver
 * `storageState` em playwright.config.ts). Evita logar em cada teste e
 * mantém os specs focados no fluxo de negócio, não em autenticação.
 */
export default async function globalSetup(config: FullConfig) {
  loadEnvFile('.env.e2e.local')
  loadEnvFile('.env')

  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E_TEST_EMAIL e E2E_TEST_PASSWORD precisam estar definidos em .env.e2e.local ' +
      '(usuário já confirmado no Supabase Auth) para rodar a suíte e2e.'
    )
  }

  await semearDados(email, password)

  const baseURL = config.projects[0]?.use?.baseURL as string ?? 'http://localhost:5173'

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto(baseURL)
  await page.getByPlaceholder('voce@exemplo.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  await page.getByRole('heading', { name: 'Início' }).waitFor({ timeout: 20_000 })

  const authDir = path.resolve(process.cwd(), 'e2e/.auth')
  fs.mkdirSync(authDir, { recursive: true })
  await page.context().storageState({ path: path.join(authDir, 'user.json') })

  await browser.close()
}
