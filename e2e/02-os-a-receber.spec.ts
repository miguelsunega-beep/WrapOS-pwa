import { test, expect } from '@playwright/test'
import { abrirApp, irPara, parseBRL, kpiValor, modalAberto } from './helpers'

// Cliente sem OS ativa nos dados de exemplo (evita ambiguidade de seletor no Pátio).
const CLIENTE = 'Isabela Martins'
const VEICULO = 'Jeep Wrangler Rubicon 2023 · SDF-4J01'
const SERVICO = 'Envelopamento Capô'
const VALOR_SERVICO = 380

test.describe('Cenário 2 — OS concluída como "a receber"', () => {
  test('marca como a receber, aparece no banner, e só conta como receita após registrar o pagamento', async ({ page }) => {
    await abrirApp(page)

    await irPara(page, 'Financeiro')
    await expect(
      page.getByText('A Receber', { exact: true }),
      'esperava que o banner "A Receber" NÃO existisse antes de qualquer OS pendente de pagamento (dados de exemplo não têm OS "a receber")',
    ).toHaveCount(0)
    const receitaBrutaInicial = parseBRL(await kpiValor(page, 'Receita Bruta').textContent())

    // ── Criar e concluir uma OS marcando como "a receber" ───────────
    await irPara(page, 'Ordens de Serviço')
    await page.getByRole('button', { name: 'Nova OS' }).click()

    const modalNovaOS = modalAberto(page)
    await modalNovaOS.getByPlaceholder('Nome ou CPF...').fill(CLIENTE)
    await modalNovaOS.getByText(CLIENTE, { exact: true }).click()

    await modalNovaOS.getByText('Veículo', { exact: true })
      .locator('xpath=following-sibling::select')
      .selectOption({ label: VEICULO })

    const servicoNome = modalNovaOS.getByText(SERVICO, { exact: true })
    await servicoNome.click()
    await servicoNome.locator('xpath=../..').locator('input[type="number"]').fill(String(VALOR_SERVICO))

    await modalNovaOS.getByRole('button', { name: 'Salvar OS' }).click()
    await expect(modalNovaOS).not.toBeVisible()

    // a OS recém-criada tem o maior número, então sempre é a primeira linha da listagem
    // (o cliente "Isabela Martins" também tem uma OS antiga concluída nos dados de exemplo)
    await page.locator('table tbody tr').first().click()
    const modalDetalhes = modalAberto(page)
    await expect(modalDetalhes).toContainText(CLIENTE)
    await modalDetalhes.getByRole('button', { name: 'Aprovar' }).click()
    await modalDetalhes.getByRole('button', { name: 'Concluir', exact: true }).click()
    // o OSModal fecha sozinho ao clicar em "Concluir", antes de abrir o ConcluirOSModal.

    const modalConcluir = modalAberto(page)
    await expect(modalConcluir.getByText(/Concluir OS #/)).toBeVisible()
    await modalConcluir.getByRole('button', { name: '⏳ A receber' }).click()
    await modalConcluir.getByRole('button', { name: 'Concluir OS' }).click()
    await expect(page.getByText(/Concluir OS #/)).toHaveCount(0)

    // ── Aparece no banner "A Receber" do Financeiro ─────────────────
    await irPara(page, 'Financeiro')
    const bannerAReceber = page.getByText('A Receber', { exact: true }).locator('xpath=../../..')
    await expect(
      bannerAReceber,
      'esperava que o banner "A Receber" aparecesse no Financeiro após concluir a OS como "a receber"',
    ).toBeVisible()
    const valorAReceber = parseBRL(await bannerAReceber.locator('> p').last().textContent())
    expect(
      valorAReceber,
      `esperava que o banner "A Receber" mostrasse R$ ${VALOR_SERVICO}, mas mostrou R$ ${valorAReceber}`,
    ).toBe(VALOR_SERVICO)

    // ── NÃO foi contabilizada como receita ainda ────────────────────
    const receitaBrutaAntesPagamento = parseBRL(await kpiValor(page, 'Receita Bruta').textContent())
    expect(
      receitaBrutaAntesPagamento,
      `esperava que "Receita Bruta" permanecesse em R$ ${receitaBrutaInicial} (sem contar a OS "a receber"), mas o valor ficou em R$ ${receitaBrutaAntesPagamento}`,
    ).toBe(receitaBrutaInicial)

    // ── Registrar o pagamento depois ────────────────────────────────
    await irPara(page, 'Ordens de Serviço')
    await page.locator('table tbody tr').first().click()
    const modalDetalhes2 = modalAberto(page)
    await expect(modalDetalhes2).toContainText(CLIENTE)
    await expect(
      modalDetalhes2.getByText('A RECEBER', { exact: true }),
      'esperava ver o selo "A RECEBER" na OS concluída e ainda não paga',
    ).toBeVisible()
    await modalDetalhes2.getByRole('button', { name: 'Registrar pagamento' }).click()
    await modalDetalhes2.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await expect(
      modalDetalhes2.getByText('A RECEBER', { exact: true }),
      'esperava que o selo "A RECEBER" desaparecesse da OS depois de registrar o pagamento',
    ).toHaveCount(0)
    await modalDetalhes2.getByRole('button', { name: 'Fechar', exact: true }).click()

    // ── Passou a contar como receita e o banner foi atualizado ─────
    await irPara(page, 'Financeiro')
    const receitaBrutaFinal = parseBRL(await kpiValor(page, 'Receita Bruta').textContent())
    expect(
      receitaBrutaFinal,
      `esperava que "Receita Bruta" aumentasse em R$ ${VALOR_SERVICO} (de R$ ${receitaBrutaAntesPagamento} para R$ ${receitaBrutaAntesPagamento + VALOR_SERVICO}) após registrar o pagamento, mas o valor ficou em R$ ${receitaBrutaFinal}`,
    ).toBe(receitaBrutaAntesPagamento + VALOR_SERVICO)

    await expect(
      page.getByText('A Receber', { exact: true }),
      'esperava que o banner "A Receber" desaparecesse do Financeiro depois do pagamento ser registrado (não há mais nada pendente)',
    ).toHaveCount(0)
  })
})
