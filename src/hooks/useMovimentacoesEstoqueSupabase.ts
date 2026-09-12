import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { MovimentacaoEstoque } from '../types'

function normalizarMovimentacao(row: Record<string, unknown>): MovimentacaoEstoque {
  return {
    id:                 row.id as string,
    produtoId:          row.produtoId as string,
    tipo:               row.tipo as MovimentacaoEstoque['tipo'],
    origem:             row.origem as MovimentacaoEstoque['origem'],
    delta:              row.delta as number,
    quantidadeAnterior: row.quantidadeAnterior as number,
    quantidadeNova:     row.quantidadeNova as number,
    motivo:             (row.motivo as string | null) ?? undefined,
    referenciaId:       (row.referenciaId as string | null) ?? undefined,
    usuarioId:          row.usuarioId as string,
    // createdAt mantém timestamp completo (não só data) — diferente do
    // .slice(0, 10) usado em dataCadastro/dataCriacao em outros hooks: aqui
    // o horário importa (histórico de movimentação, não só o dia).
    createdAt:          row.createdAt as string,
  }
}

export interface FiltroMovimentacoesEstoque {
  produtoId?: string
  /** Data 'YYYY-MM-DD', inclusive. */
  desde: string
  /** Data 'YYYY-MM-DD', inclusive; omitido = sem limite superior (até agora). */
  ate?: string
}

/**
 * Leitura de `movimentacoes_estoque` — diferente das outras 11 entidades
 * (use*Supabase.ts), NÃO carrega tudo em memória ao montar: a tabela só
 * cresce e nunca é limpa (ver migration 019), então busca é sempre sob
 * demanda e filtrada por período (tela de Histórico em Estoque.tsx decide o
 * filtro padrão). Só leitura — a escrita acontece dentro das RPCs
 * ajustar_estoque_atomica/salvar_materiais_os_atomica, nunca por aqui.
 */
export function useMovimentacoesEstoqueSupabase(lojaId: string) {
  const buscarMovimentacoes = async (filtro: FiltroMovimentacoesEstoque): Promise<MovimentacaoEstoque[]> => {
    let query = supabase
      .from('movimentacoes_estoque')
      .select('*')
      .eq('lojaId', lojaId)
      .gte('createdAt', `${filtro.desde}T00:00:00`)
      .order('createdAt', { ascending: false })

    if (filtro.ate) query = query.lte('createdAt', `${filtro.ate}T23:59:59.999`)
    if (filtro.produtoId) query = query.eq('produtoId', filtro.produtoId)

    const { data, error } = await query
    if (error) {
      toast.error('Não foi possível carregar o histórico de movimentações.')
      return []
    }
    return (data ?? []).map(normalizarMovimentacao)
  }

  return { buscarMovimentacoes }
}
