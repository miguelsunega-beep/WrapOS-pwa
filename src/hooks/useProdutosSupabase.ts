import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Produto } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

/** Chave de flag "já migrei os produtos locais dessa loja pro Supabase" — escopada por lojaId. */
const migracaoFeitaKey = (lojaId: string) => `wrapos_produtos_migrados_${lojaId}`

function normalizarProduto(row: Record<string, unknown>): Produto {
  return {
    id:            row.id as string,
    nome:          row.nome as string,
    sku:           row.sku as string,
    categoria:     row.categoria as string,
    fornecedor:    row.fornecedor as string,
    quantidade:    row.quantidade as number,
    minimo:        row.minimo as number,
    unidade:       row.unidade as string,
    valorUnitario: row.valorUnitario as number,
  }
}

function paraLinha(id: string, lojaId: string, p: Omit<Produto, 'id'>) {
  return {
    id, lojaId,
    nome: p.nome, sku: p.sku, categoria: p.categoria, fornecedor: p.fornecedor,
    quantidade: p.quantidade, minimo: p.minimo, unidade: p.unidade, valorUnitario: p.valorUnitario,
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

    async function migrarSeNecessario() {
      if (localStorage.getItem(migracaoFeitaKey(lojaId)) === '1') return

      let locais: Produto[] = []
      try {
        locais = JSON.parse(localStorage.getItem(`wrapos_perfil_${lojaId}_produtos`) ?? '[]')
      } catch {
        locais = []
      }

      if (locais.length === 0) {
        localStorage.setItem(migracaoFeitaKey(lojaId), '1')
        return
      }

      const { data: existentes, error: erroBusca } = await supabase
        .from('produtos')
        .select('id')
        .eq('lojaId', lojaId)

      if (erroBusca) {
        toast.error('Não foi possível verificar produtos já migrados para a nuvem. Tentando de novo na próxima vez.')
        return
      }

      const idsExistentes = new Set((existentes ?? []).map(r => r.id as string))
      const faltando = locais.filter(p => !idsExistentes.has(p.id))

      if (faltando.length > 0) {
        const { error: erroInsert } = await supabase
          .from('produtos')
          .insert(faltando.map(p => paraLinha(p.id, lojaId, p)))

        if (erroInsert) {
          toast.error('Falha ao migrar produtos salvos localmente para a nuvem.')
          return
        }
      }

      localStorage.setItem(migracaoFeitaKey(lojaId), '1')
    }

    async function carregar() {
      await migrarSeNecessario()
      if (cancelado) return

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

  /** Aplica um patch de quantidade calculado a partir do valor atual (functional update, evita closure obsoleta). */
  const ajustarQuantidade = (id: string, calcularNovaQuantidade: (atual: number) => number) => {
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

  const registrarEntradaEstoque = (id: string, qtd: number) =>
    ajustarQuantidade(id, atual => atual + qtd)

  const baixarEstoque = (id: string, qtd: number, _motivo?: string) =>
    ajustarQuantidade(id, atual => Math.max(0, atual - qtd))

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

  return { produtos, adicionarProduto, editarProduto, registrarEntradaEstoque, baixarEstoque, removerProduto }
}
