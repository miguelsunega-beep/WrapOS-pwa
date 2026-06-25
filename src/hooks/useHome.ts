import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Clock, CheckCircle2, DollarSign, CalendarDays, Package, LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const ACTIVE_STATUSES = ['em_andamento', 'aguardando_material', 'aguardando_aprovacao'] as const

export interface Acao {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  onClick: () => void
}

export interface Kpi {
  label: string
  value: string
  color: string
  icon: LucideIcon
  bg: string
  onClick: () => void
}

export function useHome() {
  const navigate = useNavigate()
  const { ordens, agendamentos, produtos, lancamentos, meta, clientes } = useApp()

  const hoje = new Date().toISOString().slice(0, 10)

  const stats = useMemo(() => {
    const ativas = ordens.filter(o => (ACTIVE_STATUSES as readonly string[]).includes(o.status))
    const aguardandoMaterial  = ordens.filter(o => o.status === 'aguardando_material').length
    const aguardandoAprovacao = ordens.filter(o => o.status === 'aguardando_aprovacao').length
    const criticos = produtos.filter(p => p.quantidade <= p.minimo)
    const agsHoje  = agendamentos.filter(
      a => a.data === hoje && a.status !== 'concluido' && a.status !== 'cancelado'
    )
    const concluidasHoje = ordens.filter(o => o.status === 'concluido' && o.dataFinalizacao === hoje).length
    const concluidasMes  = ordens.filter(
      o => o.status === 'concluido' && (o.dataFinalizacao ?? '').slice(0, 7) === hoje.slice(0, 7)
    )
    const receitaHoje    = lancamentos
      .filter(l => l.tipo === 'entrada' && l.data === hoje)
      .reduce((s, l) => s + (l.valor ?? 0), 0)
    const faturamentoMes = concluidasMes.reduce((s, o) => s + (o.valorTotal ?? 0), 0)

    return {
      patio: ativas.length,
      aguardandoMaterial,
      aguardandoAprovacao,
      criticos,
      agsHoje,
      concluidasHoje,
      receitaHoje,
      faturamentoMes,
    }
  }, [ordens, agendamentos, produtos, lancamentos, hoje])

  const agora     = new Date()
  const metaAtual = (meta.mes === agora.getMonth() + 1 && meta.ano === agora.getFullYear()) ? meta : null
  const metaMes   = metaAtual?.faturamento ?? 0
  const progresso = metaMes > 0 ? Math.min(100, Math.round((stats.faturamentoMes / metaMes) * 100)) : 0

  const candidatasAcoes: Array<Acao & { show: boolean }> = [
    {
      show:    stats.aguardandoMaterial + stats.aguardandoAprovacao > 0,
      label:   'OS aguardando ação',
      value:   stats.aguardandoMaterial + stats.aguardandoAprovacao,
      hint:    'material ou aprovação pendente',
      icon:    Clock,
      onClick: () => navigate('/ordens'),
    },
    {
      show:    stats.criticos.length > 0,
      label:   'Itens em estoque crítico',
      value:   stats.criticos.length,
      hint:    'abaixo do mínimo',
      icon:    Package,
      onClick: () => navigate('/estoque'),
    },
    {
      show:    stats.agsHoje.length > 0,
      label:   'Agendamentos para hoje',
      value:   stats.agsHoje.length,
      hint:    'na agenda de hoje',
      icon:    CalendarDays,
      onClick: () => navigate('/agendamento'),
    },
  ]
  const acoes: Acao[] = candidatasAcoes.filter(a => a.show)

  const kpis: Kpi[] = [
    { label: 'Receita do dia',     value: fmt(stats.receitaHoje),       color: 'text-emerald-400', icon: DollarSign,   bg: 'bg-emerald-500/10', onClick: () => navigate('/financeiro') },
    { label: 'Carros no pátio',    value: String(stats.patio),          color: 'text-ui-text',     icon: Car,          bg: 'bg-surface-700',    onClick: () => navigate('/patio') },
    { label: 'Concluídas hoje',    value: String(stats.concluidasHoje), color: 'text-blue-400',    icon: CheckCircle2, bg: 'bg-blue-500/10',    onClick: () => navigate('/ordens') },
    { label: 'Faturamento do mês', value: fmt(stats.faturamentoMes),    color: 'text-ui-text',     icon: DollarSign,   bg: 'bg-surface-700',    onClick: () => navigate('/financeiro') },
  ]

  const clienteNome = (id: string) => clientes.find(c => c.id === id)?.nome ?? 'Cliente'

  return {
    stats,
    metaMes,
    metaMesStr:        fmt(metaMes),
    faturamentoMesStr: fmt(stats.faturamentoMes),
    progresso,
    acoes,
    kpis,
    clienteNome,
    irParaAgendamento: () => navigate('/agendamento'),
  }
}
