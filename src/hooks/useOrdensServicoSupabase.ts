import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { OrdemServico } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

/** Datas voltam do Postgres como timestamp — normaliza de volta pra 'YYYY-MM-DD', mesmo padrão de dataCadastro em useClientesSupabase.ts. */
function normalizarData(v: unknown): string | undefined {
  return v ? String(v).slice(0, 10) : undefined
}

function normalizarOrdemServico(row: Record<string, unknown>): OrdemServico {
  return {
    id:                row.id as string,
    numero:            row.numero as number,
    clienteId:         row.clienteId as string,
    veiculoId:         row.veiculoId as string,
    servicos:          row.servicos as OrdemServico['servicos'],
    valorTotal:        row.valorTotal as number,
    formaPagamento:    row.formaPagamento as string,
    instaladorId:      row.instaladorId as string,
    box:               row.box as number,
    comissao:          row.comissao as number,
    observacoes:       row.observacoes as string,
    status:            row.status as OrdemServico['status'],
    statusPagamento:   (row.statusPagamento as OrdemServico['statusPagamento'] | null) ?? undefined,
    dataCriacao:       normalizarData(row.dataCriacao) as string,
    dataFinalizacao:   normalizarData(row.dataFinalizacao),
    dataSaidaPrevista: normalizarData(row.dataSaidaPrevista),
    agendamentoId:     (row.agendamentoId as string | null) ?? undefined,
    materiaisUsados:   (row.materiaisUsados as OrdemServico['materiaisUsados'] | null) ?? undefined,
    entregue:          (row.entregue as boolean | null) ?? undefined,
    dataSaida:         normalizarData(row.dataSaida),
  }
}

/** numero nunca entra aqui — é autoincrement no Postgres, nunca enviado no insert (ver adicionarOrdemServico). */
function paraLinha(id: string, lojaId: string, os: Omit<OrdemServico, 'id' | 'numero'>) {
  return {
    id, lojaId,
    clienteId: os.clienteId, veiculoId: os.veiculoId, servicos: os.servicos,
    valorTotal: os.valorTotal, formaPagamento: os.formaPagamento, instaladorId: os.instaladorId,
    box: os.box, comissao: os.comissao, observacoes: os.observacoes,
    status: os.status, statusPagamento: os.statusPagamento ?? null,
    dataCriacao: os.dataCriacao, dataFinalizacao: os.dataFinalizacao ?? null,
    dataSaidaPrevista: os.dataSaidaPrevista ?? null, agendamentoId: os.agendamentoId ?? null,
    materiaisUsados: os.materiaisUsados ?? null, entregue: os.entregue ?? null,
    dataSaida: os.dataSaida ?? null,
  }
}

/**
 * Fonte de dados de `ordens_servico` — terceira entidade migrada de
 * localStorage pro Supabase (ver CLAUDE.md, "Migração de entidades pro
 * Supabase"), seguindo o mesmo modelo de useClientesSupabase.ts /
 * useVeiculosSupabase.ts. Única diferença estrutural: `numero` é
 * autoincrement no Postgres (nunca enviado no insert — ver
 * adicionarOrdemServico), então o valor calculado localmente (mesmo
 * Math.max(...) + 1 de sempre) é otimista e é reconciliado com o valor real
 * assim que o insert retorna.
 */
export function useOrdensServicoSupabase(lojaId: string) {
  const [ordens, setOrdens] = useState<OrdemServico[]>([])

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      const { data, error } = await supabase.from('ordens_servico').select('*').eq('lojaId', lojaId)
      if (cancelado) return

      if (error) {
        toast.error('Não foi possível carregar as ordens de serviço. Verifique sua conexão.')
        return
      }
      setOrdens((data ?? []).map(normalizarOrdemServico))
    }

    carregar()
    return () => { cancelado = true }
  }, [lojaId])

  const adicionarOrdemServico = (os: Omit<OrdemServico, 'id' | 'numero'>): number => {
    const id = uid()
    const numerosValidos = ordens.map(o => Number(o.numero)).filter(n => !isNaN(n) && isFinite(n))
    const numeroOtimista = (numerosValidos.length > 0 ? Math.max(...numerosValidos) : 0) + 1

    setOrdens(prev => [...prev, { ...os, id, numero: numeroOtimista }])

    supabase
      .from('ordens_servico')
      .insert(paraLinha(id, lojaId, os))
      .select('numero')
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setOrdens(prev => prev.filter(x => x.id !== id))
          toast.error('Não foi possível salvar a ordem de serviço na nuvem. Tente novamente.')
          return
        }
        const numeroReal = data.numero as number
        if (numeroReal !== numeroOtimista) {
          setOrdens(prev => prev.map(x => x.id === id ? { ...x, numero: numeroReal } : x))
        }
      })

    return numeroOtimista
  }

  /**
   * Versão awaited de adicionarOrdemServico — ver mesmo motivo em
   * adicionarClienteSequencial (useClientesSupabase.ts). Só atualiza o estado
   * local depois do insert confirmado no Supabase, já com o numero real
   * (sem passo otimista intermediário); rejeita sem tocar no estado local se
   * falhar (ex: veiculoId ainda não existe na FK composta).
   */
  const adicionarOrdemServicoSequencial = async (os: Omit<OrdemServico, 'id' | 'numero'>): Promise<number> => {
    const id = uid()
    const { data, error } = await supabase
      .from('ordens_servico')
      .insert(paraLinha(id, lojaId, os))
      .select('numero')
      .single()
    if (error || !data) throw new Error('Não foi possível criar a ordem de serviço.')
    const numero = data.numero as number
    setOrdens(prev => [...prev, { ...os, id, numero }])
    return numero
  }

  const editarOrdemServico = (id: string, patch: Partial<Omit<OrdemServico, 'id'>>) => {
    let anterior: OrdemServico | undefined
    setOrdens(prev => prev.map(x => {
      if (x.id !== id) return x
      anterior = x
      return { ...x, ...patch }
    }))

    supabase.from('ordens_servico').update(patch).eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && anterior) {
        const snapshot = anterior
        setOrdens(prev => prev.map(x => x.id === id ? snapshot : x))
        toast.error('Não foi possível salvar a alteração da ordem de serviço na nuvem.')
      }
    })
  }

  const removerOrdemServico = (id: string) => {
    let removida: OrdemServico | undefined
    let posicao = -1
    setOrdens(prev => {
      posicao = prev.findIndex(x => x.id === id)
      removida = prev[posicao]
      return prev.filter(x => x.id !== id)
    })

    supabase.from('ordens_servico').delete().eq('id', id).eq('lojaId', lojaId).then(({ error }) => {
      if (error && removida) {
        const item = removida
        const pos = posicao
        setOrdens(prev => {
          const copia = [...prev]
          copia.splice(Math.min(pos, copia.length), 0, item)
          return copia
        })
        toast.error('Não foi possível excluir a ordem de serviço na nuvem.')
      }
    })
  }

  return { ordens, adicionarOrdemServico, adicionarOrdemServicoSequencial, editarOrdemServico, removerOrdemServico }
}
