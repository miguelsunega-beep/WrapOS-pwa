import { useState } from 'react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'

const mesAtual = new Date().toISOString().slice(0, 7)

export const diasRestantes = (() => {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate() - t.getDate()
})()

export const mesLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const MEDALHAS = ['🥇', '🥈', '🥉', '4º', '5º', '6º', '7º', '8º', '9º']

interface MetaForm { faturamento: string; numeroOS: string; ticketMedio: string; novosClientes: string }

export interface MetaCard {
  titulo: string
  atual: number
  meta: number
  pct: number
  display: (v: number) => string
  cor: string
}

export interface RankingItem {
  id: string
  nome: string
  osMes: number
  faturado: number
  faturadoStr: string
  posicao: string
}

export function useMetas() {
  const { meta, ordens, clientes, instaladores, atualizarMeta } = useApp()

  const osConcluidas = ordens.filter(
    o => o.status === 'concluido' && o.dataFinalizacao?.startsWith(mesAtual)
  )
  const faturamento   = osConcluidas.reduce((s, o) => s + o.valorTotal, 0)
  const numOS         = osConcluidas.length
  const ticketMedio   = numOS > 0 ? faturamento / numOS : 0
  const novosClientes = clientes.filter(c => c.dataCadastro.startsWith(mesAtual)).length

  const ranking: RankingItem[] = instaladores
    .map(inst => {
      const instOS   = osConcluidas.filter(o => o.instaladorId === inst.id)
      const faturado = instOS.reduce((s, o) => s + o.valorTotal, 0)
      return { id: inst.id, nome: inst.nome, osMes: instOS.length, faturado }
    })
    .sort((a, b) => b.faturado - a.faturado)
    .map((item, i) => ({
      ...item,
      faturadoStr: fmtCurrency(item.faturado),
      posicao:     MEDALHAS[i] ?? `${i + 1}º`,
    }))

  const maxFaturado = ranking[0]?.faturado || 1

  const [form, setForm] = useState<MetaForm>({
    faturamento:   String(meta.faturamento),
    numeroOS:      String(meta.numeroOS),
    ticketMedio:   String(meta.ticketMedio),
    novosClientes: String(meta.novosClientes),
  })

  const resetForm = () => setForm({
    faturamento:   String(meta.faturamento),
    numeroOS:      String(meta.numeroOS),
    ticketMedio:   String(meta.ticketMedio),
    novosClientes: String(meta.novosClientes),
  })

  const salvarMeta = () => {
    atualizarMeta({
      faturamento:   Math.max(0, parseFloat(form.faturamento)  || 0),
      numeroOS:      Math.max(0, parseInt(form.numeroOS)        || 0),
      ticketMedio:   Math.max(0, parseFloat(form.ticketMedio)   || 0),
      novosClientes: Math.max(0, parseInt(form.novosClientes)   || 0),
    })
    toast.success('Metas atualizadas com sucesso!')
  }

  const metaCards: MetaCard[] = [
    {
      titulo:  'Faturamento Mensal',
      atual:   faturamento,
      meta:    meta.faturamento,
      pct:     meta.faturamento > 0 ? Math.round((faturamento / meta.faturamento) * 100) : 0,
      display: fmtCurrency,
      cor:     'from-accent to-pink-600',
    },
    {
      titulo:  'Número de OS',
      atual:   numOS,
      meta:    meta.numeroOS,
      pct:     meta.numeroOS > 0 ? Math.round((numOS / meta.numeroOS) * 100) : 0,
      display: (v: number) => `${v} OS`,
      cor:     'from-blue-500 to-cyan-500',
    },
    {
      titulo:  'Ticket Médio',
      atual:   ticketMedio,
      meta:    meta.ticketMedio,
      pct:     meta.ticketMedio > 0 ? Math.round((ticketMedio / meta.ticketMedio) * 100) : 0,
      display: fmtCurrency,
      cor:     'from-amber-500 to-orange-500',
    },
    {
      titulo:  'Novos Clientes',
      atual:   novosClientes,
      meta:    meta.novosClientes,
      pct:     meta.novosClientes > 0 ? Math.round((novosClientes / meta.novosClientes) * 100) : 0,
      display: (v: number) => `${v} clientes`,
      cor:     'from-purple-500 to-violet-600',
    },
  ]

  return {
    form,
    setForm,
    resetForm,
    salvarMeta,
    metaCards,
    ranking,
    maxFaturado,
    mesLabel,
    diasRestantes,
  }
}
