import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Cliente } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

/** Chave de flag "já migrei os clientes locais dessa loja pro Supabase" — escopada por lojaId. */
const migracaoFeitaKey = (lojaId: string) => `wrapos_clientes_migrados_${lojaId}`

/** Coluna dataCadastro volta do Postgres como timestamp — normaliza de volta pra 'YYYY-MM-DD'. */
function normalizarCliente(row: Record<string, unknown>): Cliente {
  return {
    id:           row.id as string,
    nome:         row.nome as string,
    telefone:     row.telefone as string,
    email:        row.email as string,
    cpf:          row.cpf as string,
    comoConheceu: row.comoConheceu as string,
    dataCadastro: String(row.dataCadastro).slice(0, 10),
    totalGasto:   row.totalGasto as number,
    cidade:       (row.cidade as string | null) ?? undefined,
    status:       row.status as Cliente['status'],
  }
}

function paraLinha(id: string, lojaId: string, c: Omit<Cliente, 'id'>) {
  return {
    id, lojaId,
    nome: c.nome, telefone: c.telefone, email: c.email, cpf: c.cpf,
    comoConheceu: c.comoConheceu, dataCadastro: c.dataCadastro, totalGasto: c.totalGasto,
    cidade: c.cidade ?? null, status: c.status ?? 'ativo',
  }
}

/**
 * Fonte de dados de `clientes` — primeira entidade migrada de localStorage pro
 * Supabase (ver CLAUDE.md, seção "Migração de entidades pro Supabase", pro
 * modelo a seguir nas próximas). Busca da loja atual ao montar, expõe
 * adicionar/editar/remover com atualização otimista (aplica local, envia pro
 * Supabase, reverte com toast de erro se falhar), e faz upload único de
 * clientes que ainda estejam só no localStorage (namespace antigo por perfil).
 */
export function useClientesSupabase(lojaId: string) {
  const [clientes, setClientes] = useState<Cliente[]>([])

  useEffect(() => {
    let cancelado = false

    async function migrarSeNecessario() {
      if (localStorage.getItem(migracaoFeitaKey(lojaId)) === '1') return

      let locais: Cliente[] = []
      try {
        locais = JSON.parse(localStorage.getItem(`wrapos_perfil_${lojaId}_clientes`) ?? '[]')
      } catch {
        locais = []
      }

      if (locais.length === 0) {
        localStorage.setItem(migracaoFeitaKey(lojaId), '1')
        return
      }

      const { data: existentes, error: erroBusca } = await supabase
        .from('clientes')
        .select('id')
        .eq('lojaId', lojaId)

      if (erroBusca) {
        toast.error('Não foi possível verificar clientes já migrados para a nuvem. Tentando de novo na próxima vez.')
        return
      }

      const idsExistentes = new Set((existentes ?? []).map(r => r.id as string))
      const faltando = locais.filter(c => !idsExistentes.has(c.id))

      if (faltando.length > 0) {
        const { error: erroInsert } = await supabase
          .from('clientes')
          .insert(faltando.map(c => paraLinha(c.id, lojaId, c)))

        if (erroInsert) {
          toast.error('Falha ao migrar clientes salvos localmente para a nuvem.')
          return
        }
      }

      localStorage.setItem(migracaoFeitaKey(lojaId), '1')
    }

    async function carregar() {
      await migrarSeNecessario()
      if (cancelado) return

      const { data, error } = await supabase.from('clientes').select('*').eq('lojaId', lojaId)
      if (cancelado) return

      if (error) {
        toast.error('Não foi possível carregar os clientes. Verifique sua conexão.')
        return
      }
      setClientes((data ?? []).map(normalizarCliente))
    }

    carregar()
    return () => { cancelado = true }
  }, [lojaId])

  const adicionarCliente = (c: Omit<Cliente, 'id'>): string => {
    const id = uid()
    setClientes(prev => [...prev, { ...c, id }])

    supabase.from('clientes').insert(paraLinha(id, lojaId, c)).then(({ error }) => {
      if (error) {
        setClientes(prev => prev.filter(x => x.id !== id))
        toast.error('Não foi possível salvar o cliente na nuvem. Tente novamente.')
      }
    })

    return id
  }

  const editarCliente = (id: string, patch: Partial<Omit<Cliente, 'id'>>) => {
    let anterior: Cliente | undefined
    setClientes(prev => prev.map(x => {
      if (x.id !== id) return x
      anterior = x
      return { ...x, ...patch }
    }))

    supabase.from('clientes').update(patch).eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && anterior) {
        const snapshot = anterior
        setClientes(prev => prev.map(x => x.id === id ? snapshot : x))
        toast.error('Não foi possível salvar a alteração do cliente na nuvem.')
      }
    })
  }

  const removerCliente = (id: string) => {
    let removido: Cliente | undefined
    let posicao = -1
    setClientes(prev => {
      posicao = prev.findIndex(x => x.id === id)
      removido = prev[posicao]
      return prev.filter(x => x.id !== id)
    })

    supabase.from('clientes').delete().eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && removido) {
        const item = removido
        const pos = posicao
        setClientes(prev => {
          const copia = [...prev]
          copia.splice(Math.min(pos, copia.length), 0, item)
          return copia
        })
        toast.error('Não foi possível excluir o cliente na nuvem.')
      }
    })
  }

  return { clientes, adicionarCliente, editarCliente, removerCliente }
}
