import { Page, Locator, expect } from '@playwright/test'

/**
 * Cria um novo perfil (loja) via tela "Selecionar Perfil" e entra nele.
 * Cada teste roda em um contexto de browser isolado (localStorage vazio),
 * então cada perfil criado aqui começa "do zero".
 *
 * comExemplo=true (padrão da própria UI) carrega os dados de demonstração
 * do WrapOS: 10 clientes, 10 veículos, 15 OS, 3 instaladores, 8 serviços,
 * 6 produtos de estoque (2 já em condição crítica) e uma meta mensal.
 */
export async function criarPerfil(page: Page, nomeLoja: string, comExemplo = true) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Novo Perfil' }).click()
  await page.getByPlaceholder('Ex: WrapOS Studio').fill(nomeLoja)
  if (!comExemplo) {
    // o toggle "Começar com dados de exemplo" vem ligado por padrão
    await page.getByText('Começar com dados de exemplo').locator('xpath=following-sibling::button').click()
  }
  await page.getByRole('button', { name: 'Criar Perfil' }).click()
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible()
}

/**
 * Navega pelo menu lateral (SPA) — nunca use page.goto() entre páginas após
 * logar, isso reseta o perfil ativo (App.tsx mantém `perfilAtivo` só em
 * estado React, não relê do sessionStorage no mount).
 *
 * Usa "começa com" em vez de match exato porque o link de "Estoque" ganha
 * um badge numérico de itens críticos colado ao texto (ex.: "Estoque2"),
 * o que quebraria um match exato pelo rótulo puro.
 */
export async function irPara(page: Page, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('link', { name: new RegExp(`^${escaped}`) }).click()
}

/** Converte "R$ 1.800" / "R$ 1.234" em número (1800 / 1234). Moedas no app não têm centavos (maximumFractionDigits: 0). */
export function parseBRL(text: string | null): number {
  if (!text) return 0
  const digits = text.replace(/[^\d-]/g, '')
  return digits ? parseInt(digits, 10) : 0
}

/** Extrai o primeiro número inteiro de um texto (para contadores simples como "3"). */
export function parseInt0(text: string | null): number {
  if (!text) return 0
  const m = text.replace(/[^\d-]/g, '')
  return m ? parseInt(m, 10) : 0
}

/**
 * Localiza o valor de um KPI pelo rótulo exato.
 * Em todo o app, os cards de KPI seguem o padrão:
 *   <p>{label}</p>
 *   <p>{value}</p>
 * então o valor é o parágrafo-irmão seguinte ao rótulo.
 */
export function kpiValor(page: Page, label: string): Locator {
  return page.getByText(label, { exact: true }).first().locator('xpath=following-sibling::p[1]')
}

/**
 * O componente <Modal> (e o OSDrawer) sempre renderizam seu overlay com
 * as classes "fixed inset-0 z-50" — usamos isso para escopar buscas de
 * texto ao modal aberto, evitando ambiguidade com texto igual na página
 * de fundo (ex.: o badge de status "Aguard. Aprovação" dentro do modal
 * de detalhes da OS vs. o card de filtro de status da própria listagem).
 */
export function modalAberto(page: Page): Locator {
  return page.locator('div.fixed.inset-0.z-50').last()
}

/** Linha de uma tabela contendo um determinado texto (cliente, produto, etc.), com hover para revelar ações. */
export async function linhaDaTabela(page: Page, texto: string): Promise<Locator> {
  const row = page.locator('table tbody tr').filter({ hasText: texto })
  await row.hover()
  return row
}

/**
 * Valor "faturado" de um técnico/instalador no ranking (usado tanto em
 * Relatórios > Técnicos quanto em Equipe > Metas — ambos seguem o mesmo
 * padrão: <p>{nome}</p> dentro de uma coluna, com uma coluna-irmã à
 * direita cujo primeiro <p> é o valor faturado).
 */
export function rankingFaturamento(page: Page, nomeTecnico: string): Locator {
  return page
    .getByText(nomeTecnico, { exact: true })
    .locator('xpath=../following-sibling::div[1]/p[1]')
}

/**
 * Valor "atual" de um card de meta em Equipe > Metas (ex.: "Faturamento",
 * "Número de OS"). Estrutura do Card: 1ª div = título+%, 2ª div = barra,
 * 3ª div = [atual, meta] — pegamos o primeiro <span> da 3ª div.
 */
export function metaCardAtual(page: Page, titulo: string): Locator {
  const card = page.getByText(titulo, { exact: true }).locator('xpath=../..')
  return card.locator('> div').nth(2).locator('span').first()
}
