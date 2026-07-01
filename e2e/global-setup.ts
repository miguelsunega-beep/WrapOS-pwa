import fs from 'node:fs'
import path from 'node:path'
import { chromium, type FullConfig } from '@playwright/test'

/**
 * Carrega .env.e2e.local manualmente: o global-setup roda em Node puro,
 * fora do pipeline do Vite, então import.meta.env não está disponível aqui.
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
 * Faz login uma vez com um usuário confirmado do Supabase Auth e salva a
 * sessão em e2e/.auth/user.json, reaproveitada por todos os specs (ver
 * `storageState` em playwright.config.ts). Evita logar em cada teste e
 * mantém os specs focados no fluxo de negócio, não em autenticação.
 */
export default async function globalSetup(config: FullConfig) {
  loadEnvFile('.env.e2e.local')

  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E_TEST_EMAIL e E2E_TEST_PASSWORD precisam estar definidos em .env.e2e.local ' +
      '(usuário já confirmado no Supabase Auth) para rodar a suíte e2e.'
    )
  }

  const baseURL = config.projects[0]?.use?.baseURL as string ?? 'http://localhost:5173'

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto(baseURL)
  await page.getByPlaceholder('voce@exemplo.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  await page.getByRole('button', { name: 'Novo Perfil' }).waitFor({ timeout: 20_000 })

  const authDir = path.resolve(process.cwd(), 'e2e/.auth')
  fs.mkdirSync(authDir, { recursive: true })
  await page.context().storageState({ path: path.join(authDir, 'user.json') })

  await browser.close()
}
