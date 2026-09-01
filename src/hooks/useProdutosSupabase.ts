import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Produto, TipoControleEstoque } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

// quantidade/minimo/quantidadeOriginal são numeric(10,2) no Postgres (migration 014) —
// confirmado empiricamente que essa coluna volta como number nativo via PostgREST neste
// projeto (não string, ao contrário de bigint), então `as number` já é seguro aqui, sem
// precisar de parseFloat/Number() extra.
function normalizarProduto(row: Record<string, unknown>): Produto {
  return {
    id:                 row.id as string,
    nome:               row.nome as string,
    sku:                row.sku as string,
    categoria:          row.categoria as string,
    fornecedor:         row.fornecedor as string,
    quantidade:         row.quantidade as number,
    minimo:             row.minimo as number,
    unidade:            row.unidade as string,
    valorUnitario:      row.valorUnitario as number,
    tipoControle:       row.tipoControle as TipoControleEstoque,
    quantidadeOriginal: row.quantidadeOriginal as number | undefined,
    isRetalho:          row.isRetalho as boolean,
  }
}

function paraLinha(id: string, lojaId: string, p: Omit<Produto, 'id'>) {
  return {
    id, lojaId,
    nome: p.nome, sku: p.sku, categoria: p.categoria, fornecedor: p.fornecedor,
    quantidade: p.quantidade, minimo: p.minimo, unidade: p.unidade, valorUnitario: p.valorUnitario,
    tipoControle: p.tipoControle, quantidadeOriginal: p.quantidadeOriginal, isRetalho: p.isRetalho,
  }
}

/**
 * Fonte de dados de `produtos` — quarta entidade migrada de localStorage pro
 * Supabase (ver CLAUDE.md, "Migração de entidades pro Supabase"), seguindo o
 * mesmo modelo de useVeiculosSupabase.ts. `registrarEntradaEstoque` e
 * `baixarEstoque` são mutações otimistas na mesma coluna `quantidade` — não
 * precisam de um hook separado, só de um patch parcial diferente de
 * `editarProduto`.
 */
export function useProdutosSupabase(lojaId: string) {
  const [produtos, setProdutos] = useState<Produto[]>([])

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      const { data, error } = await supabase.from('produtos').select('*').eq('lojaId', lojaId)
      if (cancelado) return

      if (error) {
        toast.error('Não foi possível carregar os produtos. Verifique sua conexão.')
        return
      }
      setProdutos((data ?? []).map(normalizarProduto))
    }

    carregar()
    return () => { cancelado = true }
  }, [lojaId])

  const adicionarProduto = (p: Omit<Produto, 'id'>): void => {
    const id = uid()
    setProdutos(prev => [...prev, { ...p, id }])

    supabase.from('produtos').insert(paraLinha(id, lojaId, p)).then(({ error }) => {
      if (error) {
        setProdutos(prev => prev.filter(x => x.id !== id))
        toast.error('Não foi possível salvar o produto na nuvem. Tente novamente.')
      }
    })
  }

  const editarProduto = (id: string, patch: Partial<Omit<Produto, 'id'>>) => {
    let anterior: Produto | undefined
    setProdutos(prev => prev.map(x => {
      if (x.id !== id) return x
      anterior = x
      return { ...x, ...patch }
    }))

    supabase.from('produtos').update(patch).eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && anterior) {
        const snapshot = anterior
        setProdutos(prev => prev.map(x => x.id === id ? snapshot : x))
        toast.error('Não foi possível salvar a alteração do produto na nuvem.')
      }
    })
  }

  /**
   * Aplica um patch de quantidade calculado a partir do valor atual (functional update,
   * evita closure obsoleta). `motivo` (só relevante pra baixa, ver baixarEstoque) chega
   * até aqui — onde o ajuste de fato acontece — mas ainda não é persistido em lugar
   * nenhum; ver comentário em baixarEstoque.
   */
  const ajustarQuantidade = (id: string, calcularNovaQuantidade: (atual: number) => number, motivo?: string) => {
    void motivo
    let anterior: Produto | undefined
    let novaQuantidade: number | undefined
    setProdutos(prev => prev.map(x => {
      if (x.id !== id) return x
      anterior = x
      novaQuantidade = calcularNovaQuantidade(x.quantidade)
      return { ...x, quantidade: novaQuantidade }
    }))
    if (anterior === undefined || novaQuantidade === undefined) return

    supabase.from('produtos').update({ quantidade: novaQuantidade }).eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && anterior) {
        const snapshot = anterior
        setProdutos(prev => prev.map(x => x.id === id ? snapshot : x))
        toast.error('Não foi possível atualizar o estoque na nuvem.')
      }
    })
  }

  /**
   * Aplica vários deltas de quantidade de uma vez, só no estado local, sem
   * chamada de rede — usado pela conclusão atômica de OS (ver concluirOS em
   * AppContext.tsx), que já gravou as baixas via
   * supabase.rpc('concluir_os_atomica', ...) numa única transação. Mesma
   * semântica de delta da função SQL: positivo baixa, negativo devolve
   * (`quantidade - delta`), sempre clampado em 0 (GREATEST(0, ...) no SQL,
   * Math.max(0, ...) aqui — inofensivo quando o delta é negativo, já que o
   * resultado só aumenta nesse caso).
   */
  const aplicarDeltasLocal = (deltas: { produtoId: string; delta: number }[]) => {
    if (deltas.length === 0) return
    const deltaPorProduto = new Map(deltas.map(d => [d.produtoId, d.delta]))
    setProdutos(prev => prev.map(p => {
      const delta = deltaPorProduto.get(p.id)
      return delta === undefined ? p : { ...p, quantidade: Math.max(0, p.quantidade - delta) }
    }))
  }

  const registrarEntradaEstoque = (id: string, qtd: number) =>
    ajustarQuantidade(id, atual => atual + qtd)

  /**
   * `motivo` não é persistido ainda — não existe tabela de histórico de movimentação de
   * estoque hoje (movimentos_estoque, "Alternativa B" do plano de otimização de Estoque).
   * Fica de passagem até ajustarQuantidade só pra já existir a costura de onde ele entra
   * no fluxo; vira um INSERT real quando essa tabela for criada.
   */
  const baixarEstoque = (id: string, qtd: number, motivo?: string) =>
    ajustarQuantidade(id, atual => Math.max(0, atual - qtd), motivo)

  const removerProduto = (id: string) => {
    let removido: Produto | undefined
    let posicao = -1
    setProdutos(prev => {
      posicao = prev.findIndex(x => x.id === id)
      removido = prev[posicao]
      return prev.filter(x => x.id !== id)
    })

    supabase.from('produtos').delete().eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && removido) {
        const item = removido
        const pos = posicao
        setProdutos(prev => {
          const copia = [...prev]
          copia.splice(Math.min(pos, copia.length), 0, item)
          return copia
        })
        toast.error('Não foi possível excluir o produto na nuvem.')
      }
    })
  }

  return { produtos, adicionarProduto, editarProduto, registrarEntradaEstoque, baixarEstoque, removerProduto, aplicarDeltasLocal }
}
