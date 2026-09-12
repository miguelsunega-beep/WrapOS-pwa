import { test, expect } from '@playwright/test'
import { abrirApp, irPara, modalAberto, linhaDaTabela } from './helpers'

const NOME_PRODUTO = 'Produto Histórico E2E'
const MOTIVO_BAIXA = 'Perda em corte E2E'

/**
 * Cobertura do caso mais simples do histórico de movimentação de estoque
 * (migration 019, ver CLAUDE.md): um ajuste manual (Baixa de Estoque) precisa
 * gerar uma linha em movimentacoes_estoque com o motivo correto, visível na
 * tela de Histórico por produto. Cobertura do consumo em OS (segunda origem,
 * 'os_materiais') fica pro spec de materiais já existente — duplicar aqui
 * duplicaria o fluxo de criação de OS inteiro só pra chegar no mesmo ponto.
 */
test.describe('Cenário 8 — Histórico de movimentação de estoque', () => {
  test('baixa de estoque com motivo aparece no histórico do produto', async ({ page }) => {
    await abrirApp(page)
    await irPara(page, 'Estoque')

    // ── Criar produto de teste (categoria não-rolo, mostra Qtd./Mínimo direto) ─
    await page.getByRole('button', { name: 'Novo Produto' }).click()
    const modalNovoProduto = modalAberto(page)
    await expect(modalNovoProduto.getByText('Novo Produto', { exact: true })).toBeVisible()

    await modalNovoProduto.getByPlaceholder('Ex: Filme PPF Xpel Ultimate').fill(NOME_PRODUTO)
    await modalNovoProduto.getByText('Categoria', { exact: true })
      .locator('xpath=following-sibling::select')
      .selectOption({ label: 'Acessórios' })
    await modalNovoProduto.getByText('Qtd. Inicial', { exact: true })
      .locator('xpath=following-sibling::input').fill('10')
    await modalNovoProduto.getByText('Estoque Mínimo', { exact: true })
      .locator('xpath=following-sibling::input').fill('2')
    await modalNovoProduto.getByPlaceholder('0,00').fill('25')

    await modalNovoProduto.getByRole('button', { name: 'Cadastrar Produto' }).click()
    await expect(modalNovoProduto).not.toBeVisible()

    // ── Registrar baixa com motivo ──────────────────────────────────
    const linhaProduto = await linhaDaTabela(page, NOME_PRODUTO)
    await linhaProduto.locator('button').nth(2).click() // ícone PackageMinus = "Baixa de Estoque"

    const modalBaixa = modalAberto(page)
    await expect(modalBaixa.getByText('Baixa de Estoque', { exact: true })).toBeVisible()
    await modalBaixa.getByText('Quantidade a Baixar', { exact: false })
      .locator('xpath=following-sibling::input').fill('3')
    await modalBaixa.getByPlaceholder('Ex: Uso em OS #1087, perda, vencimento...').fill(MOTIVO_BAIXA)
    await modalBaixa.getByRole('button', { name: 'Registrar Baixa' }).click()
    await expect(modalBaixa).not.toBeVisible()

    // ── Estoque atualizado (10 - 3 = 7) ──────────────────────────────
    const linhaProduto2 = await linhaDaTabela(page, NOME_PRODUTO)
    await expect(linhaProduto2).toContainText('7')

    // ── Histórico mostra a baixa, com tipo/delta/motivo corretos ─────
    await linhaProduto2.locator('button').nth(3).click() // ícone History = "Histórico"

    const modalHistorico = modalAberto(page)
    await expect(modalHistorico.getByText(`Histórico — ${NOME_PRODUTO}`, { exact: false })).toBeVisible()

    const linhaHistorico = modalHistorico.locator('table tbody tr').first()
    await expect(
      linhaHistorico.getByText('Saída', { exact: true }),
      'esperava a linha de histórico marcada como "Saída" (baixa de estoque)',
    ).toBeVisible()
    await expect(
      linhaHistorico,
      'esperava o delta da baixa (-3) visível na linha de histórico',
    ).toContainText('-3')
    await expect(
      linhaHistorico.getByText(MOTIVO_BAIXA, { exact: false }),
      `esperava o motivo "${MOTIVO_BAIXA}" (digitado no modal de Baixa) gravado e exibido na linha de histórico — não descartado como antes (void motivo)`,
    ).toBeVisible()

    await modalHistorico.getByRole('button', { name: 'Fechar' }).click()
    await expect(modalHistorico).not.toBeVisible()
  })
})
