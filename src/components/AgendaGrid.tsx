import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import type { Agendamento } from '../types'
import { HOUR_START, HOUR_END, PX_PER_HOUR, type AppointmentVM } from '../hooks/useAgendamento'

const DIAS_ABREV = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
const GRID_HEIGHT = HOURS.length * PX_PER_HOUR

interface AgendaGridProps {
  dias: { date: Date; iso: string }[]
  appointmentsByDia: Record<string, AppointmentVM[]>
  todayISO: string
  onSelect: (ag: Agendamento) => void
}

export function AgendaGrid({ dias, appointmentsByDia, todayISO, onSelect }: AgendaGridProps) {
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const nowMin = agora.getHours() * 60 + agora.getMinutes()
  const boundStart = HOUR_START * 60
  const boundEnd = HOUR_END * 60
  const nowTop = ((nowMin - boundStart) / 60) * PX_PER_HOUR

  const cols = dias.length

  return (
    <div className="bg-surface-800 border border-ui-border rounded-[10px] overflow-hidden">
      {/* Header */}
      <div
        className="grid border-b border-ui-border"
        style={{ gridTemplateColumns: `58px repeat(${cols}, 1fr)` }}
      >
        <div />
        {dias.map(({ date, iso }) => {
          const isToday = iso === todayISO
          return (
            <div
              key={iso}
              className={`py-2.5 text-center border-l border-ui-border ${isToday ? 'bg-accent/5' : ''}`}
            >
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">
                {DIAS_ABREV[(date.getDay() + 6) % 7]}
              </p>
              <p
                className={`mt-1 text-sm font-bold inline-flex items-center justify-center rounded-full transition-colors ${
                  isToday ? 'w-6 h-6 bg-accent text-white' : 'text-ui-text'
                }`}
              >
                {date.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      {/* Body */}
      <div className="grid overflow-x-auto" style={{ gridTemplateColumns: `58px repeat(${cols}, 1fr)` }}>
        {/* Gutter de horários */}
        <div className="relative" style={{ height: GRID_HEIGHT }}>
          {HOURS.map((h, i) => (
            <span
              key={h}
              className="absolute right-2 -translate-y-1/2 text-[11px] text-gray-600"
              style={{ top: i * PX_PER_HOUR }}
            >
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>

        {/* Colunas dos dias */}
        {dias.map(({ iso }) => {
          const isToday = iso === todayISO
          const showNowLine = isToday && nowMin >= boundStart && nowMin < boundEnd

          return (
            <div
              key={iso}
              className="relative border-l border-ui-border"
              style={{
                height: GRID_HEIGHT,
                backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${PX_PER_HOUR - 1}px, rgba(255,255,255,0.05) ${PX_PER_HOUR - 1}px, rgba(255,255,255,0.05) ${PX_PER_HOUR}px)`,
              }}
            >
              {appointmentsByDia[iso]?.map(vm => {
                const start = Math.max(vm.inicioMin, boundStart)
                const end = Math.min(vm.inicioMin + vm.duracaoMin, boundEnd)
                if (end <= boundStart || start >= boundEnd) return null
                const top = ((start - boundStart) / 60) * PX_PER_HOUR
                const height = Math.max(((end - start) / 60) * PX_PER_HOUR - 4, 24)

                return (
                  <button
                    key={vm.id}
                    onClick={() => onSelect(vm.ag)}
                    className="absolute left-1 right-1 rounded-lg px-2 py-1.5 text-left overflow-hidden shadow-sm hover:brightness-110 transition-[filter]"
                    style={{
                      top, height,
                      backgroundColor: `color-mix(in srgb, ${vm.tipo.cor} 16%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${vm.tipo.cor} 32%, transparent)`,
                      borderLeftWidth: 3,
                      borderLeftColor: vm.tipo.cor,
                    }}
                  >
                    <p className="text-[12px] font-semibold text-ui-text truncate leading-tight">{vm.modelo}</p>
                    <p className="text-[11px] truncate leading-tight" style={{ color: vm.tipo.cor }}>{vm.servicoNome}</p>
                    {height > 46 && <p className="text-[10.5px] text-gray-400 truncate leading-tight mt-0.5">{vm.cliente}</p>}
                    {height > 60 && (
                      <p className="flex items-center gap-1 text-[10.5px] text-gray-500 mt-0.5">
                        <Clock size={10} /> {vm.horarioLabel}
                      </p>
                    )}
                  </button>
                )
              })}

              {showNowLine && (
                <div className="absolute left-0 right-0 z-10 flex items-center" style={{ top: nowTop }}>
                  <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_2px_rgba(232,48,74,0.6)] -ml-1" />
                  <div className="flex-1 h-[2px] bg-accent shadow-[0_0_6px_rgba(232,48,74,0.6)]" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
