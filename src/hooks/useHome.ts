import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getStatusEfetivo } from '../lib/agendamentoStatus'
import { getEtapaPatio } from '../lib/patioEtapa'
import { isOSAtrasada } from '../lib/osStatus'

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function saudacaoHora(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function iniciais(nome: string): string {
  return nome.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function minutosAte(horario: string): number {
  const [hh, mm] = horario.split(':').map(Number)
  const agora = new Date()
  return (hh * 60 + (mm ?? 0)) - (agora.getHours() * 60 + agora.getMinutes())
}

function tempoAtrasado(dataSaida: string): string {
  const prazo = new Date(dataSaida + 'T23:59:59')
  const diff  = Math.floor((Date.now() - prazo.getTime()) / 60000)
  if (diff < 60)   return `${diff}min`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  const dias = Math.floor(diff / 1440)
  return `${dias} dia${dias !== 1 ? 's' : ''}`
}

// ── Public interfaces ──────────────────────────────────────────────

export type AcaoTema = 'red' | 'amber' | 'blue'

export interface AcaoEspecifica {
  id: 'atrasada' | 'critico' | 'checkin'
  badge: string
  tema: AcaoTema
  titulo: string
  descricao: string
  cta: string
  onClick: () => void
}

export interface KpiData {
  label: string
  value: string
  variacaoPct: number
  variacaoLabel: string
  sparkline: number[]
  onClick: () => void
}

export interface MembroEquipe {
  id: string
  nome: string
  iniciais: string
  ativo: number
  maxAtivo: number
}

export interface PulsoData {
  aguardando: number
  execucao: number
  concluido: number
}

export interface ProximaHoraItem {
  id: string
  horario: string
  veiculo: string
  servico: string
  responsavel: string
  statusTag: string
  statusTema: 'blue' | 'gray' | 'green' | 'red'
}

// ── Hook ───────────────────────────────────────────────────────────

export function useHome() {
  const navigate = useNavigate()
  const {
    ordens, agendamentos, produtos, lancamentos, meta,
    veiculos, instaladores, servicos, configuracoes,
  } = useApp()

  const agora      = new Date()
  const hoje       = agora.toISOString().slice(0, 10)
  const diasDoMes  = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
  const diasRestantes = diasDoMes - agora.getDate()

  // ── Meta ────────────────────────────────────────────────────────
  const metaAtual   = (meta.mes === agora.getMonth() + 1 && meta.ano === agora.getFullYear()) ? meta : null
  const metaMes     = metaAtual?.faturamento ?? 0
  const metaDiariaOS = (metaAtual?.numeroOS ?? 0) > 0 ? (metaAtual!.numeroOS / diasDoMes) : 1

  // ── Sparklines (últimos 7 dias) ─────────────────────────────────
  const sparklines = useMemo(() => {
    const dias: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dias.push(d.toISOString().slice(0, 10))
    }

    const receita = dias.map(d =>
      lancamentos
        .filter(l => l.tipo === 'entrada' && l.data === d)
        .reduce((s, l) => s + l.valor, 0),
    )
    const concluidas = dias.map(d =>
      ordens.filter(o => o.status === 'concluido' && o.dataFinalizacao === d).length,
    )
    const ticket = dias.map(d => {
      const comp = ordens.filter(o => o.status === 'concluido' && o.dataFinalizacao === d)
      return comp.length > 0 ? comp.reduce((s, o) => s + o.valorTotal, 0) / comp.length : 0
    })
    const faturMes = dias.map(d =>
      ordens
        .filter(o => o.status === 'concluido' && o.dataFinalizacao === d)
        .reduce((s, o) => s + o.valorTotal, 0),
    )

    return { receita, concluidas, ticket, faturMes }
  }, [lancamentos, ordens])

  // ── KPI scalars ─────────────────────────────────────────────────
  const receitaHoje    = sparklines.receita[6]    ?? 0
  const receitaOntem   = sparklines.receita[5]    ?? 0
  const concluidasHoje = sparklines.concluidas[6] ?? 0

  const ticketHoje = sparklines.ticket[6] ?? 0
  const ticketMedio7 = (() => {
    const vals = sparklines.ticket.slice(0, 6).filter(v => v > 0)
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
  })()

  const faturamentoMes = useMemo(
    () => ordens
      .filter(o => o.status === 'concluido' && (o.dataFinalizacao ?? '').slice(0, 7) === hoje.slice(0, 7))
      .reduce((s, o) => s + o.valorTotal, 0),
    [ordens, hoje],
  )

  const progresso = metaMes > 0 ? Math.min(100, Math.round((faturamentoMes / metaMes) * 100)) : 0
  const faltam    = Math.max(0, metaMes - faturamentoMes)

  // ── KPIs ────────────────────────────────────────────────────────
  const kpis: KpiData[] = [
    {
      label:         'Receita do dia',
      value:         fmt(receitaHoje),
      variacaoPct:   receitaOntem > 0 ? Math.round(((receitaHoje - receitaOntem) / receitaOntem) * 100) : 0,
      variacaoLabel: 'vs ontem',
      sparkline:     sparklines.receita,
      onClick:       () => navigate('/financeiro'),
    },
    {
      label:         'Concluídas hoje',
      value:         `${concluidasHoje} / ${Math.round(metaDiariaOS)}`,
      variacaoPct:   Math.round(((concluidasHoje - metaDiariaOS) / metaDiariaOS) * 100),
      variacaoLabel: 'vs meta diária',
      sparkline:     sparklines.concluidas,
      onClick:       () => navigate('/ordens'),
    },
    {
      label:         'Ticket médio',
      value:         fmt(ticketHoje > 0 ? ticketHoje : ticketMedio7),
      variacaoPct:   ticketMedio7 > 0 ? Math.round(((ticketHoje - ticketMedio7) / ticketMedio7) * 100) : 0,
      variacaoLabel: '7 dias',
      sparkline:     sparklines.ticket,
      onClick:       () => navigate('/financeiro'),
    },
    {
      label:         'Faturamento do mês',
      value:         fmt(faturamentoMes),
      variacaoPct:   progresso,
      variacaoLabel: `meta ${fmt(metaMes)}`,
      sparkline:     sparklines.faturMes,
      onClick:       () => navigate('/financeiro'),
    },
  ]

  // ── Pulso do pátio ──────────────────────────────────────────────
  const pulso = useMemo((): PulsoData => {
    let aguardando = 0, execucao = 0, concluido = 0
    for (const o of ordens) {
      const etapa = getEtapaPatio(o.status)
      if      (etapa === 'aguardando') aguardando++
      else if (etapa === 'execucao')   execucao++
      else if (etapa === 'concluido')  concluido++
    }
    return { aguardando, execucao, concluido }
  }, [ordens])

  // ── Carga da equipe ─────────────────────────────────────────────
  const equipe = useMemo((): MembroEquipe[] => {
    const cargas = instaladores
      .filter(i => i.ativo)
      .map(inst => ({
        id:       inst.id,
        nome:     inst.nome,
        iniciais: iniciais(inst.nome),
        ativo:    ordens.filter(
          o => o.instaladorId === inst.id && o.status !== 'concluido' && o.status !== 'cancelado',
        ).length,
      }))
    const maxAtivo = Math.max(...cargas.map(c => c.ativo), 1)
    return cargas
      .map(c => ({ ...c, maxAtivo }))
      .sort((a, b) => b.ativo - a.ativo)
  }, [instaladores, ordens])

  // ── Ações específicas ───────────────────────────────────────────
  const acoes = useMemo((): AcaoEspecifica[] => {
    const result: AcaoEspecifica[] = []

    // OS atrasada
    const atrasadas = ordens.filter(o => isOSAtrasada(o))
    if (atrasadas.length > 0) {
      const os = atrasadas[0]
      const v  = veiculos.find(vv => vv.id === os.veiculoId)
      const tempo = os.dataSaidaPrevista ? tempoAtrasado(os.dataSaidaPrevista) : ''
      const desc  = v
        ? `${v.marca} ${v.modelo}${tempo ? ` · prazo estourado há ${tempo}` : ''}`
        : 'prazo estourado'
      result.push({
        id:      'atrasada',
        badge:   'ATRASADA',
        tema:    'red',
        titulo:  `${atrasadas.length} OS atrasada${atrasadas.length > 1 ? 's' : ''}`,
        descricao: desc,
        cta:     'Resolver agora',
        onClick: () => navigate('/ordens'),
      })
    }

    // Estoque crítico
    const criticos = produtos.filter(p => p.quantidade <= p.minimo)
    if (criticos.length > 0) {
      const nomes = criticos.slice(0, 2).map(p => p.nome.split(' ').slice(0, 2).join(' ')).join(', ')
      const extra = criticos.length > 2 ? ` e +${criticos.length - 2}` : ''
      result.push({
        id:        'critico',
        badge:     'CRÍTICO',
        tema:      'amber',
        titulo:    `${criticos.length} ${criticos.length === 1 ? 'item em falta' : 'itens em falta'}`,
        descricao: `${nomes}${extra} abaixo do mínimo`,
        cta:       'Repor estoque',
        onClick:   () => navigate('/estoque'),
      })
    }

    // Próximo check-in (agendado hoje, status agendado, mais próximo no futuro)
    const proximo = agendamentos
      .filter(a => a.data === hoje && getStatusEfetivo(a, ordens) === 'agendado')
      .sort((a, b) => a.horario.localeCompare(b.horario))
      .find(a => minutosAte(a.horario) > 0)

    if (proximo) {
      const mins = minutosAte(proximo.horario)
      const v    = veiculos.find(vv => vv.id === proximo.veiculoId)
      const svc  = servicos.find(s => s.id  === proximo.servicoId)
      const inst = instaladores.find(i => i.id === proximo.instaladorId)
      const partes = [
        v    ? `${v.cor} ${v.modelo}`     : null,
        svc  ? svc.nome                   : null,
        inst ? inst.nome.split(' ')[0]    : null,
      ].filter(Boolean)
      const badge = mins < 60 ? `EM ${mins}MIN` : `EM ${Math.round(mins / 60)}H`
      result.push({
        id:        'checkin',
        badge,
        tema:      'blue',
        titulo:    'Próximo check-in',
        descricao: partes.join(' · '),
        cta:       'Preparar',
        onClick:   () => navigate('/agendamento'),
      })
    }

    return result
  }, [ordens, produtos, agendamentos, veiculos, servicos, instaladores, hoje, navigate])

  // ── Próximas horas ──────────────────────────────────────────────
  const proximasHoras = useMemo((): ProximaHoraItem[] =>
    agendamentos
      .filter(a => a.data === hoje)
      .sort((a, b) => a.horario.localeCompare(b.horario))
      .slice(0, 5)
      .map(a => {
        const v    = veiculos.find(vv => vv.id === a.veiculoId)
        const svc  = servicos.find(s  => s.id  === a.servicoId)
        const inst = instaladores.find(i => i.id === a.instaladorId)
        const ef   = getStatusEfetivo(a, ordens)

        let statusTag: string
        let statusTema: ProximaHoraItem['statusTema']

        if      (ef === 'concluido')     { statusTag = 'Entrega';       statusTema = 'green' }
        else if (ef === 'em_andamento')  { statusTag = 'Em andamento';  statusTema = 'blue'  }
        else if (ef === 'os_cancelada')  { statusTag = 'Cancelado';     statusTema = 'red'   }
        else {
          const mins = minutosAte(a.horario)
          statusTag  = mins > 0 && mins <= 90 ? 'Check-in' : 'Agendado'
          statusTema = mins > 0 && mins <= 90 ? 'blue'     : 'gray'
        }

        return {
          id:          a.id,
          horario:     a.horario,
          veiculo:     v    ? `${v.marca} ${v.modelo}` : 'Veículo',
          servico:     svc  ? svc.nome                 : '',
          responsavel: inst ? inst.nome                : '',
          statusTag,
          statusTema,
        }
      }),
  [agendamentos, hoje, veiculos, servicos, instaladores, ordens])

  // ── Return ──────────────────────────────────────────────────────
  const nomePerfil    = configuracoes.nomeLoja.split(' ')[0]
  const dataHojeLabel = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return {
    saudacao:          `${saudacaoHora()}, ${nomePerfil}`,
    dataHojeLabel,
    totalAtencao:      acoes.length,
    acoes,
    kpis,
    pulso,
    metaMes,
    metaMesStr:        fmt(metaMes),
    faturamentoMesStr: fmt(faturamentoMes),
    progresso,
    faltamStr:         fmt(faltam),
    diasRestantes,
    equipe,
    proximasHoras,
    irParaAgendamento: () => navigate('/agendamento'),
    irParaPatio:       () => navigate('/patio'),
    irParaNovaOS:      () => navigate('/ordens'),
  }
}
