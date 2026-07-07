import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Agendamento } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

/** Chave de flag "já migrei os agendamentos locais dessa loja pro Supabase" — escopada por lojaId. */
const migracaoFeitaKey = (lojaId: string) => `wrapos_agendamentos_migrados_${lojaId}`

/** Datas voltam do Postgres como timestamp — normaliza de volta pra 'YYYY-MM-DD', mesmo padrão de dataCadastro/dataCriacao. */
function normalizarData(v: unknown): string | undefined {
  return v ? String(v).slice(0, 10) : undefined
}

function normalizarAgendamento(row: Record<string, unknown>): Agendamento {
  return {
    id:             row.id as string,
    clienteId:      row.clienteId as string,
    veiculoId:      row.veiculoId as string,
    servicoId:      row.servicoId as string,
    instaladorId:   row.instaladorId as string,
    box:            row.box as number,
    data:           normalizarData(row.data) as string,
    horario:        row.horario as string,
    duracao:        row.duracao as number,
    status:         row.status as Agendamento['status'],
    valor:          (row.valor as number | null) ?? undefined,
    reagendamentos: (row.reagendamentos as number | null) ?? undefined,
  }
}

function paraLinha(id: string, lojaId: string, a: Omit<Agendamento, 'id'>) {
  return {
    id, lojaId,
    clienteId: a.clienteId, veiculoId: a.veiculoId, servicoId: a.servicoId, instaladorId: a.instaladorId,
    box: a.box, data: a.data, horario: a.horario, duracao: a.duracao, status: a.status,
    valor: a.valor ?? null, reagendamentos: a.reagendamentos ?? null,
  }
}

/**
 * Fonte de dados de `agendamentos` — sexta entidade migrada de localStorage
 * pro Supabase (ver CLAUDE.md, "Migração de entidades pro Supabase"),
 * seguindo o mesmo modelo de useVeiculosSupabase.ts. Nenhuma FK real: `clienteId`/
 * `veiculoId`/`servicoId`/`instaladorId` continuam Strings soltas, mesmo
 * comportamento de antes em localStorage.
 */
export function useAgendamentosSupabase(lojaId: string) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])

  useEffect(() => {
    let cancelado = false

    async function migrarSeNecessario() {
      if (localStorage.getItem(migracaoFeitaKey(lojaId)) === '1') return

      let locais: Agendamento[] = []
      try {
        locais = JSON.parse(localStorage.getItem(`wrapos_perfil_${lojaId}_agendamentos`) ?? '[]')
      } catch {
        locais = []
      }

      if (locais.length === 0) {
        localStorage.setItem(migracaoFeitaKey(lojaId), '1')
        return
      }

      const { data: existentes, error: erroBusca } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('lojaId', lojaId)

      if (erroBusca) {
        toast.error('Não foi possível verificar agendamentos já migrados para a nuvem. Tentando de novo na próxima vez.')
        return
      }

      const idsExistentes = new Set((existentes ?? []).map(r => r.id as string))
      const faltando = locais.filter(a => !idsExistentes.has(a.id))

      if (faltando.length > 0) {
        const { error: erroInsert } = await supabase
          .from('agendamentos')
          .insert(faltando.map(a => paraLinha(a.id, lojaId, a)))

        if (erroInsert) {
          toast.error('Falha ao migrar agendamentos salvos localmente para a nuvem.')
          return
        }
      }

      localStorage.setItem(migracaoFeitaKey(lojaId), '1')
    }

    async function carregar() {
      await migrarSeNecessario()
      if (cancelado) return

      const { data, error } = await supabase.from('agendamentos').select('*').eq('lojaId', lojaId)
      if (cancelado) return

      if (error) {
        toast.error('Não foi possível carregar os agendamentos. Verifique sua conexão.')
        return
      }
      setAgendamentos((data ?? []).map(normalizarAgendamento))
    }

    carregar()
    return () => { cancelado = true }
  }, [lojaId])

  const adicionarAgendamento = (a: Omit<Agendamento, 'id'>): void => {
    const id = uid()
    setAgendamentos(prev => [...prev, { ...a, id }])

    supabase.from('agendamentos').insert(paraLinha(id, lojaId, a)).then(({ error }) => {
      if (error) {
        setAgendamentos(prev => prev.filter(x => x.id !== id))
        toast.error('Não foi possível salvar o agendamento na nuvem. Tente novamente.')
      }
    })
  }

  const editarAgendamento = (id: string, patch: Partial<Omit<Agendamento, 'id'>>) => {
    let anterior: Agendamento | undefined
    setAgendamentos(prev => prev.map(x => {
      if (x.id !== id) return x
      anterior = x
      return { ...x, ...patch }
    }))

    supabase.from('agendamentos').update(patch).eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && anterior) {
        const snapshot = anterior
        setAgendamentos(prev => prev.map(x => x.id === id ? snapshot : x))
        toast.error('Não foi possível salvar a alteração do agendamento na nuvem.')
      }
    })
  }

  const removerAgendamento = (id: string) => {
    let removido: Agendamento | undefined
    let posicao = -1
    setAgendamentos(prev => {
      posicao = prev.findIndex(x => x.id === id)
      removido = prev[posicao]
      return prev.filter(x => x.id !== id)
    })

    supabase.from('agendamentos').delete().eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && removido) {
        const item = removido
        const pos = posicao
        setAgendamentos(prev => {
          const copia = [...prev]
          copia.splice(Math.min(pos, copia.length), 0, item)
          return copia
        })
        toast.error('Não foi possível excluir o agendamento na nuvem.')
      }
    })
  }

  return { agendamentos, adicionarAgendamento, editarAgendamento, removerAgendamento }
}
