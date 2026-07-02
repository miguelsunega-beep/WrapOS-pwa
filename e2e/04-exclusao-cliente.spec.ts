import { test, expect } from '@playwright/test'
import { abrirApp, irPara, modalAberto, linhaDaTabela } from './helpers'

test.describe('Cenário 4 — Exclusão / inativação de cliente', () => {
  test('cliente sem OS vinculada é excluído permanentemente', async ({ page }) => {
    const NOME_CLIENTE = 'Cliente Sem OS E2E'

    await abrirApp(page)

    await irPara(page, 'Clientes')
    await page.getByRole('button', { name: 'Novo Cliente' }).click()

    const modalNovoCliente = modalAberto(page)
    await modalNovoCliente.getByPlaceholder('Nome completo').fill(NOME_CLIENTE)
    await modalNovoCliente.getByRole('button', { name: 'Cadastrar Cliente' }).click()
    await expect(modalNovoCliente).not.toBeVisible()

    await expect(
      page.locator('table tbody tr').filter({ hasText: NOME_CLIENTE }),
      `esperava encontrar "${NOME_CLIENTE}" na lista de clientes ativos após o cadastro`,
    ).toBeVisible()

    // ── Excluir (sem OS vinculada → exclusão permanente, igual ao comportamento anterior) ─
    const linhaCliente = await linhaDaTabela(page, NOME_CLIENTE)
    await linhaCliente.locator('button[title="Excluir"]').click()
    const modalConfirmarExclusao = modalAberto(page)
    await expect(modalConfirmarExclusao.getByText('Confirmar exclusão')).toBeVisible()
    await modalConfirmarExclusao.getByRole('button', { name: 'Excluir', exact: true }).click()

    await expect(
      page.locator('table tbody tr').filter({ hasText: NOME_CLIENTE }),
      `esperava que "${NOME_CLIENTE}" não aparecesse mais na lista de Ativos após a exclusão`,
    ).toHaveCount(0)

    // confirma que foi excluído de verdade, e não apenas inativado
    await page.getByRole('button', { name: 'Inativos', exact: true }).click()
    await expect(
      page.locator('table tbody tr').filter({ hasText: NOME_CLIENTE }),
      `esperava que "${NOME_CLIENTE}" também não aparecesse na lista de Inativos — ele não tinha OS vinculada, então a exclusão deveria ser permanente, não uma inativação`,
    ).toHaveCount(0)
  })

  test('cliente com OS vinculada é inativado (não excluído), some dos Ativos, aparece nos Inativos e pode ser reativado', async ({ page }) => {
    const NOME_CLIENTE = 'Cliente Com OS E2E'
    const SERVICO      = 'Higienização'

    await abrirApp(page)

    // ── Criar cliente + veículo ────────────────────────────────────────
    await irPara(page, 'Clientes')
    await page.getByRole('button', { name: 'Novo Cliente' }).click()

    const modalNovoCliente = modalAberto(page)
    await modalNovoCliente.getByPlaceholder('Nome completo').fill(NOME_CLIENTE)
    await modalNovoCliente.getByRole('button', { name: 'Cadastrar Cliente' }).click()
    await expect(modalNovoCliente).not.toBeVisible()

    await page.locator('table tbody tr').filter({ hasText: NOME_CLIENTE }).click()
    const modalDetalhesCliente = modalAberto(page)
    await modalDetalhesCliente.getByRole('button', { name: /Veículos/ }).click()
    await modalDetalhesCliente.getByText('Adicionar Veículo', { exact: true }).click()

    await modalDetalhesCliente.getByPlaceholder('Ex: Toyota').fill('Fiat')
    await modalDetalhesCliente.getByPlaceholder('Ex: Corolla').fill('Uno')
    await modalDetalhesCliente.getByText('Ano', { exact: true })
      .locator('xpath=following-sibling::input').fill('2020')
    await modalDetalhesCliente.getByPlaceholder('Ex: Preto').fill('Branco')
    await modalDetalhesCliente.getByPlaceholder('ABC1D23').fill('TST123')
    await modalDetalhesCliente.getByRole('button', { name: 'Salvar Veículo' }).click()
    await expect(modalDetalhesCliente.getByText('Fiat Uno 2020')).toBeVisible()
    await modalDetalhesCliente.getByRole('button', { name: 'Fechar' }).click()

    // ── Criar uma OS vinculada a esse cliente ───────────────────────────
    await irPara(page, 'Ordens de Serviço')
    await page.getByRole('button', { name: 'Nova OS' }).click()

    const modalNovaOS = modalAberto(page)
    await modalNovaOS.getByPlaceholder('Nome ou CPF...').fill(NOME_CLIENTE)
    await modalNovaOS.getByText(NOME_CLIENTE, { exact: true }).click()
    await modalNovaOS.getByText('Veículo', { exact: true })
      .locator('xpath=following-sibling::select')
      .selectOption({ label: 'Fiat Uno 2020 · TST123' })

    const servicoNome = modalNovaOS.getByText(SERVICO, { exact: true })
    await servicoNome.click()
    await servicoNome.locator('xpath=../..').locator('input[type="number"]').fill('180')

    await modalNovaOS.getByRole('button', { name: 'Salvar OS' }).click()
    await expect(modalNovaOS).not.toBeVisible()

    const linhaOS = page.locator('table tbody tr').first()
    await expect(linhaOS).toContainText(NOME_CLIENTE)

    // ── Tentar excluir o cliente → deve inativar em vez de excluir ─────
    await irPara(page, 'Clientes')
    const linhaCliente = await linhaDaTabela(page, NOME_CLIENTE)
    await linhaCliente.locator('button[title="Excluir"]').click()
    const modalConfirmarExclusao = modalAberto(page)
    await modalConfirmarExclusao.getByRole('button', { name: 'Excluir', exact: true }).click()

    await expect(
      page.getByText(/foi inativado/i),
      'esperava um aviso informativo explicando que o cliente foi inativado (e não excluído) por ter OS vinculada',
    ).toBeVisible()

    // ── Some da lista de Ativos ──────────────────────────────────────────
    await expect(
      page.locator('table tbody tr').filter({ hasText: NOME_CLIENTE }),
      `esperava que "${NOME_CLIENTE}" não aparecesse mais na lista de clientes Ativos depois de inativado`,
    ).toHaveCount(0)

    // ── Aparece na lista de Inativos, com badge e botão Reativar ────────
    await page.getByRole('button', { name: 'Inativos', exact: true }).click()
    const linhaInativo = page.locator('table tbody tr').filter({ hasText: NOME_CLIENTE })
    await expect(
      linhaInativo,
      `esperava encontrar "${NOME_CLIENTE}" na lista de Inativos depois de tentar excluí-lo`,
    ).toBeVisible()
    await expect(
      linhaInativo.getByText('Inativo', { exact: true }),
      `esperava que a linha de "${NOME_CLIENTE}" mostrasse o selo "Inativo"`,
    ).toBeVisible()
    await expect(linhaInativo.locator('button[title="Reativar"]')).toBeVisible()

    // ── A OS já existente continua mostrando o nome do cliente normalmente ─
    // (sem nenhuma indicação visual de status — o cliente só está inativo na tela de Clientes)
    await irPara(page, 'Ordens de Serviço')
    await expect(
      page.locator('table tbody tr').first(),
      `esperava que a OS continuasse mostrando "${NOME_CLIENTE}" normalmente, sem referência órfã ("—") e sem indicação de status, já que o cliente não foi excluído, apenas inativado`,
    ).toContainText(NOME_CLIENTE)

    // ── Reativar o cliente ───────────────────────────────────────────────
    await irPara(page, 'Clientes')
    await page.getByRole('button', { name: 'Inativos', exact: true }).click()
    await page.locator('table tbody tr').filter({ hasText: NOME_CLIENTE })
      .locator('button[title="Reativar"]').click()

    await expect(
      page.locator('table tbody tr').filter({ hasText: NOME_CLIENTE }),
      `esperava que "${NOME_CLIENTE}" não aparecesse mais na lista de Inativos depois de reativado`,
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Ativos', exact: true }).click()
    await expect(
      page.locator('table tbody tr').filter({ hasText: NOME_CLIENTE }),
      `esperava que "${NOME_CLIENTE}" voltasse a aparecer na lista de Ativos depois de reativado`,
    ).toBeVisible()
  })
})
