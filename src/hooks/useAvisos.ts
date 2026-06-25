import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Shield, Phone, LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'

const todayMS        = Date.now()
const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000

interface Alerta {
  id: string
  titulo: string
  mensagem: string
  onClick: () => void
}

export interface Secao {
  key: string
  label: string
  descricao: string
  iconCls: string
  bgCls: string
  badgeCls: string
  icon: LucideIcon
  alertas: Alerta[]
}

export function useAvisos() {
  const { produtos, garantias, clientes, ordens } = useApp()
  const navigate = useNavigate()

  const alertasEstoque: Alerta[] = produtos
    .filter(p => p.quantidade <= p.minimo)
    .map(p => ({
      id:       `est-${p.id}`,
      titulo:   'Estoque Crítico',
      mensagem: `${p.nome} — apenas ${p.quantidade} ${p.unidade}(s) restante(s). Mínimo configurado: ${p.minimo}`,
      onClick:  () => navigate('/estoque'),
    }))

  const alertasGarantia: Alerta[] = garantias
    .filter(g => {
      if (g.status !== 'ativa') return false
      const fim = new Date(g.dataFim + 'T12:00:00').getTime()
      return fim > todayMS && fim <= todayMS + TRINTA_DIAS_MS
    })
    .map(g => {
      const cliente = clientes.find(c => c.id === g.clienteId)
      const dias    = Math.round((new Date(g.dataFim + 'T12:00:00').getTime() - todayMS) / 86_400_000)
      return {
        id:       `gar-${g.id}`,
        titulo:   'Garantia Vencendo',
        mensagem: `${cliente?.nome ?? '—'} — ${g.servico} vence em ${dias} dia${dias !== 1 ? 's' : ''}`,
        onClick:  () => navigate('/garantia'),
      }
    })

  const alertasPosVenda: Alerta[] = clientes
    .filter(c => {
      const osC    = ordens.filter(o => o.clienteId === c.id && o.status !== 'cancelado')
      const ultima = osC
        .filter(o => o.status === 'concluido' && o.dataFinalizacao)
        .sort((a, b) => (b.dataFinalizacao ?? '').localeCompare(a.dataFinalizacao ?? ''))[0]
      if (!ultima?.dataFinalizacao) return false
      const diasDesde = (todayMS - new Date(ultima.dataFinalizacao + 'T00:00:00').getTime()) / 86_400_000
      if (diasDesde < 30) return false
      return !osC.some(o => o.dataCriacao > ultima.dataFinalizacao!)
    })
    .slice(0, 10)
    .map(c => ({
      id:       `pos-${c.id}`,
      titulo:   'Pós-venda Pendente',
      mensagem: `${c.nome} — sem nova OS há mais de 30 dias`,
      onClick:  () => navigate('/clientes'),
    }))

  const secoes: Secao[] = [
    {
      key:      'critico',
      label:    'Crítico',
      descricao: 'Itens que exigem ação imediata',
      iconCls:  'text-red-400',
      bgCls:    'bg-red-500/10',
      badgeCls: 'text-red-400 bg-red-500/10 border-red-500/25',
      icon:     AlertTriangle,
      alertas:  alertasEstoque,
    },
    {
      key:      'atencao',
      label:    'Atenção',
      descricao: 'Situações que precisam de acompanhamento',
      iconCls:  'text-amber-400',
      bgCls:    'bg-amber-500/10',
      badgeCls: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
      icon:     Shield,
      alertas:  alertasGarantia,
    },
    {
      key:      'informativo',
      label:    'Informativo',
      descricao: 'Oportunidades e lembretes de relacionamento',
      iconCls:  'text-blue-400',
      bgCls:    'bg-blue-500/10',
      badgeCls: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
      icon:     Phone,
      alertas:  alertasPosVenda,
    },
  ]

  const total = alertasEstoque.length + alertasGarantia.length + alertasPosVenda.length

  return { secoes, total }
}
