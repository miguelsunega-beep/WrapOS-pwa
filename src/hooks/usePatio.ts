import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { isOSAtrasada } from '../lib/osStatus'
import { getStatusEfetivo } from '../lib/agendamentoStatus'
import type { OrdemServico, StatusOS } from '../types'

const ACTIVE_STATUSES: StatusOS[] = ['em_andamento', 'aguardando_material', 'aguardando_aprovacao']

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v)

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface CarroNoPatio extends OrdemServico {
  atrasada: boolean
}

export interface ConcluidaHojeItem extends OrdemServico {
  valorTotalStr: string
}

export function usePatio() {
  const navigate = useNavigate()
  const {
    ordens, clientes, veiculos, agendamentos, instaladores, servicos,
    lancamentos, configuracoes,
  } = useApp()

  const todayStr = toDateStr(new Date())

  // Refresh atrasados counter every minute
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // Derived data
  const carrosNoPatio: CarroNoPatio[] = ordens
    .filter(o => ACTIVE_STATUSES.includes(o.status))
    .sort((a, b) => new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime())
    .map(o => ({ ...o, atrasada: isOSAtrasada(o) }))

  const noPatioCount   = carrosNoPatio.length
  const atrasadosCount = carrosNoPatio.filter(o => o.atrasada).length

  const faturamentoHojeStr = fmt(
    lancamentos
      .filter(l => l.tipo === 'entrada' && l.data === todayStr)
      .reduce((s, l) => s + l.valor, 0)
  )

  const todayAgendamentos = agendamentos
    .filter(a => {
      if (a.data !== todayStr) return false
      const ef = getStatusEfetivo(a, ordens)
      return ef === 'agendado' || ef === 'em_andamento'
    })
    .sort((a, b) => a.horario.localeCompare(b.horario))

  const concluidasHoje: ConcluidaHojeItem[] = ordens
    .filter(o => o.status === 'concluido' && o.dataFinalizacao === todayStr)
    .map(o => ({ ...o, valorTotalStr: fmt(o.valorTotal) }))

  // Lookups
  const getCliente    = (id: string) => clientes.find(c => c.id === id) ?? null
  const getVeiculo    = (id: string) => veiculos.find(v => v.id === id) ?? null
  const getInstalador = (id: string) => instaladores.find(i => i.id === id) ?? null
  const getServico    = (id: string) => servicos.find(s => s.id === id)

  // Drawer — holds business data, synced when ordens update
  const [drawerOS, setDrawerOS] = useState<OrdemServico | null>(null)

  useEffect(() => {
    setDrawerOS(prev => {
      if (!prev) return prev
      const updated = ordens.find(o => o.id === prev.id)
      return updated ?? prev
    })
  }, [ordens])

  const abrirDrawer  = (os: OrdemServico) => setDrawerOS(os)
  const fecharDrawer = () => setDrawerOS(null)

  // Confirm-concluir modal
  const [concluirOSData, setConcluirOSData] = useState<OrdemServico | null>(null)

  const handleOpenConfirm = (osId: string) => {
    const os = ordens.find(o => o.id === osId) ?? null
    setDrawerOS(null)
    setConcluirOSData(os)
  }
  const fecharConcluir = () => setConcluirOSData(null)

  // Navigation
  const irParaFinanceiro  = () => navigate('/financeiro')
  const irParaAgendamento = () => navigate('/agendamento')

  return {
    carrosNoPatio,
    noPatioCount,
    atrasadosCount,
    faturamentoHojeStr,
    todayAgendamentos,
    concluidasHoje,
    getCliente,
    getVeiculo,
    getInstalador,
    getServico,
    drawerOS,
    abrirDrawer,
    fecharDrawer,
    concluirOSData,
    handleOpenConfirm,
    fecharConcluir,
    instaladores,
    numeroBoxes: configuracoes.numeroBoxes,
    irParaFinanceiro,
    irParaAgendamento,
  }
}
