import { test, expect } from '@playwright/test'
import { abrirApp, irPara, kpiValor, parseInt0, modalAberto, linhaDaTabela } from './helpers'

const NOME_PRODUTO = 'Produto Crítico E2E'

/** Lê o "X Itens em estoque crítico" da faixa de ação na tela Início (some se X for 0). */
async function lerAvisoEstoqueCriticoHome(page: import('@playwright/test').Page) {
  const aviso = page.getByText(/Itens em estoque crítico/)
  if (await aviso.count() === 0) return 0
  return parseInt0(await aviso.first().textContent())
}

test.describe('Cenário 5 — Estoque crítico', () => {
  test('produto abaixo do mínimo gera aviso; entrada de estoque suficiente remove o aviso', async ({ page }) => {
    await abrirApp(page)

    // ── Linha de base (dados de exemplo já trazem 2 itens críticos) ─
    await irPara(page, 'Início')
    const avisoHomeInicial = await lerAvisoEstoqueCriticoHome(page)

    await irPara(page, 'Estoque')
    const criticosKpiInicial = parseInt0(await kpiValor(page, 'Estoque Crítico').textContent())

    // ── Criar produto já em condição crítica (quantidade <= mínimo) ─
    await page.getByRole('button', { name: 'Novo Produto' }).click()
    const modalNovoProduto = modalAberto(page)
    await expect(modalNovoProduto.getByText('Novo Produto', { exact: true })).toBeVisible()

    await modalNovoProduto.getByPlaceholder('Ex: Filme PPF Xpel Ultimate').fill(NOME_PRODUTO)

    // categoria "Acessórios" não é vendida por rolo — mostra os campos de Qtd./Mínimo direto
    await modalNovoProduto.getByText('Categoria', { exact: true })
      .locator('xpath=following-sibling::select')
      .selectOption({ label: 'Acessórios' })

    await modalNovoProduto.getByText('Qtd. Inicial', { exact: true })
      .locator('xpath=following-sibling::input').fill('2')
    await modalNovoProduto.getByText('Estoque Mínimo', { exact: true })
      .locator('xpath=following-sibling::input').fill('10')
    await modalNovoProduto.getByPlaceholder('0,00').fill('50')

    await modalNovoProduto.getByRole('button', { name: 'Cadastrar Produto' }).click()
    await expect(modalNovoProduto).not.toBeVisible()

    // ── Aviso de estoque crítico aparece destacado na tela Estoque ──
    const linhaProduto = await linhaDaTabela(page, NOME_PRODUTO)
    await expect(
      linhaProduto.getByText('Crítico', { exact: true }),
      `esperava que o produto "${NOME_PRODUTO}" (quantidade 2, mínimo 10) aparecesse com o selo "Crítico" na tela Estoque`,
    ).toBeVisible()

    const criticosKpiDepoisCriar = parseInt0(await kpiValor(page, 'Estoque Crítico').textContent())
    expect(
      criticosKpiDepoisCriar,
      `esperava que o KPI "Estoque Crítico" aumentasse em 1 (de ${criticosKpiInicial} para ${criticosKpiInicial + 1}) após criar o produto crítico, mas o valor ficou em ${criticosKpiDepoisCriar}`,
    ).toBe(criticosKpiInicial + 1)

    // ── Aviso aparece na tela Início ──────────────────────────────────
    await irPara(page, 'Início')
    const avisoHomeDepoisCriar = await lerAvisoEstoqueCriticoHome(page)
    expect(
      avisoHomeDepoisCriar,
      `esperava que o aviso "Itens em estoque crítico" da tela Início aumentasse em 1 (de ${avisoHomeInicial} para ${avisoHomeInicial + 1}), mas o valor ficou em ${avisoHomeDepoisCriar}`,
    ).toBe(avisoHomeInicial + 1)

    // ── Registrar entrada suficiente para sair do crítico ────────────
    await irPara(page, 'Estoque')
    const linhaProduto2 = await linhaDaTabela(page, NOME_PRODUTO)
    await linhaProduto2.locator('button').nth(1).click() // ícone PackagePlus = "Entrada de Estoque"

    const modalEntrada = modalAberto(page)
    await expect(modalEntrada.getByText('Entrada de Estoque', { exact: true })).toBeVisible()
    await modalEntrada.getByText('Quantidade a Adicionar', { exact: false })
      .locator('xpath=following-sibling::input').fill('10') // 2 + 10 = 12 > mínimo (10)
    await modalEntrada.getByRole('button', { name: 'Registrar Entrada' }).click()
    await expect(modalEntrada).not.toBeVisible()

    // ── Aviso desaparece ──────────────────────────────────────────────
    const linhaProduto3 = page.locator('table tbody tr').filter({ hasText: NOME_PRODUTO })
    await expect(
      linhaProduto3.getByText('Normal', { exact: true }),
      `esperava que o produto "${NOME_PRODUTO}" passasse a mostrar o selo "Normal" após a entrada de estoque (12 > mínimo 10)`,
    ).toBeVisible()
    await expect(linhaProduto3.getByText('Crítico', { exact: true })).toHaveCount(0)

    const criticosKpiFinal = parseInt0(await kpiValor(page, 'Estoque Crítico').textContent())
    expect(
      criticosKpiFinal,
      `esperava que o KPI "Estoque Crítico" voltasse ao valor original de ${criticosKpiInicial} após a entrada de estoque, mas o valor ficou em ${criticosKpiFinal}`,
    ).toBe(criticosKpiInicial)

    await irPara(page, 'Início')
    const avisoHomeFinal = await lerAvisoEstoqueCriticoHome(page)
    expect(
      avisoHomeFinal,
      `esperava que o aviso "Itens em estoque crítico" da tela Início voltasse ao valor original de ${avisoHomeInicial} após a entrada de estoque, mas o valor ficou em ${avisoHomeFinal}`,
    ).toBe(avisoHomeInicial)
  })
})
