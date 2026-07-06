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
 * `clientes` e `veiculos` já vivem no Supabase (ver CLAUDE.md, "Migração de
 * entidades pro Supabase") — diferente do resto dos dados (ainda em
 * localStorage, isolado por BrowserContext), o Supabase é estado real e
 * compartilhado entre execuções da suíte. Sem esse passo, cada rodada
 * herdaria o lixo (linhas criadas/editadas) da rodada anterior, e specs que
 * dependem dos 10 clientes/veículos de demonstração por nome/placa (ex:
 * "Gabriela Alves", "Volkswagen Golf GTI · NJX-8P92") falhariam por não
 * encontrá-los. Roda uma vez por execução da suíte, antes de qualquer spec:
 * apaga tudo em `veiculos`/`clientes` da loja de teste e reinsere os 10 fixos
 * de cada. Veículos são apagados antes e reinseridos depois de clientes por
 * causa da FK composta (lojaId, clienteId) → clientes(lojaId, id).
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
