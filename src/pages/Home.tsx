import { ChevronRight } from 'lucide-react'
import { Card } from '../components/Card'
import { useHome } from '../hooks/useHome'

export function Home() {
  const {
    stats,
    metaMes,
    metaMesStr,
    faturamentoMesStr,
    progresso,
    acoes,
    kpis,
    clienteNome,
    irParaAgendamento,
  } = useHome()

  return (
    <div className="px-6 py-5 space-y-5 md:p-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-ui-text">Início</h1>
        <p className="text-gray-500 text-xs mt-0.5">Resumo da operação de hoje</p>
      </div>

      {/* Faixa de ação — o que precisa de você agora */}
      {acoes.length > 0 && (
        <div className="space-y-2">
          {acoes.map(a => {
            const Icon = a.icon
            return (
              <button
                key={a.label}
                onClick={a.onClick}
                className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:bg-amber-500/15 transition-colors"
              >
                <Icon size={16} className="text-amber-400 shrink-0" />
                <p className="text-sm text-amber-400 flex-1">
                  <span className="font-semibold">{a.value} {a.label}</span>
                  <span className="text-amber-400/70"> — {a.hint}</span>
                </p>
                <ChevronRight size={15} className="text-amber-400/60 shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* Pulso do dia — KPIs (carrossel no mobile, grid no desktop) */}
      <div className="flex overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-4 gap-3 snap-x [&::-webkit-scrollbar]:hidden">
        {kpis.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className="min-w-[220px] md:min-w-0 shrink-0 snap-start text-left"
            >
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{item.label}</p>
                    <p className={`text-2xl font-bold mt-1.5 ${item.color}`}>{item.value}</p>
                  </div>
                  <div className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon size={17} className={item.color} />
                  </div>
                </div>
              </Card>
            </button>
          )
        })}
      </div>

      {/* Meta do mês */}
      {metaMes > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-ui-text">Meta do mês</p>
            <p className="text-xs text-gray-500">{faturamentoMesStr} / {metaMesStr}</p>
          </div>
          <div className="w-full h-2 bg-surface-700 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progresso}%` }} />
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">{progresso}% da meta atingida</p>
        </Card>
      )}

      {/* Agenda de hoje */}
      <Card padding={false}>
        <div className="px-4 md:px-5 py-4 border-b border-ui-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ui-text">Agenda de hoje</h2>
          <button onClick={irParaAgendamento} className="text-xs text-gray-500 hover:text-ui-text">
            Ver tudo
          </button>
        </div>
        {stats.agsHoje.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-10">Nenhum agendamento para hoje.</p>
        ) : (
          <div className="divide-y divide-ui-border">
            {stats.agsHoje.map(a => (
              <div key={a.id} className="px-4 md:px-5 py-3 flex items-center gap-3">
                <span className="text-sm font-semibold text-ui-text w-14 shrink-0">{a.horario}</span>
                <span className="text-sm text-gray-300 flex-1">{clienteNome(a.clienteId)}</span>
                {a.box > 0 && <span className="text-xs text-gray-500">Box {a.box}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>

    </div>
  )
}
