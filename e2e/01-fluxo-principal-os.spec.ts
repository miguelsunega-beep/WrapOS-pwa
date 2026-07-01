import { test, expect } from '@playwright/test'
import {
  criarPerfil, irPara, parseBRL, parseInt0,
  kpiValor, modalAberto, rankingFaturamento, metaCardAtual,
} from './helpers'

// Cliente sem nenhuma OS ativa nos dados de exemplo, para o card do
// Pátio não ficar ambíguo com outra OS do mesmo cliente.
const CLIENTE  = 'Gabriela Alves'
const VEICULO  = 'Volkswagen Golf GTI 2022 · NJX-8P92'
const SERVICO  = 'PPF Parcial'
const VALOR_SERVICO = 1800
const INSTALADOR = 'Lucas Mota'
const PERCENTUAL_COMISSAO = 25
const COMISSAO_ESPERADA = VALOR_SERVICO * (PERCENTUAL_COMISSAO / 100) // 450

test.describe('Cenário 1 — Fluxo principal de uma OS, do início ao fim', () => {
  test('criar → aprovar → concluir como pago reflete em Pátio, Início, Financeiro, Relatórios e Metas', async ({ page }) => {
    await criarPerfil(page, 'Loja E2E — Fluxo OS')

    // ── Linha de base: tela Início ──────────────────────────────────
    const receitaDiaInicial     = parseBRL(await kpiValor(page, 'Receita do dia').textContent())
    const carrosPatioInicial    = parseInt0(await kpiValor(page, 'Carros no pátio').textContent())
    const concluidasHojeInicial = parseInt0(await kpiValor(page, 'Concluídas hoje').textContent())
    const faturamentoMesInicial = parseBRL(await kpiValor(page, 'Faturamento do mês').textContent())

    // ── Linha de base: Financeiro (Receita Bruta do mês atual) ─────
    await irPara(page, 'Financeiro')
    const receitaBrutaInicial = parseBRL(await kpiValor(page, 'Receita Bruta').textContent())

    // ── Linha de base: Relatórios > Técnicos (faturamento do instalador) ─
    await page.getByRole('button', { name: 'Relatórios' }).click()
    await page.getByRole('button', { name: 'Técnicos' }).click()
    const faturamentoInstaladorInicial = parseBRL(await rankingFaturamento(page, INSTALADOR).textContent())

    // ── Linha de base: Equipe > Metas (faturamento e nº de OS do mês) ─
    await irPara(page, 'Equipe')
    await page.getByRole('button', { name: 'Metas' }).click()
    const metaFaturamentoInicial = parseBRL(await metaCardAtual(page, 'Faturamento').textContent())
    const metaNumeroOSInicial    = parseInt0(await metaCardAtual(page, 'Número de OS').textContent())

    // ════════════════════════════════════════════════════════════════
    // 1. Criar OS para cliente existente, com serviço + comissão
    // ════════════════════════════════════════════════════════════════
    await irPara(page, 'Ordens de Serviço')
    await page.getByRole('button', { name: 'Nova OS' }).click()

    const modalNovaOS = modalAberto(page)
    await expect(modalNovaOS.getByText('Nova Ordem de Serviço')).toBeVisible()

    await modalNovaOS.getByPlaceholder('Nome ou CPF...').fill(CLIENTE)
    await modalNovaOS.getByText(CLIENTE, { exact: true }).click()
    await expect(
      modalNovaOS.getByText('Cliente confirmado'),
      'esperava ver a confirmação "Cliente confirmado" após selecionar o cliente na busca',
    ).toBeVisible()

    await modalNovaOS.getByText('Veículo', { exact: true })
      .locator('xpath=following-sibling::select')
      .selectOption({ label: VEICULO })

    const servicoNome  = modalNovaOS.getByText(SERVICO, { exact: true })
    await servicoNome.click()
    await servicoNome.locator('xpath=../..').locator('input[type="number"]').fill(String(VALOR_SERVICO))

    await modalNovaOS.getByText('Instalador', { exact: true })
      .locator('xpath=following-sibling::select')
      .selectOption({ label: INSTALADOR })

    const comissaoLabel = modalNovaOS.getByText('Comissão do Instalador', { exact: true })
    await comissaoLabel.locator('xpath=../following-sibling::button').click() // ativa o toggle
    await comissaoLabel.locator('xpath=../../following-sibling::div[1]')
      .locator('input[type="number"]').fill(String(PERCENTUAL_COMISSAO))

    const valorTotalExibido = parseBRL(
      await modalNovaOS.getByText('Valor Total da OS', { exact: true }).locator('xpath=following-sibling::span').textContent(),
    )
    expect(
      valorTotalExibido,
      `esperava que o "Valor Total da OS" exibido no formulário fosse R$ ${VALOR_SERVICO}, mas o valor exibido foi R$ ${valorTotalExibido}`,
    ).toBe(VALOR_SERVICO)

    await modalNovaOS.getByRole('button', { name: 'Salvar OS' }).click()
    await expect(modalNovaOS).not.toBeVisible()

    // ════════════════════════════════════════════════════════════════
    // 2. Comissão calculada = percentual × valor total
    // ════════════════════════════════════════════════════════════════
    const linhaOS = page.locator('table tbody tr').first()
    await expect(
      linhaOS,
      `esperava que a OS recém-criada para "${CLIENTE}" aparecesse no topo da listagem de Ordens de Serviço`,
    ).toContainText(CLIENTE)
    await linhaOS.click()

    const modalDetalhes = modalAberto(page)
    // o status aparece duas vezes no modal (badge fixo + atalho clicável de status); .first() evita ambiguidade
    await expect(modalDetalhes.getByText('Aguard. Aprovação', { exact: true }).first()).toBeVisible()

    const comissaoExibida = parseBRL(
      await modalDetalhes.getByText('Comissão', { exact: true }).locator('xpath=following-sibling::p').textContent(),
    )
    expect(
      comissaoExibida,
      `esperava que a comissão fosse ${PERCENTUAL_COMISSAO}% × R$ ${VALOR_SERVICO} = R$ ${COMISSAO_ESPERADA}, mas o valor exibido na OS foi R$ ${comissaoExibida}`,
    ).toBe(COMISSAO_ESPERADA)

    // ════════════════════════════════════════════════════════════════
    // 3. OS aparece no Pátio / "Carros no Pátio" aumenta em 1
    // ════════════════════════════════════════════════════════════════
    await modalDetalhes.getByRole('button', { name: 'Fechar', exact: true }).click()

    await irPara(page, 'Início')
    const carrosPatioAposCriar = parseInt0(await kpiValor(page, 'Carros no pátio').textContent())
    expect(
      carrosPatioAposCriar,
      `esperava que "Carros no Pátio" aumentasse em 1 (de ${carrosPatioInicial} para ${carrosPatioInicial + 1}) após criar a OS, mas o valor ficou em ${carrosPatioAposCriar}`,
    ).toBe(carrosPatioInicial + 1)

    await irPara(page, 'Pátio')
    const boxCard = page.locator('div.cursor-pointer').filter({ hasText: CLIENTE })
    await expect(
      boxCard,
      `esperava encontrar um card no Pátio para o cliente "${CLIENTE}" após criar a OS`,
    ).toBeVisible()

    // ════════════════════════════════════════════════════════════════
    // 4. Avançar status: aguardando aprovação → em andamento
    // ════════════════════════════════════════════════════════════════
    await boxCard.click()
    const drawer = modalAberto(page)
    await expect(
      drawer.getByText('Aguard. Aprovação', { exact: true }),
      'esperava que o drawer do Pátio mostrasse o status "Aguard. Aprovação" para a OS recém-criada',
    ).toBeVisible()
    await drawer.locator('button[title="Fechar (só fecha com X)"]').click()

    await irPara(page, 'Ordens de Serviço')
    // a OS recém-criada tem o maior número, então sempre é a primeira linha da listagem
    // (o cliente "Gabriela Alves" também tem uma OS antiga concluída nos dados de exemplo)
    await page.locator('table tbody tr').first().click()
    const modalDetalhes2 = modalAberto(page)
    await expect(modalDetalhes2).toContainText(CLIENTE)
    await modalDetalhes2.getByRole('button', { name: 'Aprovar' }).click()
    await expect(
      modalDetalhes2.getByText('Em Andamento', { exact: true }).first(),
      'esperava que, após clicar em "Aprovar", o status mudasse para "Em Andamento" no modal de detalhes',
    ).toBeVisible()
    await modalDetalhes2.getByRole('button', { name: 'Fechar', exact: true }).click()

    // status mudou na lista de OS
    await expect(
      page.locator('table tbody tr').first(),
      'esperava que a listagem de OS mostrasse o status "Em Andamento" após aprovar a OS',
    ).toContainText('Em Andamento')

    // status mudou no Pátio
    await irPara(page, 'Pátio')
    await page.locator('div.cursor-pointer').filter({ hasText: CLIENTE }).click()
    const drawer2 = modalAberto(page)
    await expect(
      drawer2.getByText('Em Andamento', { exact: true }),
      'esperava que o drawer do Pátio mostrasse "Em Andamento" depois da aprovação da OS',
    ).toBeVisible()

    // ════════════════════════════════════════════════════════════════
    // 5. Concluir a OS marcando como "pago"
    // ════════════════════════════════════════════════════════════════
    await drawer2.getByRole('button', { name: 'Concluir', exact: true }).click()

    const modalConcluir = modalAberto(page)
    await expect(modalConcluir.getByText(/Concluir OS #/)).toBeVisible()
    await modalConcluir.getByRole('button', { name: '✓ Recebido agora' }).click()
    await modalConcluir.getByRole('button', { name: 'Concluir OS' }).click()
    await expect(modalConcluir).not.toBeVisible()

    // saiu do Pátio
    await expect(
      page.locator('div.cursor-pointer').filter({ hasText: CLIENTE }),
      `esperava que o card de "${CLIENTE}" desaparecesse do Pátio depois de concluir a OS`,
    ).toHaveCount(0)

    // apareceu em "Concluídas Hoje" no Pátio
    const secaoConcluidasHoje = page.getByRole('heading', { name: /Concluídas Hoje/ }).locator('xpath=ancestor::section[1]')
    await expect(
      secaoConcluidasHoje,
      'esperava que a seção "Concluídas Hoje" do Pátio exibisse a OS recém-concluída',
    ).toContainText(CLIENTE)

    // ════════════════════════════════════════════════════════════════
    // 6. Reflexo na tela Início
    // ════════════════════════════════════════════════════════════════
    await irPara(page, 'Início')

    const receitaDiaFinal = parseBRL(await kpiValor(page, 'Receita do dia').textContent())
    expect(
      receitaDiaFinal,
      `esperava que "Receita do Dia" aumentasse em R$ ${VALOR_SERVICO} (de R$ ${receitaDiaInicial} para R$ ${receitaDiaInicial + VALOR_SERVICO}), mas o valor ficou em R$ ${receitaDiaFinal}`,
    ).toBe(receitaDiaInicial + VALOR_SERVICO)

    const concluidasHojeFinal = parseInt0(await kpiValor(page, 'Concluídas hoje').textContent())
    expect(
      concluidasHojeFinal,
      `esperava que "Concluídas Hoje" aumentasse em 1 (de ${concluidasHojeInicial} para ${concluidasHojeInicial + 1}), mas o valor ficou em ${concluidasHojeFinal}`,
    ).toBe(concluidasHojeInicial + 1)

    const faturamentoMesFinal = parseBRL(await kpiValor(page, 'Faturamento do mês').textContent())
    expect(
      faturamentoMesFinal,
      `esperava que "Faturamento do Mês" aumentasse em R$ ${VALOR_SERVICO} (de R$ ${faturamentoMesInicial} para R$ ${faturamentoMesInicial + VALOR_SERVICO}), mas o valor ficou em R$ ${faturamentoMesFinal}`,
    ).toBe(faturamentoMesInicial + VALOR_SERVICO)

    const carrosPatioFinal = parseInt0(await kpiValor(page, 'Carros no pátio').textContent())
    expect(
      carrosPatioFinal,
      `esperava que "Carros no Pátio" voltasse ao valor original de ${carrosPatioInicial} após a OS ser concluída, mas o valor ficou em ${carrosPatioFinal}`,
    ).toBe(carrosPatioInicial)

    // ════════════════════════════════════════════════════════════════
    // 7. Valor entrou como receita no Financeiro do mês atual
    // ════════════════════════════════════════════════════════════════
    await irPara(page, 'Financeiro')
    const receitaBrutaFinal = parseBRL(await kpiValor(page, 'Receita Bruta').textContent())
    expect(
      receitaBrutaFinal,
      `esperava que "Receita Bruta" no Financeiro aumentasse em R$ ${VALOR_SERVICO} (de R$ ${receitaBrutaInicial} para R$ ${receitaBrutaInicial + VALOR_SERVICO}), mas o valor ficou em R$ ${receitaBrutaFinal}`,
    ).toBe(receitaBrutaInicial + VALOR_SERVICO)

    // ════════════════════════════════════════════════════════════════
    // 8. Instalador aparece no ranking de Relatórios > Técnicos
    // ════════════════════════════════════════════════════════════════
    await page.getByRole('button', { name: 'Relatórios' }).click()
    await page.getByRole('button', { name: 'Técnicos' }).click()
    const faturamentoInstaladorFinal = parseBRL(await rankingFaturamento(page, INSTALADOR).textContent())
    expect(
      faturamentoInstaladorFinal,
      `esperava que o faturamento de "${INSTALADOR}" no ranking de Técnicos aumentasse em R$ ${VALOR_SERVICO} (de R$ ${faturamentoInstaladorInicial} para R$ ${faturamentoInstaladorInicial + VALOR_SERVICO}), mas o valor ficou em R$ ${faturamentoInstaladorFinal}`,
    ).toBe(faturamentoInstaladorInicial + VALOR_SERVICO)

    // ════════════════════════════════════════════════════════════════
    // 9. Contribuiu para o progresso da meta do mês em Equipe > Metas
    // ════════════════════════════════════════════════════════════════
    await irPara(page, 'Equipe')
    await page.getByRole('button', { name: 'Metas' }).click()

    const metaFaturamentoFinal = parseBRL(await metaCardAtual(page, 'Faturamento').textContent())
    expect(
      metaFaturamentoFinal,
      `esperava que o "Faturamento" atual da meta do mês aumentasse em R$ ${VALOR_SERVICO} (de R$ ${metaFaturamentoInicial} para R$ ${metaFaturamentoInicial + VALOR_SERVICO}), mas o valor ficou em R$ ${metaFaturamentoFinal}`,
    ).toBe(metaFaturamentoInicial + VALOR_SERVICO)

    const metaNumeroOSFinal = parseInt0(await metaCardAtual(page, 'Número de OS').textContent())
    expect(
      metaNumeroOSFinal,
      `esperava que o "Número de OS" atual da meta do mês aumentasse em 1 (de ${metaNumeroOSInicial} para ${metaNumeroOSInicial + 1}), mas o valor ficou em ${metaNumeroOSFinal}`,
    ).toBe(metaNumeroOSInicial + 1)
  })
})
