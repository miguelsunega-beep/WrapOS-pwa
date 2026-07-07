import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Servico } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

/** Chave de flag "já migrei os serviços locais dessa loja pro Supabase" — escopada por lojaId. */
const migracaoFeitaKey = (lojaId: string) => `wrapos_servicos_migrados_${lojaId}`

function normalizarServico(row: Record<string, unknown>): Servico {
  return {
    id:           row.id as string,
    nome:         row.nome as string,
    preco:        (row.preco as number | null) ?? undefined,
    tempEstimado: (row.tempEstimado as number | null) ?? undefined,
    duracaoDias:  (row.duracaoDias as number | null) ?? undefined,
  }
}

function paraLinha(id: string, lojaId: string, s: Omit<Servico, 'id'>) {
  return {
    id, lojaId,
    nome: s.nome, preco: s.preco ?? null, tempEstimado: s.tempEstimado ?? null, duracaoDias: s.duracaoDias ?? null,
  }
}

/**
 * Fonte de dados de `servicos` — décima primeira e última entidade migrada de
 * localStorage pro Supabase nesta fase (ver CLAUDE.md, "Migração de
 * entidades pro Supabase"), seguindo o mesmo modelo de useVeiculosSupabase.ts.
 */
export function useServicosSupabase(lojaId: string) {
  const [servicos, setServicos] = useState<Servico[]>([])

  useEffect(() => {
    let cancelado = false

    async function migrarSeNecessario() {
      if (localStorage.getItem(migracaoFeitaKey(lojaId)) === '1') return

      let locais: Servico[] = []
      try {
        locais = JSON.parse(localStorage.getItem(`wrapos_perfil_${lojaId}_servicos`) ?? '[]')
      } catch {
        locais = []
      }

      if (locais.length === 0) {
        localStorage.setItem(migracaoFeitaKey(lojaId), '1')
        return
      }

      const { data: existentes, error: erroBusca } = await supabase
        .from('servicos')
        .select('id')
        .eq('lojaId', lojaId)

      if (erroBusca) {
        toast.error('Não foi possível verificar serviços já migrados para a nuvem. Tentando de novo na próxima vez.')
        return
      }

      const idsExistentes = new Set((existentes ?? []).map(r => r.id as string))
      const faltando = locais.filter(s => !idsExistentes.has(s.id))

      if (faltando.length > 0) {
        const { error: erroInsert } = await supabase
          .from('servicos')
          .insert(faltando.map(s => paraLinha(s.id, lojaId, s)))

        if (erroInsert) {
          toast.error('Falha ao migrar serviços salvos localmente para a nuvem.')
          return
        }
      }

      localStorage.setItem(migracaoFeitaKey(lojaId), '1')
    }

    async function carregar() {
      await migrarSeNecessario()
      if (cancelado) return

      const { data, error } = await supabase.from('servicos').select('*').eq('lojaId', lojaId)
      if (cancelado) return

      if (error) {
        toast.error('Não foi possível carregar os serviços. Verifique sua conexão.')
        return
      }
      setServicos((data ?? []).map(normalizarServico))
    }

    carregar()
    return () => { cancelado = true }
  }, [lojaId])

  const adicionarServico = (s: Omit<Servico, 'id'>): void => {
    const id = uid()
    setServicos(prev => [...prev, { ...s, id }])

    supabase.from('servicos').insert(paraLinha(id, lojaId, s)).then(({ error }) => {
      if (error) {
        setServicos(prev => prev.filter(x => x.id !== id))
        toast.error('Não foi possível salvar o serviço na nuvem. Tente novamente.')
      }
    })
  }

  const editarServico = (id: string, patch: Partial<Omit<Servico, 'id'>>) => {
    let anterior: Servico | undefined
    setServicos(prev => prev.map(x => {
      if (x.id !== id) return x
      anterior = x
      return { ...x, ...patch }
    }))

    supabase.from('servicos').update(patch).eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && anterior) {
        const snapshot = anterior
        setServicos(prev => prev.map(x => x.id === id ? snapshot : x))
        toast.error('Não foi possível salvar a alteração do serviço na nuvem.')
      }
    })
  }

  const removerServico = (id: string) => {
    let removido: Servico | undefined
    let posicao = -1
    setServicos(prev => {
      posicao = prev.findIndex(x => x.id === id)
      removido = prev[posicao]
      return prev.filter(x => x.id !== id)
    })

    supabase.from('servicos').delete().eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && removido) {
        const item = removido
        const pos = posicao
        setServicos(prev => {
          const copia = [...prev]
          copia.splice(Math.min(pos, copia.length), 0, item)
          return copia
        })
        toast.error('Não foi possível excluir o serviço na nuvem.')
      }
    })
  }

  return { servicos, adicionarServico, editarServico, removerServico }
}
