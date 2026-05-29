import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Shield, Phone } from 'lucide-react'
import { Card } from '../components/Card'
import { useApp } from '../context/AppContext'

const todayMS        = Date.now()
const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000

export function Avisos() {
  const { produtos, garantias, clientes, ordens } = useApp()
  const navigate = useNavigate()

  const alertasEstoque = produtos
    .filter(p => p.quantidade <= p.minimo)
    .map(p => ({
      id:       `est-${p.id}`,
      titulo:   'Estoque Crítico',
      mensagem: `${p.nome} — apenas ${p.quantidade} ${p.unidade}(s) restante(s). Mínimo configurado: ${p.minimo}`,
      onClick:  () => navigate('/estoque'),
    }))

  const alertasGarantia = garantias
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

  const alertasPosVenda = clientes
    .filter(c => {
      const osC   = ordens.filter(o => o.clienteId === c.id && o.status !== 'cancelado')
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

  const secoes = [
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

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ui-text">Avisos</h1>
        <p className="text-gray-500 text-xs mt-0.5">
          {total === 0
            ? 'Nenhum alerta pendente no momento'
            : `${total} alerta${total !== 1 ? 's' : ''} pendente${total !== 1 ? 's' : ''}`}
        </p>
      </div>

      {total === 0 && (
        <Card>
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Shield size={22} className="text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-ui-text">Tudo em ordem!</p>
            <p className="text-xs text-gray-500 mt-1">Nenhum alerta ativo no sistema.</p>
          </div>
        </Card>
      )}

      {secoes.map(({ key, label, descricao, iconCls, bgCls, badgeCls, icon: Icon, alertas }) =>
        alertas.length > 0 && (
          <div key={key} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${badgeCls}`}>
                  <Icon size={11} />
                  {label}
                </div>
                <p className="text-[11px] text-gray-500 mt-1 ml-0.5">{descricao}</p>
              </div>
              <span className="text-[11px] text-gray-600">{alertas.length} alerta{alertas.length !== 1 ? 's' : ''}</span>
            </div>

            <Card padding={false}>
              <div className="divide-y divide-ui-border">
                {alertas.map(alerta => (
                  <button
                    key={alerta.id}
                    onClick={alerta.onClick}
                    className="w-full text-left px-4 py-3.5 hover:bg-surface-600/40 transition-colors flex items-start gap-3 group"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${bgCls}`}>
                      <Icon size={14} className={iconCls} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ui-text">{alerta.titulo}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{alerta.mensagem}</p>
                    </div>
                    <span className="text-[11px] text-gray-600 group-hover:text-accent transition-colors shrink-0 mt-1">
                      Ver →
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )
      )}
    </div>
  )
}
