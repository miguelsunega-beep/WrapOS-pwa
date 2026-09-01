import { Clock, CalendarClock } from 'lucide-react'
import type { Agendamento } from '../types'
import { statusEfetivoConfig, type AppointmentVM } from '../hooks/useAgendamento'
import { Badge } from './Badge'

const capitalize = (s: string) => s.replace(/^./, c => c.toUpperCase())

function formatDayLabel(iso: string, todayISO: string): string {
  const amanhaDate = new Date(todayISO + 'T12:00:00')
  amanhaDate.setDate(amanhaDate.getDate() + 1)
  const amanhaISO = amanhaDate.toISOString().slice(0, 10)

  const dataFormatada = capitalize(
    new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  )

  if (iso === todayISO) return `Hoje · ${dataFormatada}`
  if (iso === amanhaISO) return `Amanhã · ${dataFormatada}`
  return dataFormatada
}

interface AgendaListProps {
  dias: { date: Date; iso: string }[]
  appointmentsByDia: Record<string, AppointmentVM[]>
  todayISO: string
  onSelect: (ag: Agendamento) => void
}

/** Equivalente ao AgendaGrid (grade de horas), mas como lista cronológica — usado no mobile,
 *  onde colunas de ~45px por dia tornam a grade ilegível. Mesmas props/dados, só a apresentação muda. */
export function AgendaList({ dias, appointmentsByDia, todayISO, onSelect }: AgendaListProps) {
  const diasComAgendamentos = dias.filter(({ iso }) => (appointmentsByDia[iso]?.length ?? 0) > 0)

  if (diasComAgendamentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-800 border border-ui-border rounded-[10px]">
        <CalendarClock size={32} className="text-gray-700" />
        <p className="mt-3 text-[14px] font-medium text-gray-400">Nenhum agendamento neste período</p>
        <p className="text-[12px] text-gray-600 mt-1">Ajuste os filtros ou crie um novo agendamento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {diasComAgendamentos.map(({ iso }) => {
        const ags = [...appointmentsByDia[iso]].sort((a, b) => a.inicioMin - b.inicioMin)
        return (
          <section key={iso}>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-0.5">
              {formatDayLabel(iso, todayISO)}
            </p>
            <div className="space-y-2">
              {ags.map(vm => (
                <button
                  key={vm.id}
                  onClick={() => onSelect(vm.ag)}
                  className="w-full flex items-stretch gap-3 text-left bg-surface-800 border border-ui-border rounded-xl p-3.5 hover:border-gray-600 transition-colors"
                >
                  <span className="w-1 rounded-full shrink-0" style={{ backgroundColor: vm.tipo.cor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-xs font-semibold text-ui-text shrink-0">
                        <Clock size={11} className="text-gray-500" />
                        {vm.horarioLabel}
                      </span>
                      <Badge
                        label={statusEfetivoConfig[vm.status].label}
                        variant={statusEfetivoConfig[vm.status].variant}
                      />
                    </div>
                    <p className="text-sm font-semibold text-ui-text mt-1.5 truncate">{vm.cliente}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{vm.modelo} · {vm.servicoNome}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
