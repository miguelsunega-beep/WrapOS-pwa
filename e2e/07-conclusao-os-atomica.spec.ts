import { test, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { abrirApp, irPara, modalAberto } from './helpers'

// Clientes não usados por nenhum outro spec (evita acoplamento com 01-06).
const CLIENTE_A = 'Thiago Lima'
const VEICULO_A = 'Mercedes-Benz GLE 400d 2024 · CBK-1H89'
const SERVICO_A = 'PPF Parcial'
const VALOR_A   = 1800

const CLIENTE_B = 'Mariana Souza'
const VEICULO_B = 'Toyota Corolla Cross 2022 · MTP-5L77'
const SERVICO_B = 'Chrome Delete'
const VALOR_B   = 890

// Produto de demonstração usado como material de estoque (categoria PPF,
// visível no MaterialSelector do ConcluirOSModal — filtro padrão inclui PPF).
const PRODUTO_MATERIAL = 'Filme PPF Llumar Platinum'
const QTD_MATERIAL = 1

/** Cria um client autenticado como a conta e2e, pra ler/escrever direto no Supabase (bypassa a UI, mesmo padrão de 06-numeracao-os-por-loja.spec.ts). */
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

/** Cria uma OS mínima e aprova (aguardando_aprovacao → em_andamento). Retorna o número (#N) exibido na listagem. */
async function criarEAprovarOS(
  page: import('@playwright/test').Page,
  cliente: string, veiculo: string, servico: string, valor: number,
): Promise<number> {
  await page.getByRole('button', { name: 'Nova OS' }).click()
  const modalNova = modalAberto(page)
  await modalNova.getByPlaceholder('Nome ou CPF...').fill(cliente)
  await modalNova.getByText(cliente, { exact: true }).click()
  await modalNova.getByText('Veículo', { exact: true })
    .locator('xpath=following-sibling::select')
    .selectOption({ label: veiculo })

  const servicoNome = modalNova.getByText(servico, { exact: true })
  await servicoNome.click()
  await servicoNome.locator('xpath=../..').locator('input[type="number"]').fill(String(valor))

  await modalNova.getByRole('button', { name: 'Salvar OS' }).click()
  await expect(modalNova).not.toBeVisible()

  const numeroTexto = await page.locator('table tbody tr').first().locator('td').first().textContent()
  const numero = parseInt((numeroTexto ?? '').replace('#', '').trim(), 10)

  // aprova (em_andamento) — necessário pro botão "Concluir" aparecer no OSModal
  await page.locator('table tbody tr').first().click()
  const modalDetalhes = modalAberto(page)
  await expect(modalDetalhes).toContainText(cliente)
  await modalDetalhes.getByRole('button', { name: 'Aprovar' }).click()
  await modalDetalhes.getByRole('button', { name: 'Fechar', exact: true }).click()

  return numero
}

test.describe('Cenário 7 — Conclusão de OS é atômica (migration 009_concluir_os_atomica)', () => {
  test('concluir com materiais aplica as 7 partes numa única chamada', async ({ page }) => {
    const client = await supabaseAutenticado()
    const lojaId = await lojaIdDoClient(client)

    // ── Linha de base (antes de concluir) ──────────────────────────
    const { data: clienteAntes } = await client.from('clientes').select('id, totalGasto').eq('lojaId', lojaId).eq('nome', CLIENTE_A).single()
    const { data: produtoAntes } = await client.from('produtos').select('id, quantidade').eq('lojaId', lojaId).eq('nome', PRODUTO_MATERIAL).single()
    const { data: metaAntes }    = await client.from('metas').select('numeroOS').eq('lojaId', lojaId).single()

    await abrirApp(page)
    await irPara(page, 'Ordens de Serviço')

    const numero = await criarEAprovarOS(page, CLIENTE_A, VEICULO_A, SERVICO_A, VALOR_A)

    // ── Concluir com 1 material de estoque, pago agora ─────────────
    await page.locator('table tbody tr').first().click()
    const modalDetalhes2 = modalAberto(page)
    await modalDetalhes2.getByRole('button', { name: 'Concluir', exact: true }).click()

    const modalConcluir = modalAberto(page)
    await expect(modalConcluir.getByText(/Concluir OS #/)).toBeVisible()

    await modalConcluir.getByRole('button', { name: '+ Adicionar material' }).click()
    // 1º <select> do modal é o de produto (o de "forma de pagamento recebida" vem depois no DOM).
    // O texto da option inclui a quantidade em estoque (variável), então lê o
    // "value" (o id do produto) pela <option> cujo texto começa com o nome do
    // produto, em vez de tentar casar o label inteiro.
    const selectProduto = modalConcluir.locator('select').first()
    const valorOpcaoProduto = await selectProduto
      .locator('option', { hasText: PRODUTO_MATERIAL })
      .getAttribute('value')
    await selectProduto.selectOption(valorOpcaoProduto!)

    await modalConcluir.getByRole('button', { name: '✓ Recebido agora' }).click()
    await modalConcluir.getByRole('button', { name: 'Concluir OS' }).click()
    await expect(page.getByText(/Concluir OS #/)).toHaveCount(0)

    // ── Verifica as 7 partes direto no Supabase ────────────────────
    const { data: os } = await client.from('ordens_servico').select('*').eq('lojaId', lojaId).eq('numero', numero).single()
    expect(os, `esperava encontrar a OS #${numero} recém-concluída no Supabase`).toBeTruthy()

    expect(os?.status, '1) esperava que a OS ficasse com status "concluido"').toBe('concluido')
    expect(os?.statusPagamento, '1) esperava statusPagamento "pago" (marcado como "Recebido agora")').toBe('pago')
    expect(os?.entregue, '1) esperava entregue=false logo após concluir (só vira true ao entregar o veículo)').toBe(false)
    expect(os?.materiaisUsados, '1) esperava 1 material salvo na OS').toHaveLength(1)

    const { data: lancEntrada } = await client.from('lancamentos_financeiro')
      .select('*').eq('lojaId', lojaId).eq('osId', os!.id).eq('tipo', 'entrada')
    expect(lancEntrada, '2) esperava exatamente 1 lançamento de receita (entrada) pra essa OS').toHaveLength(1)
    expect(lancEntrada![0].valor, '2) esperava que o lançamento de receita tivesse o valorTotal da OS').toBe(VALOR_A)

    const { data: garantiasOS } = await client.from('garantias').select('*').eq('lojaId', lojaId).eq('osId', os!.id)
    expect(garantiasOS, '3) esperava exatamente 1 garantia criada pra essa OS').toHaveLength(1)

    const { data: clienteDepois } = await client.from('clientes').select('totalGasto').eq('lojaId', lojaId).eq('id', clienteAntes!.id).single()
    expect(
      clienteDepois?.totalGasto,
      `4) esperava totalGasto do cliente aumentar em R$ ${VALOR_A} (de ${clienteAntes!.totalGasto} para ${clienteAntes!.totalGasto + VALOR_A})`,
    ).toBe(clienteAntes!.totalGasto + VALOR_A)

    const { data: metaDepois } = await client.from('metas').select('numeroOS').eq('lojaId', lojaId).single()
    expect(metaDepois?.numeroOS, '5) esperava numeroOS da meta aumentar em 1').toBe(metaAntes!.numeroOS + 1)

    const { data: produtoDepois } = await client.from('produtos').select('quantidade').eq('lojaId', lojaId).eq('id', produtoAntes!.id).single()
    expect(
      produtoDepois?.quantidade,
      `6) esperava estoque do produto cair em ${QTD_MATERIAL} (de ${produtoAntes!.quantidade} para ${produtoAntes!.quantidade - QTD_MATERIAL})`,
    ).toBe(produtoAntes!.quantidade - QTD_MATERIAL)

    const { data: lancDespesa } = await client.from('lancamentos_financeiro')
      .select('*').eq('lojaId', lojaId).eq('osId', os!.id).eq('tipo', 'saida').eq('categoria', 'Material')
    expect(lancDespesa, '7) esperava exatamente 1 lançamento de despesa de material pra essa OS').toHaveLength(1)

    await client.auth.signOut()
  })

  /**
   * Testa a idempotência da própria função SQL (não do wrapper JS — em uso
   * normal, concluirOS já retorna cedo se os.status já for 'concluido', então
   * a RPC nunca é chamada duas vezes pela mesma sessão). Chama
   * concluir_os_atomica diretamente duas vezes com o mesmo payload,
   * confirmando que as duas checagens replicadas em SQL (!lancamentos.some /
   * !garantias.some, ver migration 009) seguram a segunda chamada. Deltas de
   * totalGasto/numeroOS ficam zerados de propósito — essas duas partes não
   * têm proteção de idempotência (nem tinham em JS), o teste foca só no que a
   * migration promete replicar.
   */
  test('concluir a mesma OS duas vezes seguidas não duplica lançamento nem garantia', async ({ page }) => {
    const client = await supabaseAutenticado()
    const lojaId = await lojaIdDoClient(client)

    await abrirApp(page)
    await irPara(page, 'Ordens de Serviço')
    const numero = await criarEAprovarOS(page, CLIENTE_B, VEICULO_B, SERVICO_B, VALOR_B)

    const { data: os } = await client.from('ordens_servico').select('*').eq('lojaId', lojaId).eq('numero', numero).single()
    const { data: metaRow } = await client.from('metas').select('id').eq('lojaId', lojaId).single()

    const payload = {
      p_os_id: os!.id,
      p_loja_id: lojaId,
      p_os_patch: {
        status: 'concluido', dataFinalizacao: os!.dataCriacao, statusPagamento: 'pago',
        materiaisUsados: os!.materiaisUsados, entregue: false,
      },
      p_lancamento_receita: {
        id: `e2e-idemp-lanc-${os!.id}`, tipo: 'entrada', categoria: 'OS',
        descricao: 'teste idempotência', valor: os!.valorTotal, data: os!.dataCriacao, formaPagamento: os!.formaPagamento,
      },
      p_garantia: {
        id: `e2e-idemp-gar-${os!.id}`, clienteId: os!.clienteId, veiculoId: os!.veiculoId,
        servico: 'teste', produto: '', dataInicio: os!.dataCriacao, dataFim: os!.dataCriacao, status: 'ativa',
      },
      p_cliente_id: os!.clienteId,
      p_cliente_delta_total_gasto: 0,
      p_meta_id: metaRow!.id,
      p_meta_delta_numero_os: 0,
      p_estoque_deltas: [],
      p_lancamento_despesa_material: null,
      p_agendamento_id: null,
    }

    const { error: erro1 } = await client.rpc('concluir_os_atomica', payload)
    expect(erro1, `primeira chamada não deveria falhar — ${erro1?.message}`).toBeNull()

    const { error: erro2 } = await client.rpc('concluir_os_atomica', payload)
    expect(erro2, `segunda chamada (payload idêntico) não deveria falhar — ${erro2?.message}`).toBeNull()

    const { data: lancamentosEntrada } = await client.from('lancamentos_financeiro')
      .select('*').eq('lojaId', lojaId).eq('osId', os!.id).eq('tipo', 'entrada')
    expect(
      lancamentosEntrada,
      'esperava exatamente 1 lançamento de entrada mesmo após chamar concluir_os_atomica 2x com o mesmo payload',
    ).toHaveLength(1)

    const { data: garantiasOS } = await client.from('garantias').select('*').eq('lojaId', lojaId).eq('osId', os!.id)
    expect(
      garantiasOS,
      'esperava exatamente 1 garantia mesmo após chamar concluir_os_atomica 2x com o mesmo payload',
    ).toHaveLength(1)

    await client.auth.signOut()
  })
})
