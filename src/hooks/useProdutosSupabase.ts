import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Produto, TipoControleEstoque, TipoMovimentacaoEstoque } from '../types'

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
 * precisam de um hook separado, só de uma chamada diferente de
 * `editarProduto`: em vez de update direto, passam por
 * supabase.rpc('ajustar_estoque_atomica', ...) (migration 019), que grava
 * quantidade + a linha de histórico em movimentacoes_estoque na mesma
 * transação. `usuarioId` só é usado pra essa gravação (quem fez o ajuste).
 */
export function useProdutosSupabase(lojaId: string, usuarioId: string) {
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
   * Aplica um delta de quantidade (sinal natural: positivo = entrada, negativo = saída)
   * via supabase.rpc('ajustar_estoque_atomica', ...) (migration 019) — grava
   * produtos.quantidade + a linha de histórico em movimentacoes_estoque numa única
   * transação, com o mesmo clamp (nunca abaixo de 0) que o client já aplicava. Estado
   * local atualizado otimisticamente primeiro (functional update, evita closure
   * obsoleta), revertido se a RPC falhar.
   */
  const ajustarQuantidade = (id: string, delta: number, tipo: TipoMovimentacaoEstoque, motivo?: string) => {
    let anterior: Produto | undefined
    setProdutos(prev => prev.map(x => {
      if (x.id !== id) return x
      anterior = x
      return { ...x, quantidade: Math.max(0, x.quantidade + delta) }
    }))
    if (anterior === undefined) return

    supabase.rpc('ajustar_estoque_atomica', {
      p_produto_id: id,
      p_loja_id: lojaId,
      p_movimentacao_id: uid(),
      p_tipo: tipo,
      p_delta: delta,
      p_motivo: motivo ?? null,
      p_usuario_id: usuarioId,
    }).then(({ error }) => {
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
    ajustarQuantidade(id, qtd, 'entrada')

  const baixarEstoque = (id: string, qtd: number, motivo?: string) =>
    ajustarQuantidade(id, -qtd, 'saida', motivo)

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
        // 23503 = foreign_key_violation — FK de movimentacoes_estoque pra produtos é
        // ON DELETE RESTRICT (migration 022): produto com histórico não pode ser
        // excluído. Sem tela de inativação equivalente à de Cliente aqui de propósito
        // (ver migration 022) — só traduz o erro em vez de deixar a mensagem genérica.
        toast.error(
          error.code === '23503'
            ? 'Este produto tem histórico de movimentação e não pode ser excluído.'
            : 'Não foi possível excluir o produto na nuvem.'
        )
      }
    })
  }

  return { produtos, adicionarProduto, editarProduto, registrarEntradaEstoque, baixarEstoque, removerProduto, aplicarDeltasLocal }
}
