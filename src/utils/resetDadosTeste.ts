import { supabase } from '../lib/supabase'

/**
 * Apaga primeiro (nessa ordem) por causa das FKs compostas:
 * ordens_servico depende de veiculos/clientes, veiculos depende de clientes.
 */
const TABELAS_DEPENDENTES = [
  { tabela: 'ordens_servico', label: 'ordens de serviço' },
  { tabela: 'veiculos', label: 'veículos' },
  { tabela: 'clientes', label: 'clientes' },
] as const

/** Sem FK entre si — podem ser apagadas em paralelo, depois das dependentes acima. */
const TABELAS_INDEPENDENTES = [
  { tabela: 'produtos', label: 'produtos' },
  { tabela: 'lancamentos_financeiro', label: 'lançamentos financeiros' },
  { tabela: 'agendamentos', label: 'agendamentos' },
  { tabela: 'instaladores', label: 'instaladores' },
  { tabela: 'garantias', label: 'garantias' },
  { tabela: 'servicos', label: 'serviços' },
  { tabela: 'metas', label: 'meta' },
] as const

/**
 * Mesmas chaves de `migracaoFeitaKey(lojaId)` de cada use*Supabase.ts (ver
 * CLAUDE.md, "Migração de entidades pro Supabase") — precisa ser limpa após
 * o reset pra não sobrar flag apontando pra dado que não existe mais.
 * `configuracoes` fica de fora de propósito: reset não toca em config da loja.
 */
const PREFIXO_FLAG_MIGRACAO: Record<string, string> = {
  ordens_servico: 'wrapos_ordens_migrados_',
  veiculos: 'wrapos_veiculos_migrados_',
  clientes: 'wrapos_clientes_migrados_',
  produtos: 'wrapos_produtos_migrados_',
  lancamentos_financeiro: 'wrapos_lancamentos_migrados_',
  agendamentos: 'wrapos_agendamentos_migrados_',
  instaladores: 'wrapos_instaladores_migrados_',
  garantias: 'wrapos_garantias_migrados_',
  servicos: 'wrapos_servicos_migrados_',
  metas: 'wrapos_meta_migrado_',
}

/**
 * Apaga todo o fluxo operacional (OS, veículos, clientes, produtos,
 * lançamentos financeiros, agendamentos, instaladores, garantias, serviços
 * e meta) da loja `lojaId`, sem tocar em `configuracoes`/`usuarios`/`lojas`/
 * auth. `metas` é apagada junto com o resto (não só zerada): o hook singleton
 * (`useMetasSupabase`) recria automaticamente uma linha com META_PADRAO na
 * próxima vez que montar, o que já é o "estado inicial" pedido.
 *
 * Para no primeiro passo que falhar e lança um erro específico dizendo até
 * onde chegou — nunca reporta sucesso se algo no meio falhou.
 */
export async function resetarDadosTeste(lojaId: string): Promise<void> {
  for (const { tabela, label } of TABELAS_DEPENDENTES) {
    const { error } = await supabase.from(tabela).delete().eq('lojaId', lojaId)
    if (error) {
      throw new Error(`Reset parcial: falha ao apagar ${label}. Nenhum outro dado foi apagado além disso. Tente novamente.`)
    }
  }

  const resultados = await Promise.all(
    TABELAS_INDEPENDENTES.map(({ tabela }) => supabase.from(tabela).delete().eq('lojaId', lojaId))
  )

  const falhas = resultados
    .map((r, i) => ({ error: r.error, label: TABELAS_INDEPENDENTES[i].label }))
    .filter(r => r.error)

  if (falhas.length > 0) {
    const nomes = falhas.map(f => f.label).join(', ')
    throw new Error(`Reset parcial: ordens de serviço, veículos e clientes foram apagados, mas falhou ao apagar ${nomes}. Rode o reset de novo pra concluir.`)
  }

  for (const { tabela } of [...TABELAS_DEPENDENTES, ...TABELAS_INDEPENDENTES]) {
    localStorage.removeItem(`${PREFIXO_FLAG_MIGRACAO[tabela]}${lojaId}`)
  }
}
