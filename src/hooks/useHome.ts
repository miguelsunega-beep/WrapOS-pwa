import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getStatusEfetivo } from '../lib/agendamentoStatus'
import { getEtapaPatio } from '../lib/patioEtapa'
import { isOSAtrasada } from '../lib/osStatus'
import { todayLocal } from '../lib/dateUtils'

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

/** "Hoje" / "Amanhã" / abreviação tipo "Seg, 15" para datas mais distantes. */
function formatDiaRelativo(dataISO: string, hoje: string): string {
  if (dataISO === hoje) return 'Hoje'
  const amanha = new Date(hoje + 'T12:00:00')
  amanha.setDate(amanha.getDate() + 1)
  if (dataISO === amanha.toLocaleDateString('sv-SE')) return 'Amanhã'
  const d = new Date(dataISO + 'T12:00:00')
  const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  return `${diaSemana.charAt(0).toUpperCase()}${diaSemana.slice(1)}, ${d.getDate()}`
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
  /** Só preenchido para id === 'checkin' — agendamento de origem, usado pelo botão "Dar entrada". */
  agendamentoId?: string
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

export interface ProximoAgendamentoData {
  id: string
  diaLabel: string
  horario: string
  clienteVeiculo: string
  servicoNome: string
  statusLabel: string
  box: number
}

// ── Hook ───────────────────────────────────────────────────────────

export function useHome() {
  const navigate = useNavigate()
  const {
    ordens, agendamentos, produtos, lancamentos, meta,
    clientes, veiculos, instaladores, servicos, configuracoes,
  } = useApp()

  const agora      = new Date()
  const hoje       = todayLocal()
  const diasDoMes  = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
  const diasRestantes = diasDoMes - agora.getDate()

  // ── Meta ────────────────────────────────────────────────────────
  const metaMes      = meta.faturamento
  const metaDiariaOS = meta.numeroOS > 0 ? (meta.numeroOS / diasDoMes) : 1
  const metaVazia    = meta.faturamento === 0 && meta.numeroOS === 0

  // ── Sparklines (últimos 7 dias) ─────────────────────────────────
  const sparklines = useMemo(() => {
    const dias: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dias.push(d.toLocaleDateString('sv-SE'))
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

  const faturamentoMes = useMemo(
    () => ordens
      .filter(o => o.status === 'concluido' && (o.dataFinalizacao ?? '').slice(0, 7) === hoje.slice(0, 7))
      .reduce((s, o) => s + o.valorTotal, 0),
    [ordens, hoje],
  )

  const progresso = metaMes > 0 ? Math.min(100, Math.round((faturamentoMes / metaMes) * 100)) : 0
  const faltam    = Math.max(0, metaMes - faturamentoMes)

  // ── Pulso do pátio ──────────────────────────────────────────────
  // entregue === false → ainda no pátio (coluna Concluído do kanban)
  // entregue !== false → saiu; getEtapaPatio retorna null → não conta
  const pulso = useMemo((): PulsoData => {
    let aguardando = 0, execucao = 0, concluido = 0
    for (const o of ordens) {
      const etapa = getEtapaPatio(o.status, o.entregue)
      if      (etapa === 'aguardando') aguardando++
      else if (etapa === 'execucao')   execucao++
      else if (etapa === 'concluido')  concluido++
    }
    return { aguardando, execucao, concluido }
  }, [ordens])

  // KPI "Carros no pátio" = apenas ativos (aguardando + execução)
  const noPatioCount = pulso.aguardando + pulso.execucao

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
      label:         'Carros no pátio',
      value:         `${noPatioCount}`,
      variacaoPct:   0,
      variacaoLabel: 'no momento',
      sparkline:     Array(7).fill(noPatioCount),
      onClick:       () => navigate('/patio'),
    },
    {
      label:         'Concluídas hoje',
      value:         `${concluidasHoje}`,
      variacaoPct:   Math.round(((concluidasHoje - metaDiariaOS) / metaDiariaOS) * 100),
      variacaoLabel: `meta: ${Math.round(metaDiariaOS)}/dia`,
      sparkline:     sparklines.concluidas,
      onClick:       () => navigate('/ordens'),
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
        titulo:    `${criticos.length} ${criticos.length === 1 ? 'Item em estoque crítico' : 'Itens em estoque crítico'}`,
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
        agendamentoId: proximo.id,
      })
    }

    return result
  }, [ordens, produtos, agendamentos, veiculos, servicos, instaladores, hoje, navigate])

  // ── Próximo agendamento (qualquer data futura, não só hoje) ──────
  // Mesma lógica de seleção do card de destaque em useAgendamento.ts
  // (proximoAgendamento): status efetivo 'agendado' (cobre agendado e
  // confirmado — getStatusEfetivo não distingue os dois sem OS vinculada),
  // timestamp >= agora, mais próximo primeiro.
  const proximoAgendamento = useMemo((): ProximoAgendamentoData | null => {
    const nowHM = agora.toTimeString().slice(0, 5)
    const candidato = [...agendamentos]
      .filter(a => getStatusEfetivo(a, ordens) === 'agendado')
      .filter(a => a.data > hoje || (a.data === hoje && a.horario >= nowHM))
      .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))[0]

    if (!candidato) return null

    const cliente = clientes.find(c => c.id === candidato.clienteId)
    const veic    = veiculos.find(v => v.id === candidato.veiculoId)
    const servico = servicos.find(s => s.id === candidato.servicoId)

    const clienteVeiculo = [cliente?.nome, veic ? `${veic.modelo} ${veic.ano}` : null]
      .filter(Boolean).join(' · ') || '—'

    return {
      id:             candidato.id,
      diaLabel:       formatDiaRelativo(candidato.data, hoje),
      horario:        candidato.horario,
      clienteVeiculo,
      servicoNome:    servico?.nome ?? 'Serviço não definido',
      statusLabel:    candidato.status === 'confirmado' ? 'Confirmado' : 'Agendado',
      box:            candidato.box,
    }
  }, [agendamentos, ordens, clientes, veiculos, servicos, hoje, agora])

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
    metaVazia,
    metaMesStr:        fmt(metaMes),
    faturamentoMesStr: fmt(faturamentoMes),
    progresso,
    faltamStr:         fmt(faltam),
    diasRestantes,
    equipe,
    proximoAgendamento,
    irParaAgendamento: () => navigate('/agendamento'),
    irParaPatio:       () => navigate('/patio'),
    irParaNovaOS:      () => navigate('/ordens', { state: { novaOS: true } }),
    irParaMetas:       () => navigate('/metas'),
  }
}
