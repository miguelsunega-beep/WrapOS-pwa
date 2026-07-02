import { test, expect } from '@playwright/test'
import { abrirApp, irPara, modalAberto } from './helpers'

test('repro: Felipe Santos inativo aparece no autocomplete da Nova OS?', async ({ page }) => {
  await abrirApp(page)

  await irPara(page, 'Clientes')
  await page.getByRole('button', { name: 'Inativos', exact: true }).click()
  await expect(page.locator('table tbody tr').filter({ hasText: 'Felipe Santos' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Ativos', exact: true }).click()
  const linha = page.locator('table tbody tr').filter({ hasText: 'Felipe Santos' })
  await linha.hover()
  await linha.locator('button[title="Excluir"]').click()
  const modalConfirmar = modalAberto(page)
  await modalConfirmar.getByRole('button', { name: 'Excluir', exact: true }).click()
  await expect(page.getByText(/foi inativado/i)).toBeVisible()

  await page.getByRole('button', { name: 'Inativos', exact: true }).click()
  await expect(
    page.locator('table tbody tr').filter({ hasText: 'Felipe Santos' }),
    'Felipe Santos deveria estar na lista de Inativos agora',
  ).toBeVisible()

  await irPara(page, 'Ordens de Serviço')
  await page.getByRole('button', { name: 'Nova OS' }).click()
  const modalNovaOS = modalAberto(page)
  await modalNovaOS.getByPlaceholder('Nome ou CPF...').fill('Felipe Santos')
  const itemDropdown = modalNovaOS.getByText('Felipe Santos', { exact: true })
  console.log('Felipe Santos aparece no dropdown da Nova OS?', await itemDropdown.count())
  await page.screenshot({ path: 'test-results/_debug-repro.png', fullPage: true })
})
