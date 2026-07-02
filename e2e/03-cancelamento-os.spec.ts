import { test, expect } from '@playwright/test'
import {
  abrirApp, irPara, parseBRL, parseInt0,
  kpiValor, modalAberto, rankingFaturamento, metaCardAtual,
} from './helpers'

const CLIENTE    = 'Gabriela Alves'
const VEICULO    = 'Volkswagen Golf GTI 2022 · NJX-8P92'
const SERVICO    = 'Insulfilm'
const VALOR_SERVICO = 450
const INSTALADOR = 'Felipe Torres'

test.describe('Cenário 3 — Cancelamento de OS', () => {
  test('OS cancelada some do Pátio e não conta em receita, ranking de técnicos nem meta do mês', async ({ page }) => {
    await abrirApp(page)

    // ── Linhas de base ───────────────────────────────────────────────
    await irPara(page, 'Financeiro')
    const receitaBrutaInicial = parseBRL(await kpiValor(page, 'Receita Bruta').textContent())

    await page.getByRole('button', { name: 'Relatórios' }).click()
    await page.getByRole('button', { name: 'Técnicos' }).click()
    const faturamentoInstaladorInicial = parseBRL(await rankingFaturamento(page, INSTALADOR).textContent())

    await irPara(page, 'Equipe')
    await page.getByRole('button', { name: 'Metas' }).click()
    const metaFaturamentoInicial = parseBRL(await metaCardAtual(page, 'Faturamento').textContent())
    const metaNumeroOSInicial    = parseInt0(await metaCardAtual(page, 'Número de OS').textContent())

    // ── Criar a OS ────────────────────────────────────────────────────
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

    await modalNovaOS.getByText('Instalador', { exact: true })
      .locator('xpath=following-sibling::select')
      .selectOption({ label: INSTALADOR })

    await modalNovaOS.getByRole('button', { name: 'Salvar OS' }).click()
    await expect(modalNovaOS).not.toBeVisible()

    // confirma que está no Pátio antes de cancelar
    await irPara(page, 'Pátio')
    await expect(
      page.locator('div.cursor-pointer').filter({ hasText: CLIENTE }),
      `esperava encontrar a OS de "${CLIENTE}" no Pátio antes do cancelamento`,
    ).toBeVisible()

    // ── Cancelar a OS ─────────────────────────────────────────────────
    await irPara(page, 'Ordens de Serviço')
    // a OS recém-criada tem o maior número, então sempre é a primeira linha da listagem
    // (o cliente "Gabriela Alves" também tem uma OS antiga concluída nos dados de exemplo)
    await page.locator('table tbody tr').first().click()
    const modalDetalhes = modalAberto(page)
    await expect(modalDetalhes).toContainText(CLIENTE)
    await modalDetalhes.getByRole('button', { name: 'Cancelar OS' }).click()
    await expect(
      modalDetalhes.getByText('Cancelado', { exact: true }),
      'esperava que o status mudasse para "Cancelado" no modal de detalhes após clicar em "Cancelar OS"',
    ).toBeVisible()
    await modalDetalhes.getByRole('button', { name: 'Fechar', exact: true }).click()

    // ── Não aparece mais no Pátio ──────────────────────────────────────
    await irPara(page, 'Pátio')
    await expect(
      page.locator('div.cursor-pointer').filter({ hasText: CLIENTE }),
      `esperava que a OS cancelada de "${CLIENTE}" não aparecesse mais no Pátio`,
    ).toHaveCount(0)

    // ── Não conta como receita no Financeiro ──────────────────────────
    await irPara(page, 'Financeiro')
    const receitaBrutaFinal = parseBRL(await kpiValor(page, 'Receita Bruta').textContent())
    expect(
      receitaBrutaFinal,
      `esperava que "Receita Bruta" permanecesse em R$ ${receitaBrutaInicial} (OS cancelada não gera receita), mas o valor ficou em R$ ${receitaBrutaFinal}`,
    ).toBe(receitaBrutaInicial)

    // ── Não conta no ranking de Técnicos ──────────────────────────────
    await page.getByRole('button', { name: 'Relatórios' }).click()
    await page.getByRole('button', { name: 'Técnicos' }).click()
    const faturamentoInstaladorFinal = parseBRL(await rankingFaturamento(page, INSTALADOR).textContent())
    expect(
      faturamentoInstaladorFinal,
      `esperava que o faturamento de "${INSTALADOR}" no ranking de Técnicos permanecesse em R$ ${faturamentoInstaladorInicial} (OS cancelada não conta), mas o valor ficou em R$ ${faturamentoInstaladorFinal}`,
    ).toBe(faturamentoInstaladorInicial)

    // ── Não conta na meta do mês ───────────────────────────────────────
    await irPara(page, 'Equipe')
    await page.getByRole('button', { name: 'Metas' }).click()
    const metaFaturamentoFinal = parseBRL(await metaCardAtual(page, 'Faturamento').textContent())
    expect(
      metaFaturamentoFinal,
      `esperava que o "Faturamento" atual da meta do mês permanecesse em R$ ${metaFaturamentoInicial} (OS cancelada não conta), mas o valor ficou em R$ ${metaFaturamentoFinal}`,
    ).toBe(metaFaturamentoInicial)

    const metaNumeroOSFinal = parseInt0(await metaCardAtual(page, 'Número de OS').textContent())
    expect(
      metaNumeroOSFinal,
      `esperava que o "Número de OS" atual da meta do mês permanecesse em ${metaNumeroOSInicial} (OS cancelada não conta), mas o valor ficou em ${metaNumeroOSFinal}`,
    ).toBe(metaNumeroOSInicial)
  })
})
