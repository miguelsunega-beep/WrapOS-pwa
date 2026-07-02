import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // Serial, não paralelo — não é regressão, é intencional desde que `clientes`
  // passou a viver no Supabase (ver CLAUDE.md, "Migração de entidades pro
  // Supabase"). Antes, cada teste tinha localStorage isolado por
  // BrowserContext e paralelismo era seguro. Agora vários specs leem/escrevem
  // a mesma tabela `clientes`, na mesma loja de teste — sem serialização,
  // dois specs concorrentes editando o mesmo cliente (ou, à medida que mais
  // entidades migrarem, um contador sequencial como `ordens.numero`) podem
  // ter condição de corrida (lost update). Reavaliar se/quando os specs
  // passarem a usar dados por-teste isolados na nuvem (schema/loja dedicada
  // por worker) em vez de uma loja de teste compartilhada.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html', { open: 'never' }]] : 'html',
  timeout: 45_000,

  use: {
    baseURL: 'http://localhost:5173',
    storageState: './e2e/.auth/user.json',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 800 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
