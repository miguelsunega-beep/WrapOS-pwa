import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Instalador } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

/** Chave de flag "já migrei os instaladores locais dessa loja pro Supabase" — escopada por lojaId. */
const migracaoFeitaKey = (lojaId: string) => `wrapos_instaladores_migrados_${lojaId}`

function normalizarInstalador(row: Record<string, unknown>): Instalador {
  return {
    id:             row.id as string,
    nome:           row.nome as string,
    // `especialidades` é `String[]` no Postgres — confirmado via teste manual
    // contra o projeto DEV que supabase-js/PostgREST já retorna array nativo,
    // sem precisar de JSON.parse (mesmo comportamento de `servicos`/
    // `materiaisUsados` em ordens_servico, que também não precisam de parse).
    especialidades: row.especialidades as string[],
    comissaoPadrao: row.comissaoPadrao as number,
    ativo:          row.ativo as boolean,
  }
}

function paraLinha(id: string, lojaId: string, i: Omit<Instalador, 'id'>) {
  return {
    id, lojaId,
    nome: i.nome, especialidades: i.especialidades, comissaoPadrao: i.comissaoPadrao, ativo: i.ativo,
  }
}

/**
 * Fonte de dados de `instaladores` — sétima entidade migrada de localStorage
 * pro Supabase (ver CLAUDE.md, "Migração de entidades pro Supabase"),
 * seguindo o mesmo modelo de useVeiculosSupabase.ts.
 */
export function useInstaladoresSupabase(lojaId: string) {
  const [instaladores, setInstaladores] = useState<Instalador[]>([])

  useEffect(() => {
    let cancelado = false

    async function migrarSeNecessario() {
      if (localStorage.getItem(migracaoFeitaKey(lojaId)) === '1') return

      let locais: Instalador[] = []
      try {
        locais = JSON.parse(localStorage.getItem(`wrapos_perfil_${lojaId}_instaladores`) ?? '[]')
      } catch {
        locais = []
      }

      if (locais.length === 0) {
        localStorage.setItem(migracaoFeitaKey(lojaId), '1')
        return
      }

      const { data: existentes, error: erroBusca } = await supabase
        .from('instaladores')
        .select('id')
        .eq('lojaId', lojaId)

      if (erroBusca) {
        toast.error('Não foi possível verificar instaladores já migrados para a nuvem. Tentando de novo na próxima vez.')
        return
      }

      const idsExistentes = new Set((existentes ?? []).map(r => r.id as string))
      const faltando = locais.filter(i => !idsExistentes.has(i.id))

      if (faltando.length > 0) {
        const { error: erroInsert } = await supabase
          .from('instaladores')
          .insert(faltando.map(i => paraLinha(i.id, lojaId, i)))

        if (erroInsert) {
          toast.error('Falha ao migrar instaladores salvos localmente para a nuvem.')
          return
        }
      }

      localStorage.setItem(migracaoFeitaKey(lojaId), '1')
    }

    async function carregar() {
      await migrarSeNecessario()
      if (cancelado) return

      const { data, error } = await supabase.from('instaladores').select('*').eq('lojaId', lojaId)
      if (cancelado) return

      if (error) {
        toast.error('Não foi possível carregar os instaladores. Verifique sua conexão.')
        return
      }
      setInstaladores((data ?? []).map(normalizarInstalador))
    }

    carregar()
    return () => { cancelado = true }
  }, [lojaId])

  const adicionarInstalador = (i: Omit<Instalador, 'id'>): void => {
    const id = uid()
    setInstaladores(prev => [...prev, { ...i, id }])

    supabase.from('instaladores').insert(paraLinha(id, lojaId, i)).then(({ error }) => {
      if (error) {
        setInstaladores(prev => prev.filter(x => x.id !== id))
        toast.error('Não foi possível salvar o instalador na nuvem. Tente novamente.')
      }
    })
  }

  const editarInstalador = (id: string, patch: Partial<Omit<Instalador, 'id'>>) => {
    let anterior: Instalador | undefined
    setInstaladores(prev => prev.map(x => {
      if (x.id !== id) return x
      anterior = x
      return { ...x, ...patch }
    }))

    supabase.from('instaladores').update(patch).eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && anterior) {
        const snapshot = anterior
        setInstaladores(prev => prev.map(x => x.id === id ? snapshot : x))
        toast.error('Não foi possível salvar a alteração do instalador na nuvem.')
      }
    })
  }

  const removerInstalador = (id: string) => {
    let removido: Instalador | undefined
    let posicao = -1
    setInstaladores(prev => {
      posicao = prev.findIndex(x => x.id === id)
      removido = prev[posicao]
      return prev.filter(x => x.id !== id)
    })

    supabase.from('instaladores').delete().eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && removido) {
        const item = removido
        const pos = posicao
        setInstaladores(prev => {
          const copia = [...prev]
          copia.splice(Math.min(pos, copia.length), 0, item)
          return copia
        })
        toast.error('Não foi possível excluir o instalador na nuvem.')
      }
    })
  }

  return { instaladores, adicionarInstalador, editarInstalador, removerInstalador }
}
