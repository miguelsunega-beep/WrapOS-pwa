import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Garantia } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

/** Datas voltam do Postgres como timestamp — normaliza de volta pra 'YYYY-MM-DD', mesmo padrão de dataCadastro/dataCriacao. */
function normalizarData(v: unknown): string | undefined {
  return v ? String(v).slice(0, 10) : undefined
}

function normalizarGarantia(row: Record<string, unknown>): Garantia {
  return {
    id:         row.id as string,
    osId:       row.osId as string,
    clienteId:  row.clienteId as string,
    veiculoId:  row.veiculoId as string,
    servico:    row.servico as string,
    produto:    row.produto as string,
    dataInicio: normalizarData(row.dataInicio) as string,
    dataFim:    normalizarData(row.dataFim) as string,
    status:     row.status as Garantia['status'],
  }
}

function paraLinha(id: string, lojaId: string, g: Omit<Garantia, 'id'>) {
  return {
    id, lojaId,
    osId: g.osId, clienteId: g.clienteId, veiculoId: g.veiculoId,
    servico: g.servico, produto: g.produto,
    dataInicio: g.dataInicio, dataFim: g.dataFim, status: g.status,
  }
}

/**
 * Fonte de dados de `garantias` — oitava entidade migrada de localStorage pro
 * Supabase (ver CLAUDE.md, "Migração de entidades pro Supabase"), seguindo o
 * mesmo modelo de useVeiculosSupabase.ts. `osId`/`clienteId`/`veiculoId`
 * continuam Strings soltas, sem FK — mesmo padrão de `osId` em
 * LancamentoFinanceiro.
 */
export function useGarantiasSupabase(lojaId: string) {
  const [garantias, setGarantias] = useState<Garantia[]>([])

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      const { data, error } = await supabase.from('garantias').select('*').eq('lojaId', lojaId)
      if (cancelado) return

      if (error) {
        toast.error('Não foi possível carregar as garantias. Verifique sua conexão.')
        return
      }
      setGarantias((data ?? []).map(normalizarGarantia))
    }

    carregar()
    return () => { cancelado = true }
  }, [lojaId])

  const adicionarGarantia = (g: Omit<Garantia, 'id'>): void => {
    const id = uid()
    setGarantias(prev => [...prev, { ...g, id }])

    supabase.from('garantias').insert(paraLinha(id, lojaId, g)).then(({ error }) => {
      if (error) {
        setGarantias(prev => prev.filter(x => x.id !== id))
        toast.error('Não foi possível salvar a garantia na nuvem. Tente novamente.')
      }
    })
  }

  const editarGarantia = (id: string, patch: Partial<Omit<Garantia, 'id'>>) => {
    let anterior: Garantia | undefined
    setGarantias(prev => prev.map(x => {
      if (x.id !== id) return x
      anterior = x
      return { ...x, ...patch }
    }))

    supabase.from('garantias').update(patch).eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && anterior) {
        const snapshot = anterior
        setGarantias(prev => prev.map(x => x.id === id ? snapshot : x))
        toast.error('Não foi possível salvar a alteração da garantia na nuvem.')
      }
    })
  }

  const removerGarantia = (id: string) => {
    let removida: Garantia | undefined
    let posicao = -1
    setGarantias(prev => {
      posicao = prev.findIndex(x => x.id === id)
      removida = prev[posicao]
      return prev.filter(x => x.id !== id)
    })

    supabase.from('garantias').delete().eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && removida) {
        const item = removida
        const pos = posicao
        setGarantias(prev => {
          const copia = [...prev]
          copia.splice(Math.min(pos, copia.length), 0, item)
          return copia
        })
        toast.error('Não foi possível excluir a garantia na nuvem.')
      }
    })
  }

  return { garantias, adicionarGarantia, editarGarantia, removerGarantia }
}
