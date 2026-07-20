import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { LancamentoFinanceiro } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

/** Datas voltam do Postgres como timestamp — normaliza de volta pra 'YYYY-MM-DD', mesmo padrão de dataCadastro/dataCriacao. */
function normalizarData(v: unknown): string | undefined {
  return v ? String(v).slice(0, 10) : undefined
}

function normalizarLancamento(row: Record<string, unknown>): LancamentoFinanceiro {
  return {
    id:             row.id as string,
    tipo:           row.tipo as LancamentoFinanceiro['tipo'],
    categoria:      row.categoria as string,
    descricao:      row.descricao as string,
    valor:          row.valor as number,
    data:           normalizarData(row.data) as string,
    formaPagamento: row.formaPagamento as string,
    osId:           (row.osId as string | null) ?? undefined,
  }
}

function paraLinha(id: string, lojaId: string, l: Omit<LancamentoFinanceiro, 'id'>) {
  return {
    id, lojaId,
    tipo: l.tipo, categoria: l.categoria, descricao: l.descricao,
    valor: l.valor, data: l.data, formaPagamento: l.formaPagamento,
    osId: l.osId ?? null,
  }
}

/**
 * Fonte de dados de `lancamentos_financeiro` — quinta entidade migrada de
 * localStorage pro Supabase (ver CLAUDE.md, "Migração de entidades pro
 * Supabase"), seguindo o mesmo modelo de useVeiculosSupabase.ts /
 * useOrdensServicoSupabase.ts. `osId` é uma referência solta (String?, sem FK)
 * pro id de uma OrdemServico — nunca validada aqui, mesmo comportamento livre
 * de antes em localStorage.
 */
export function useLancamentosSupabase(lojaId: string) {
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([])

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      const { data, error } = await supabase.from('lancamentos_financeiro').select('*').eq('lojaId', lojaId)
      if (cancelado) return

      if (error) {
        toast.error('Não foi possível carregar os lançamentos financeiros. Verifique sua conexão.')
        return
      }
      setLancamentos((data ?? []).map(normalizarLancamento))
    }

    carregar()
    return () => { cancelado = true }
  }, [lojaId])

  const adicionarLancamento = (l: Omit<LancamentoFinanceiro, 'id'>): void => {
    const id = uid()
    setLancamentos(prev => [...prev, { ...l, id }])

    supabase.from('lancamentos_financeiro').insert(paraLinha(id, lojaId, l)).then(({ error }) => {
      if (error) {
        setLancamentos(prev => prev.filter(x => x.id !== id))
        toast.error('Não foi possível salvar o lançamento financeiro na nuvem. Tente novamente.')
      }
    })
  }

  const removerLancamento = (id: string) => {
    let removido: LancamentoFinanceiro | undefined
    let posicao = -1
    setLancamentos(prev => {
      posicao = prev.findIndex(x => x.id === id)
      removido = prev[posicao]
      return prev.filter(x => x.id !== id)
    })

    supabase.from('lancamentos_financeiro').delete().eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && removido) {
        const item = removido
        const pos = posicao
        setLancamentos(prev => {
          const copia = [...prev]
          copia.splice(Math.min(pos, copia.length), 0, item)
          return copia
        })
        toast.error('Não foi possível excluir o lançamento financeiro na nuvem.')
      }
    })
  }

  return { lancamentos, adicionarLancamento, removerLancamento }
}
