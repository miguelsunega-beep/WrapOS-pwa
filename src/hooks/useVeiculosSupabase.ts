import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Veiculo } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

function normalizarVeiculo(row: Record<string, unknown>): Veiculo {
  return {
    id:        row.id as string,
    clienteId: row.clienteId as string,
    marca:     row.marca as string,
    modelo:    row.modelo as string,
    ano:       row.ano as number,
    cor:       row.cor as string,
    placa:     row.placa as string,
  }
}

function paraLinha(id: string, lojaId: string, v: Omit<Veiculo, 'id'>) {
  return {
    id, lojaId,
    clienteId: v.clienteId, marca: v.marca, modelo: v.modelo,
    ano: v.ano, cor: v.cor, placa: v.placa,
  }
}

/**
 * Fonte de dados de `veiculos` — segunda entidade migrada de localStorage pro
 * Supabase (ver CLAUDE.md, "Migração de entidades pro Supabase"), seguindo o
 * mesmo modelo de useClientesSupabase.ts. Busca da loja atual ao montar,
 * expõe adicionar/editar/remover com atualização otimista (aplica local,
 * envia pro Supabase, reverte com toast de erro se falhar).
 */
export function useVeiculosSupabase(lojaId: string) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      const { data, error } = await supabase.from('veiculos').select('*').eq('lojaId', lojaId)
      if (cancelado) return

      if (error) {
        toast.error('Não foi possível carregar os veículos. Verifique sua conexão.')
        return
      }
      setVeiculos((data ?? []).map(normalizarVeiculo))
    }

    carregar()
    return () => { cancelado = true }
  }, [lojaId])

  const adicionarVeiculo = (v: Omit<Veiculo, 'id'>): string => {
    const id = uid()
    setVeiculos(prev => [...prev, { ...v, id }])

    supabase.from('veiculos').insert(paraLinha(id, lojaId, v)).then(({ error }) => {
      if (error) {
        setVeiculos(prev => prev.filter(x => x.id !== id))
        toast.error('Não foi possível salvar o veículo na nuvem. Tente novamente.')
      }
    })

    return id
  }

  /**
   * Versão awaited de adicionarVeiculo — ver mesmo motivo em
   * adicionarClienteSequencial (useClientesSupabase.ts). Só atualiza o estado
   * local depois do insert confirmado no Supabase; rejeita sem tocar no
   * estado local se falhar (ex: clienteId ainda não existe na FK composta).
   */
  const adicionarVeiculoSequencial = async (v: Omit<Veiculo, 'id'>): Promise<string> => {
    const id = uid()
    const { error } = await supabase.from('veiculos').insert(paraLinha(id, lojaId, v))
    if (error) throw new Error('Não foi possível criar o veículo.')
    setVeiculos(prev => [...prev, { ...v, id }])
    return id
  }

  const editarVeiculo = (id: string, patch: Partial<Omit<Veiculo, 'id'>>) => {
    let anterior: Veiculo | undefined
    setVeiculos(prev => prev.map(x => {
      if (x.id !== id) return x
      anterior = x
      return { ...x, ...patch }
    }))

    supabase.from('veiculos').update(patch).eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && anterior) {
        const snapshot = anterior
        setVeiculos(prev => prev.map(x => x.id === id ? snapshot : x))
        toast.error('Não foi possível salvar a alteração do veículo na nuvem.')
      }
    })
  }

  const removerVeiculo = (id: string) => {
    let removido: Veiculo | undefined
    let posicao = -1
    setVeiculos(prev => {
      posicao = prev.findIndex(x => x.id === id)
      removido = prev[posicao]
      return prev.filter(x => x.id !== id)
    })

    supabase.from('veiculos').delete().eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && removido) {
        const item = removido
        const pos = posicao
        setVeiculos(prev => {
          const copia = [...prev]
          copia.splice(Math.min(pos, copia.length), 0, item)
          return copia
        })
        toast.error('Não foi possível excluir o veículo na nuvem.')
      }
    })
  }

  return { veiculos, adicionarVeiculo, adicionarVeiculoSequencial, editarVeiculo, removerVeiculo }
}
