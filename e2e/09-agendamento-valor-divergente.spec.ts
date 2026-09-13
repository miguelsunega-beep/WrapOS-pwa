import { test, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { abrirApp, irPara, modalAberto, parseBRL } from './helpers'

/**
 * Regressão do bug real encontrado na OS #27 (produção, 2026-09-12): um serviço
 * de catálogo sem preço padrão (`servicos.preco = null`, comum em serviços
 * cotados caso a caso, ex. "Vitrificação") + um agendamento com valor próprio
 * negociado (`agendamentos.valor`) fazia handleAprovarEntrada (useAgendamento.ts)
 * gravar `valorTotal` a partir de `ag.valor`, mas `servicos[0].preco` a partir
 * do preço de catálogo — duas fontes diferentes pro mesmo valor. 3 das 4 OS
 * de produção originadas de agendamento já tinham nascido divergentes (ver
 * diagnóstico); a correção unifica as duas atribuições na mesma variável.
 *
 * Cliente/veículo: "Rodrigo Mendes" / BMW M3 (c2/v2) — não usado por nenhum
 * outro spec (01 usa Gabriela Alves, 02 Isabela Martins, 03 Gabriela Alves,
 * 06 Ricardo Fonseca, 07 Thiago Lima/Mariana Souza — ver cada spec).
 */
const CLIENTE  = 'Rodrigo Mendes'
const CLIENTE_ID = 'c2'
const VEICULO_ID = 'v2'
const INSTALADOR_ID = 'i1'

const SERVICO_ID   = 'e2e-servico-sem-preco'
const SERVICO_NOME = 'Vitrificação Cerâmica E2E'
const AGENDAMENTO_ID = 'e2e-ag-valor-divergente'
const VALOR_AGENDAMENTO = 1500

/** Cria um client autenticado como a conta e2e, pra ler/escrever direto no Supabase (bypassa a UI, mesmo padrão de 06/07). */
async function supabaseAutenticado(): Promise<SupabaseClient> {
  const url      = process.env.VITE_SUPABASE_URL as string
  const anonKey  = process.env.VITE_SUPABASE_ANON_KEY as string
  const email    = process.env.E2E_TEST_EMAIL as string
  const password = process.env.E2E_TEST_PASSWORD as string

  const client = createClient(url, anonKey)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`supabaseAutenticado: falha ao logar — ${error.message}`)
  return client
}

async function lojaIdDoClient(client: SupabaseClient): Promise<string> {
  const { data: { user } } = await client.auth.getUser()
  const { data: usuario, error } = await client.from('usuarios').select('lojaId').eq('authUserId', user!.id).maybeSingle()
  if (error || !usuario) throw new Error(`lojaIdDoClient: falha ao resolver lojaId — ${error?.message ?? 'sem linha vinculada'}`)
  return usuario.lojaId as string
}

/** Data de hoje em YYYY-MM-DD (timezone local) — a view padrão da Agendamento é "semana"
 *  (diasDaSemana calculado com Date() local), e a semana corrente sempre contém hoje,
 *  então o agendamento aparece na grade sem precisar navegar semana/mês. */
function hojeLocal(): string {
  return new Date().toLocaleDateString('sv-SE')
}

test.describe('Cenário 9 — Agendamento → OS usa a mesma fonte de valor (fix da divergência da OS #27)', () => {
  test('serviço sem preço de catálogo + valor próprio no agendamento: OS nasce com valorTotal e servicos[0].preco iguais', async ({ page }) => {
    const client = await supabaseAutenticado()
    const lojaId = await lojaIdDoClient(client)

    // ── Arrange: serviço de catálogo SEM preço padrão + agendamento com valor próprio ──
    // Delete-then-insert com id fixo: idempotente se este spec for re-executado
    // isoladamente (sem passar pelo reseed completo do global-setup).
    await client.from('agendamentos').delete().eq('lojaId', lojaId).eq('id', AGENDAMENTO_ID)
    await client.from('servicos').delete().eq('lojaId', lojaId).eq('id', SERVICO_ID)

    const { error: erroServico } = await client.from('servicos').insert({
      id: SERVICO_ID, lojaId, nome: SERVICO_NOME, preco: null,
    })
    if (erroServico) throw new Error(`falha ao criar o serviço de teste sem preço — ${erroServico.message}`)

    const { error: erroAgendamento } = await client.from('agendamentos').insert({
      id: AGENDAMENTO_ID, lojaId,
      clienteId: CLIENTE_ID, veiculoId: VEICULO_ID, servicoId: SERVICO_ID, instaladorId: INSTALADOR_ID,
      box: 1, data: hojeLocal(), horario: '09:00', duracao: 0,
      valor: VALOR_AGENDAMENTO, status: 'agendado',
    })
    if (erroAgendamento) throw new Error(`falha ao criar o agendamento de teste — ${erroAgendamento.message}`)

    // ── Act: abrir o agendamento (card na grade semanal) e aprovar a entrada ──
    await abrirApp(page)
    await irPara(page, 'Agendamento')

    // No viewport desktop (1280px), só o AgendaGrid é visível — o AgendaList (mobile)
    // continua no DOM por trás de "md:hidden", então um getByText simples por nome do
    // cliente casaria com os dois (ambíguo). Os dois são <button>, então escopamos pelo
    // que está realmente visível.
    await page.getByRole('button', { name: new RegExp(CLIENTE) }).filter({ visible: true }).click()
    const modalDetalhes = modalAberto(page)
    await expect(modalDetalhes).toContainText(CLIENTE)
    await expect(modalDetalhes).toContainText(SERVICO_NOME)

    await modalDetalhes.getByRole('button', { name: 'Aprovar entrada' }).click()

    // handleAprovarEntrada navega pra /ordens e reabre a OS recém-criada automaticamente
    // assim que ela aparece no estado local (ver useEffect em useAgendamento.ts) — depende
    // do insert + refetch de `ordens` resolverem, por isso um timeout maior que o padrão.
    await expect(page).toHaveURL(/\/ordens/, { timeout: 15_000 })
    const modalOS = modalAberto(page)
    await expect(modalOS).toContainText(CLIENTE)
    await expect(modalOS).toContainText(SERVICO_NOME)

    // ── Assert (UI): campo "R$" do serviço e "Total" batem com o valor do agendamento ──
    const linhaServico = modalOS.locator('div.bg-surface-600').filter({ hasText: SERVICO_NOME })
    const inputValorServico = linhaServico.locator('input[type="number"]')
    await expect(inputValorServico).toHaveValue(String(VALOR_AGENDAMENTO))

    const totalFooter = modalOS.getByText('Total', { exact: true }).locator('xpath=following-sibling::span[1]')
    expect(
      parseBRL(await totalFooter.textContent()),
      `esperava que o "Total" do modal fosse R$ ${VALOR_AGENDAMENTO} (mesmo valor do serviço), mas veio diferente`,
    ).toBe(VALOR_AGENDAMENTO)

    await modalOS.getByRole('button', { name: 'Fechar', exact: true }).click()

    // ── Assert (lista): a coluna "Valor" da listagem também bate ──────
    const valorNaLista = parseBRL(await page.locator('table tbody tr').first().locator('td').nth(4).textContent())
    expect(
      valorNaLista,
      `esperava que a coluna "Valor" da listagem mostrasse R$ ${VALOR_AGENDAMENTO}, mas mostrou R$ ${valorNaLista}`,
    ).toBe(VALOR_AGENDAMENTO)

    // ── Assert (banco): valorTotal, servicos[0].preco e ag.valor são a mesma fonte ──
    const { data: os, error: erroOS } = await client
      .from('ordens_servico')
      .select('valorTotal, servicos, agendamentoId')
      .eq('lojaId', lojaId)
      .eq('agendamentoId', AGENDAMENTO_ID)
      .single()
    if (erroOS || !os) throw new Error(`falha ao ler a OS recém-criada — ${erroOS?.message ?? 'não encontrada'}`)

    expect(os.valorTotal, 'valorTotal da OS deveria ser o valor negociado no agendamento').toBe(VALOR_AGENDAMENTO)
    expect(os.servicos, 'OS deveria ter exatamente 1 item de serviço').toHaveLength(1)
    expect(
      os.servicos[0].preco,
      'servicos[0].preco deveria usar a MESMA fonte que valorTotal (ag.valor), não o preço de catálogo (null)',
    ).toBe(VALOR_AGENDAMENTO)

    await client.auth.signOut()
  })
})
