import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { isOSAtrasada } from '../lib/osStatus'
import { getStatusEfetivo } from '../lib/agendamentoStatus'
import { getEtapaPatio } from '../lib/patioEtapa'
import type { OrdemServico, StatusOS } from '../types'
import type { EtapaPatio } from '../lib/patioEtapa'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v)

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function iniciais(nome: string): string {
  return nome.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function computeProgresso(
  os: Pick<OrdemServico, 'status' | 'dataCriacao' | 'dataSaidaPrevista'>,
): { progresso: number; tempoLabel: string } {
  if (!os.dataSaidaPrevista) return { progresso: 0, tempoLabel: '' }
  const agora   = new Date()
  const prazo   = new Date(os.dataSaidaPrevista + 'T23:59:59')
  const criacao = new Date(os.dataCriacao + 'T00:00:00')

  if (isOSAtrasada(os, agora)) {
    const diff = Math.floor((agora.getTime() - prazo.getTime()) / 60000)
    if (diff < 60)   return { progresso: 100, tempoLabel: `atrasado há ${diff}min` }
    if (diff < 1440) return { progresso: 100, tempoLabel: `atrasado há ${Math.floor(diff / 60)}h` }
    const dias = Math.floor(diff / 1440)
    return { progresso: 100, tempoLabel: `atrasado há ${dias} dia${dias !== 1 ? 's' : ''}` }
  }

  const total   = prazo.getTime() - criacao.getTime()
  const elapsed = agora.getTime() - criacao.getTime()
  const progresso = total > 0 ? Math.min(99, Math.round((elapsed / total) * 100)) : 0

  const restante = Math.floor((prazo.getTime() - agora.getTime()) / 60000)
  if (restante < 60)   return { progresso, tempoLabel: `${restante}min restantes` }
  if (restante < 1440) return { progresso, tempoLabel: `${Math.floor(restante / 60)}h restantes` }
  const dias = Math.floor(restante / 1440)
  return { progresso, tempoLabel: `${dias} dia${dias !== 1 ? 's' : ''} restante${dias !== 1 ? 's' : ''}` }
}

// ── Public interfaces ──────────────────────────────────────────────

export interface KanbanCard extends OrdemServico {
  atrasada: boolean
  progresso: number
  tempoLabel: string
  clienteNome: string
  veiculoLabel: string
  servicoPrincipal: string
  instaladorNome: string
  instaladorIniciais: string
}

export interface CarrosPorEtapa {
  aguardando: KanbanCard[]
  execucao:   KanbanCard[]
  concluido:  KanbanCard[]
}

export interface ConcluidaHojeItem extends OrdemServico {
  valorTotalStr: string
}

// ── Hook ───────────────────────────────────────────────────────────

export function usePatio() {
  const navigate = useNavigate()
  const {
    ordens, clientes, veiculos, agendamentos, instaladores, servicos,
    lancamentos, configuracoes, mudarStatusOS, entregarVeiculo: appEntregarVeiculo,
  } = useApp()

  const todayStr = toDateStr(new Date())

  // Refresh atrasados counter every minute
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Kanban: 3 colunas ────────────────────────────────────────────
  const carrosPorEtapa = useMemo((): CarrosPorEtapa => {
    const result: CarrosPorEtapa = { aguardando: [], execucao: [], concluido: [] }
    const sortFn = (a: KanbanCard, b: KanbanCard) =>
      new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime()

    for (const o of ordens) {
      const etapa = getEtapaPatio(o.status, o.entregue)
      if (!etapa) continue

      const cliente    = clientes.find(c => c.id === o.clienteId)
      const veiculo    = veiculos.find(v => v.id === o.veiculoId)
      const instalador = instaladores.find(i => i.id === o.instaladorId)
      const { progresso, tempoLabel } = computeProgresso(o)

      const card: KanbanCard = {
        ...o,
        atrasada:           isOSAtrasada(o),
        progresso,
        tempoLabel,
        clienteNome:        cliente?.nome ?? '—',
        veiculoLabel:       veiculo ? `${veiculo.marca} ${veiculo.modelo} · ${veiculo.placa}` : '—',
        servicoPrincipal:   o.servicos[0]?.nome ?? '—',
        instaladorNome:     instalador?.nome ?? '—',
        instaladorIniciais: instalador ? iniciais(instalador.nome) : '?',
      }

      result[etapa].push(card)
    }

    result.aguardando.sort(sortFn)
    result.execucao.sort(sortFn)
    result.concluido.sort(sortFn)
    return result
  }, [ordens, clientes, veiculos, instaladores])

  const noPatioCount   = carrosPorEtapa.aguardando.length + carrosPorEtapa.execucao.length + carrosPorEtapa.concluido.length
  const atrasadosCount = [...carrosPorEtapa.aguardando, ...carrosPorEtapa.execucao].filter(c => c.atrasada).length

  // ── Mover etapa via DnD ou ação manual ───────────────────────────
  const moverEtapa = (osId: string, novaEtapa: EtapaPatio) => {
    if (novaEtapa === 'execucao') {
      mudarStatusOS(osId, 'em_andamento' as StatusOS)
    } else if (novaEtapa === 'aguardando') {
      mudarStatusOS(osId, 'aguardando_material' as StatusOS)
    }
    // 'concluido' nunca é chamado aqui — quem abre o ConcluirOSModal é o chamador
  }

  // ── Entregar veículo ────────────────────────────────────────────
  const entregarVeiculo = (osId: string) => appEntregarVeiculo(osId)

  // ── Financeiro / Agenda ─────────────────────────────────────────
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

  // ── Drawer ──────────────────────────────────────────────────────
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

  // ── ConcluirOS modal ────────────────────────────────────────────
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
    carrosPorEtapa,
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
    moverEtapa,
    entregarVeiculo,
    instaladores,
    numeroBoxes: configuracoes.numeroBoxes,
    irParaFinanceiro,
    irParaAgendamento,
  }
}
