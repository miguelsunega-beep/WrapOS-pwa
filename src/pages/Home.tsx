import { Plus } from 'lucide-react'
import { useHome } from '../hooks/useHome'
import type { ProximaHoraItem } from '../hooks/useHome'
import { AcaoCard } from '../components/AcaoCard'
import { KpiCard } from '../components/KpiCard'
import { PulsoPatioBar } from '../components/PulsoPatioBar'

export function Home() {
  const {
    saudacao,
    dataHojeLabel,
    totalAtencao,
    acoes,
    kpis,
    pulso,
    metaVazia,
    metaMesStr,
    faturamentoMesStr,
    progresso,
    faltamStr,
    diasRestantes,
    equipe,
    proximasHoras,
    irParaAgendamento,
    irParaPatio,
    irParaNovaOS,
    irParaMetas,
  } = useHome()

  return (
    <div className="px-6 py-5 md:p-6 space-y-6">
      <h1 className="sr-only">Início</h1>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="text-2xl font-bold font-display"
              style={{ color: 'var(--wrap-text)' }}
            >
              {saudacao}
            </h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-500/15 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ao vivo
            </span>
          </div>
          <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--wrap-muted)' }}>
            {dataHojeLabel}
            {totalAtencao > 0 && (
              <> · {totalAtencao} {totalAtencao === 1 ? 'item precisa' : 'itens precisam'} de você hoje</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={irParaNovaOS}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors hover:bg-[var(--wrap-surface2)]"
            style={{ border: '1px solid var(--wrap-border2)', color: 'var(--wrap-text)' }}
          >
            <Plus size={13} />
            Nova OS
          </button>
        </div>
      </div>

      {/* ── 2-col grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-5">

        {/* ── LEFT ──────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Atenção */}
          {acoes.length > 0 && (
            <section>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-2.5 flex items-center gap-1.5"
                style={{ color: 'var(--wrap-muted)' }}
              >
                Precisa da sua atenção
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {acoes.length}
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {acoes.map(a => (
                  <AcaoCard key={a.id} {...a} />
                ))}
              </div>
            </section>
          )}

          {/* KPIs */}
          <section>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-2.5"
              style={{ color: 'var(--wrap-muted)' }}
            >
              Hoje em números
            </p>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {kpis.map(k => (
                <KpiCard key={k.label} {...k} />
              ))}
            </div>
          </section>

          {/* Pulso do pátio */}
          <PulsoPatioBar
            aguardando={pulso.aguardando}
            execucao={pulso.execucao}
            concluido={pulso.concluido}
            onAbrir={irParaPatio}
          />

          {/* Próximas horas */}
          <section
            className="rounded-[10px] overflow-hidden"
            style={{ background: 'var(--wrap-surface)', border: '1px solid var(--wrap-border)' }}
          >
            <div
              className="px-5 py-3.5 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--wrap-border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--wrap-text)' }}>
                Próximas horas
              </h2>
              <button
                onClick={irParaAgendamento}
                className="text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--wrap-accent)' }}
              >
                Ver agenda →
              </button>
            </div>

            {proximasHoras.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: 'var(--wrap-muted)' }}>
                Nenhum agendamento para hoje.
              </p>
            ) : (
              <div style={{ '--divider': 'var(--wrap-border)' } as React.CSSProperties}>
                {proximasHoras.map((item, i) => (
                  <ProximaHoraRow key={item.id} item={item} isLast={i === proximasHoras.length - 1} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT ─────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Meta do mês — sempre visível */}
          <div
            className="rounded-[10px] p-5"
            style={{ background: 'var(--wrap-surface)', border: '1px solid var(--wrap-border)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--wrap-muted)' }}>
                Meta do mês
              </p>
              {!metaVazia && (
                <span className="text-xs font-bold" style={{ color: 'var(--wrap-text)' }}>
                  {progresso}%
                </span>
              )}
            </div>

            {metaVazia ? (
              <div className="mt-2">
                <p className="text-sm" style={{ color: 'var(--wrap-muted)' }}>
                  Nenhuma meta configurada este mês.
                </p>
                <button
                  onClick={irParaMetas}
                  className="mt-2 text-xs font-semibold transition-opacity hover:opacity-70"
                  style={{ color: 'var(--wrap-accent)' }}
                >
                  Configurar agora →
                </button>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--wrap-text)' }}>
                  {faturamentoMesStr}
                </p>
                <p className="text-xs" style={{ color: 'var(--wrap-muted)' }}>de {metaMesStr}</p>

                <div
                  className="w-full h-1.5 rounded-full mt-3 overflow-hidden"
                  style={{ background: 'var(--wrap-border2)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progresso}%`, background: 'var(--wrap-accent)' }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs" style={{ color: 'var(--wrap-muted)' }}>
                    Faltam {faltamStr}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--wrap-muted)' }}>
                    {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''} restante{diasRestantes !== 1 ? 's' : ''}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Carga da equipe */}
          {equipe.length > 0 && (
            <div
              className="rounded-[10px] p-5"
              style={{ background: 'var(--wrap-surface)', border: '1px solid var(--wrap-border)' }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--wrap-muted)' }}>
                Carga da equipe
              </p>
              <div className="space-y-3">
                {equipe.map(m => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                      style={{ background: 'rgb(var(--wrap-accent-rgb) / 0.18)', color: 'var(--wrap-accent)' }}
                    >
                      {m.iniciais}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--wrap-text)' }}>
                          {m.nome.split(' ')[0]}
                        </p>
                        <p className="text-[10px] shrink-0 ml-1" style={{ color: 'var(--wrap-muted)' }}>
                          {m.ativo} ativo{m.ativo !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--wrap-border2)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${m.maxAtivo > 0 ? Math.round((m.ativo / m.maxAtivo) * 100) : 0}%`,
                            background: 'var(--wrap-accent)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Internal sub-components ────────────────────────────────────────

function ProximaHoraRow({ item, isLast }: { item: ProximaHoraItem; isLast: boolean }) {
  const tagColors: Record<string, string> = {
    blue:  'bg-blue-500/15 text-blue-400',
    green: 'bg-emerald-500/15 text-emerald-400',
    red:   'bg-red-500/15 text-red-400',
    gray:  '',
  }
  const tagStyle = tagColors[item.statusTema] ?? ''

  return (
    <div
      className="px-5 py-3 flex items-center gap-3"
      style={!isLast ? { borderBottom: '1px solid var(--wrap-border)' } : undefined}
    >
      <p className="text-sm font-bold w-14 shrink-0" style={{ color: 'var(--wrap-text)' }}>
        {item.horario}
      </p>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--wrap-text)' }}>
          {item.veiculo}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--wrap-muted)' }}>
          {[item.servico, item.responsavel].filter(Boolean).join(' · ')}
        </p>
      </div>
      {tagStyle ? (
        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${tagStyle}`}>
          {item.statusTag}
        </span>
      ) : (
        <span
          className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--wrap-surface2)', color: 'var(--wrap-muted)' }}
        >
          {item.statusTag}
        </span>
      )}
    </div>
  )
}
