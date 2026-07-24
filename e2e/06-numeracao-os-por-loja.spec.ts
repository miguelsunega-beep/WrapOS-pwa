import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { abrirApp, irPara, modalAberto } from './helpers'

// Cliente não usado por nenhum outro spec (evita acoplamento com 01/02/03/04/05).
const CLIENTE  = 'Ricardo Fonseca'
const VEICULO  = 'Tesla Model 3 Performance 2023 · WQP-6K33'
const SERVICO  = 'Higienização'
const VALOR_SERVICO = 180

/** Cria uma OS mínima (sem instalador/comissão) pro cliente/veículo acima e espera o modal fechar. */
async function criarOSSimples(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Nova OS' }).click()

  const modal = modalAberto(page)
  await modal.getByPlaceholder('Nome ou CPF...').fill(CLIENTE)
  await modal.getByText(CLIENTE, { exact: true }).click()

  await modal.getByText('Veículo', { exact: true })
    .locator('xpath=following-sibling::select')
    .selectOption({ label: VEICULO })

  const servicoNome = modal.getByText(SERVICO, { exact: true })
  await servicoNome.click()
  await servicoNome.locator('xpath=../..').locator('input[type="number"]').fill(String(VALOR_SERVICO))

  await modal.getByRole('button', { name: 'Salvar OS' }).click()
  await expect(modal).not.toBeVisible()
}

/** Lê o "#N" da primeira linha da listagem (a OS recém-criada tem sempre o maior número). */
async function numeroDaPrimeiraLinha(page: import('@playwright/test').Page): Promise<number> {
  const texto = await page.locator('table tbody tr').first().locator('td').first().textContent()
  return parseInt((texto ?? '').replace('#', '').trim(), 10)
}

test.describe('Cenário 6 — Numeração de OS é sequencial por loja (migration 008_numero_os_por_loja)', () => {
  test('duas OS criadas em sequência recebem números consecutivos', async ({ page }) => {
    await abrirApp(page)
    await irPara(page, 'Ordens de Serviço')

    // Não assume um valor absoluto (ex.: 16): a suíte roda serial e
    // compartilha a mesma loja de teste entre specs (ver playwright.config.ts),
    // então outros specs (01/02/03) já podem ter criado OS antes deste rodar,
    // avançando lojas.proximoNumero além do valor pós-seed. O que importa é a
    // relação sequencial entre duas OS criadas em sequência aqui, não o valor
    // absoluto de nenhuma delas.
    const numeroAntes = await numeroDaPrimeiraLinha(page)

    await criarOSSimples(page)
    const numero1 = await numeroDaPrimeiraLinha(page)
    expect(
      numero1,
      `esperava que a OS recém-criada recebesse o número imediatamente seguinte ao maior já existente ` +
      `(${numeroAntes} → ${numeroAntes + 1}), mas veio ${numero1}`,
    ).toBe(numeroAntes + 1)

    await criarOSSimples(page)
    const numero2 = await numeroDaPrimeiraLinha(page)
    expect(
      numero2,
      `esperava que a segunda OS criada em sequência recebesse o número imediatamente seguinte ao da ` +
      `primeira (${numero1} → ${numero1 + 1}), confirmando numeração sequencial sem repetição, mas veio ${numero2}`,
    ).toBe(numero1 + 1)
  })

  /**
   * Verifica o requisito central da migration 008: cada loja numera OS a
   * partir de 1, independente de quantas OS outras lojas já têm. A conta e2e
   * só tem RLS liberado pra própria loja (ver supabase/policies.sql), então
   * criar e limpar uma loja temporária exige um client com a service role key
   * (bypassa RLS) — sem ela, este teste é pulado (ver .env.e2e.local).
   */
  test('uma loja nova, sem nenhuma OS, também começa a numeração do 1 (isolamento entre lojas)', async () => {
    const url = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    test.skip(
      !url || !serviceRoleKey,
      'SUPABASE_SERVICE_ROLE_KEY não configurado em .env.e2e.local — pulando verificação de isolamento entre lojas.',
    )

    const admin = createClient(url as string, serviceRoleKey as string)

    const { data: lojaTemp, error: erroCriarLoja } = await admin
      .from('lojas')
      .insert({ nome: 'Loja Temporária E2E — isolamento de numeração', plano: 'teste' })
      .select('id')
      .single()

    if (erroCriarLoja || !lojaTemp) {
      throw new Error(`falha ao criar loja temporária de teste — ${erroCriarLoja?.message ?? 'sem linha retornada'}`)
    }

    try {
      const { data: numero1, error: erroRpc1 } = await admin.rpc('proximo_numero_os', { loja_id_param: lojaTemp.id })
      if (erroRpc1) throw new Error(`falha ao chamar proximo_numero_os pela primeira vez — ${erroRpc1.message}`)
      expect(
        numero1,
        'esperava que a primeira chamada de proximo_numero_os para uma loja recém-criada (sem nenhuma OS) retornasse 1',
      ).toBe(1)

      const { data: numero2, error: erroRpc2 } = await admin.rpc('proximo_numero_os', { loja_id_param: lojaTemp.id })
      if (erroRpc2) throw new Error(`falha ao chamar proximo_numero_os pela segunda vez — ${erroRpc2.message}`)
      expect(
        numero2,
        'esperava que a segunda chamada retornasse 2, confirmando que a sequência avança independente da loja de teste principal',
      ).toBe(2)
    } finally {
      await admin.from('lojas').delete().eq('id', lojaTemp.id)
    }
  })
})
