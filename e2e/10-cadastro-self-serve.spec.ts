import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * Roda sem a sessão logada do storageState global (helpers.abrirApp assume
 * login prévio) — este spec testa exatamente o caminho de quem AINDA não
 * tem conta.
 */
test.use({ storageState: { cookies: [], origins: [] } })

/**
 * Cenário 10 — Cadastro self-serve (migration 023_cadastro_self_serve.sql).
 *
 * Gate desta feature: precisamos confirmar direto no banco que `lojas` e
 * `usuarios` foram provisionados corretamente (role OWNER, vinculados ao
 * `authUserId` novo) pela trigger `handle_novo_usuario()`. Isso exige um
 * client com a service role key (bypassa RLS) tanto pra ler `usuarios`/
 * `lojas` de um usuário que não é o logado no browser quanto pra limpar
 * (deletar) a conta/loja de teste depois — sem a key, não tem como limpar
 * com segurança, então o teste inteiro pula ANTES de submeter o formulário
 * (mesmo espírito de "não criar o que não consegue limpar" do 2º teste de
 * 06-numeracao-os-por-loja.spec.ts, só que aplicado ao teste inteiro, não só
 * à parte de verificação — aqui o "criar" já é o próprio cadastro real).
 *
 * SUPABASE_SERVICE_ROLE_KEY não está em .env.e2e.local nesta configuração
 * (ver CLAUDE.md) — enquanto isso, este spec fica skipped. A verificação
 * funcional do trigger nesta sessão foi feita manualmente via MCP (signUp
 * real com a mesma anon key do app + SELECT/DELETE direto no Postgres) —
 * ver relatório da tarefa.
 */
test.describe('Cenário 10 — Cadastro self-serve provisiona loja+usuario automaticamente', () => {
  test('preencher /cadastro cria uma loja nova e vincula o usuário como OWNER', async ({ page }) => {
    const url = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    test.skip(
      !url || !serviceRoleKey,
      'SUPABASE_SERVICE_ROLE_KEY não configurado em .env.e2e.local — pulando antes de criar a conta real ' +
      '(sem a key não dá pra verificar nem limpar a linha depois com segurança). Ver .env.e2e.local / CLAUDE.md.',
    )

    const admin = createClient(url as string, serviceRoleKey as string)

    const timestamp = Date.now()
    const email = `cadastro.e2e.${timestamp}@wrapos.local`
    const senha = 'senha-teste-cadastro-e2e'
    const nomeLoja = `Loja Cadastro E2E ${timestamp}`
    const nomeUsuario = 'Fulano de Tal E2E'

    let authUserId: string | null = null
    let lojaId: string | null = null

    try {
      await page.goto('/cadastro')

      await page.getByPlaceholder('Ex: Wrap Premium Envelopamentos').fill(nomeLoja)
      await page.getByPlaceholder('Seu nome completo').fill(nomeUsuario)
      await page.getByPlaceholder('voce@exemplo.com').fill(email)
      await page.getByPlaceholder('Mínimo 6 caracteres').fill(senha)
      await page.getByPlaceholder('Repita a senha').fill(senha)
      await page.getByRole('button', { name: 'Criar conta' }).click()

      // Aceita as duas configurações possíveis de "Confirm email" do projeto
      // (não dá pra inspecionar isso via SQL — não é uma tabela Postgres,
      // é config do serviço GoTrue). Cadastro.tsx já trata os dois casos via
      // presença de `session` no retorno do signUp().
      await expect(
        page.getByText('Confira seu email').or(page.getByText('Conta criada!')),
      ).toBeVisible({ timeout: 10_000 })

      // Verificação direto no banco (bypassa RLS via service role) — confirma
      // que a trigger realmente rodou e provisionou as duas tabelas certas.
      const { data: usuario, error: erroUsuario } = await admin
        .from('usuarios')
        .select('id, authUserId, nome, email, role, lojaId')
        .eq('email', email)
        .maybeSingle()

      if (erroUsuario || !usuario) {
        throw new Error(`usuarios não foi provisionado pela trigger — ${erroUsuario?.message ?? 'nenhuma linha encontrada'}`)
      }

      authUserId = usuario.authUserId as string
      lojaId = usuario.lojaId as string

      expect(usuario.role, 'a trigger deve criar o primeiro usuário da loja como OWNER').toBe('OWNER')
      expect(usuario.nome, 'nome do usuário deve vir do metadata nome_usuario enviado pelo formulário').toBe(nomeUsuario)

      const { data: loja, error: erroLoja } = await admin
        .from('lojas')
        .select('id, nome, plano')
        .eq('id', lojaId)
        .maybeSingle()

      if (erroLoja || !loja) {
        throw new Error(`lojas não foi provisionada pela trigger — ${erroLoja?.message ?? 'nenhuma linha encontrada'}`)
      }

      expect(loja.nome, 'nome da loja deve vir do metadata nome_loja enviado pelo formulário').toBe(nomeLoja)
      expect(loja.plano, 'loja nova provisionada pelo cadastro self-serve deve usar o placeholder decorativo free (sem lógica de billing)').toBe('free')
    } finally {
      // Limpa a conta/loja de teste (nesta ordem por causa da FK de usuarios.lojaId → lojas.id).
      if (lojaId) {
        await admin.from('usuarios').delete().eq('lojaId', lojaId)
        await admin.from('lojas').delete().eq('id', lojaId)
      }
      if (authUserId) {
        await admin.auth.admin.deleteUser(authUserId)
      }
    }
  })
})
