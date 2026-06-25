import { useState, useRef, useEffect } from 'react'
import {
  Calendar, Plus, ChevronLeft, ChevronRight,
  Check, CheckCheck, Trash2, Pencil, FilePlus2,
  User, Wrench, CalendarClock,
} from 'lucide-react'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ActionButton } from '../components/ActionButton'
import { Modal } from '../components/Modal'
import { DateField } from '../components/DateField'
import { useAgendamento, todayISO, statusConfig, DIAS_SEMANA } from '../hooks/useAgendamento'

const inputCls = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors'
const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5'

export function Agendamento() {
  const {
    clientes, veiculos, servicos,
    diaSelecionado, setDiaSelecionado,
    diasDaSemana, weekLabel, diaSelecionadoLabel, navWeek, goToday,
    agsDia,
    getNomeCliente, getTelCliente, getVeiculoLabel, getVeiculoSub,
    getServicoNome, getInstalador, capacidadeDia,
    handleStatus,
    detalhes, setDetalhes,
    detCliente, detVeiculo, detServico, detInstalador, detValorStr, detDataStr,
    confirmarDelete, setConfirmarDelete, handleDelete,
    editForm, setEditForm, abrirEditar, handleSalvarEdicao,
    editVeiculosCliente, instaladoresAtivos,
    form, setForm, resetNovoForm, clientesFiltrados, veiculosCliente, selecionarCliente, handleSalvar,
    handleConverterOS,
  } = useAgendamento()

  // ── Pure UI state ─────────────────────────────────────────────
  const [novoOpen, setNovoOpen]     = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const onAbrirNovo = () => {
    resetNovoForm()
    setNovoOpen(true)
  }

  const onSalvar = () => {
    if (handleSalvar()) setNovoOpen(false)
  }

  const onSalvarEdicao = () => {
    if (handleSalvarEdicao()) setEditOpen(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ui-text">Agendamento</h1>
          <p className="text-gray-500 text-xs mt-0.5">Agenda semanal</p>
        </div>
        <Button onClick={onAbrirNovo}>
          <Plus size={15} />
          Novo Agendamento
        </Button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navWeek(-1)}
            className="p-1.5 rounded-lg hover:bg-surface-700 text-gray-500 hover:text-ui-text transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-ui-text min-w-[220px] text-center">{weekLabel}</span>
          <button
            onClick={() => navWeek(1)}
            className="p-1.5 rounded-lg hover:bg-surface-700 text-gray-500 hover:text-ui-text transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-surface-700 hover:text-ui-text border border-ui-border transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Week cards Carrossel Mobile */}
      <div className="flex overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-7 gap-2 snap-x [&::-webkit-scrollbar]:hidden">
        {diasDaSemana.map(({ date, iso, count }, i) => {
          const isToday = iso === todayISO
          const isSel = iso === diaSelecionado
          return (
            <button
              key={iso}
              onClick={() => setDiaSelecionado(iso)}
              className={`min-w-[65px] md:min-w-0 shrink-0 snap-start text-center p-3 rounded-xl border transition-all ${
                isSel
                  ? 'border-accent/50 bg-accent/5'
                  : 'border-ui-border bg-surface-800 hover:border-accent/25 hover:bg-surface-700'
              }`}
            >
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">{DIAS_SEMANA[i]}</p>
              <p className={`text-xl font-bold mt-1 ${isToday ? 'text-accent' : isSel ? 'text-ui-text' : 'text-gray-400'}`}>
                {date.getDate()}
              </p>
              {(() => {
                const cap = capacidadeDia(count)
                return cap ? (
                  <div className="flex items-center justify-center gap-1 mt-1.5" title={cap.label}>
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: cap.cor }}
                    />
                    <span className="text-[10px] text-gray-500">{count}</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-700 mt-1.5">—</p>
                )
              })()}
            </button>
          )
        })}
      </div>

      {/* Schedule list */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-ui-border flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-accent shrink-0" />
            <h2 className="text-sm font-semibold text-ui-text">
              Agenda — {diaSelecionadoLabel}
            </h2>
          </div>
          <span className="md:ml-auto text-xs text-gray-600">
            {agsDia.length} agendamento{agsDia.length !== 1 ? 's' : ''}
          </span>
        </div>

        {agsDia.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-600 text-sm">
            Nenhum agendamento para este dia.
          </div>
        ) : (
          <div className="divide-y divide-ui-border flex flex-col">
            {agsDia.map(ag => (
              <div
                key={ag.id}
                onClick={() => setDetalhes(ag)}
                className="group px-4 py-4 md:px-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 hover:bg-surface-600/40 transition-colors cursor-pointer"
              >
                {/* Mobile Top Row / Desktop Left */}
                <div className="flex items-start md:items-center gap-3 md:gap-4 w-full md:w-auto">
                  <div className="w-14 text-center shrink-0 pt-1 md:pt-0">
                    <p className="text-sm font-bold text-accent">{ag.horario}</p>
                  </div>
                  <div className="w-px h-10 bg-ui-border shrink-0 hidden md:block" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 md:hidden mb-1.5">
                      <Badge label={statusConfig[ag.status].label} variant={statusConfig[ag.status].variant} />
                    </div>
                    <p className="text-sm font-semibold text-ui-text">{getNomeCliente(ag.clienteId)}</p>
                    <p className="text-xs text-gray-500">{getVeiculoLabel(ag.veiculoId)}</p>
                  </div>
                </div>

                {/* Mobile Bottom / Desktop Right */}
                <div className="flex-1 min-w-0 pl-[68px] md:pl-0 flex flex-col md:flex-row md:items-center md:justify-between w-full md:w-auto">
                  <div className="mb-2 md:mb-0">
                    <p className="text-xs text-gray-400 truncate max-w-[220px]">{getServicoNome(ag.servicoId)}</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">{getInstalador(ag.instaladorId)}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <Badge label={statusConfig[ag.status].label} variant={statusConfig[ag.status].variant} />
                    <div
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                      onClick={e => e.stopPropagation()}
                    >
                      {ag.status === 'agendado' && (
                        <button
                          onClick={() => handleStatus(ag, 'confirmado')}
                          title="Confirmar"
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 transition-colors"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      {(ag.status === 'agendado' || ag.status === 'confirmado') && (
                        <button
                          onClick={() => handleStatus(ag, 'concluido')}
                          title="Concluir"
                          className="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-colors"
                        >
                          <CheckCheck size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmarDelete(ag.id)}
                        title="Excluir"
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Modal Detalhes ──────────────────────────────────────── */}
      <Modal isOpen={!!detalhes} onClose={() => setDetalhes(null)} title="Detalhes do Agendamento" size="lg">
        {detalhes && (
          <div className="space-y-4">
            {/* Status + actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                label={statusConfig[detalhes.status].label}
                variant={statusConfig[detalhes.status].variant}
              />
              {detalhes.status === 'agendado' && (
                <button
                  onClick={() => handleStatus(detalhes, 'confirmado')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  ✓ Confirmar
                </button>
              )}
              {(detalhes.status === 'agendado' || detalhes.status === 'confirmado') && (
                <button
                  onClick={() => handleStatus(detalhes, 'concluido')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                >
                  ✓✓ Concluir
                </button>
              )}
              {detalhes.status !== 'cancelado' && detalhes.status !== 'concluido' && (
                <button
                  onClick={() => handleStatus(detalhes, 'cancelado')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* Info grid 2x2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-surface-700 rounded-xl p-3.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Cliente</p>
                <p className="text-sm font-semibold text-ui-text">{detCliente?.nome ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{getTelCliente(detalhes.clienteId)}</p>
              </div>
              <div className="bg-surface-700 rounded-xl p-3.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Veículo</p>
                <p className="text-sm font-semibold text-ui-text">
                  {detVeiculo ? `${detVeiculo.marca} ${detVeiculo.modelo}` : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {detVeiculo ? getVeiculoSub(detVeiculo.id) : ''}
                </p>
              </div>
              <div className="bg-surface-700 rounded-xl p-3.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Serviço</p>
                <p className="text-sm font-semibold text-ui-text">{detServico?.nome ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{detValorStr}</p>
              </div>
              <div className="bg-surface-700 rounded-xl p-3.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Instalador</p>
                <p className="text-sm font-semibold text-ui-text">{detInstalador?.nome ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {detInstalador?.especialidades.join(', ') ?? ''}
                </p>
              </div>
            </div>

            {/* Data/Horário row */}
            <div className="grid grid-cols-2 gap-3">
              {([
                { label: 'Data',    value: detDataStr       },
                { label: 'Horário', value: detalhes.horario },
              ] as const).map(item => (
                <div key={item.label} className="bg-surface-700 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-bold text-ui-text mt-1.5">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-1 border-t border-ui-border">
              <button
                onClick={() => setConfirmarDelete(detalhes.id)}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={13} />
                Excluir agendamento
              </button>
              <div className="flex items-center gap-2">
                {detalhes.status === 'confirmado' && (
                  <button
                    onClick={() => handleConverterOS(detalhes)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                  >
                    <FilePlus2 size={13} />
                    Converter em OS
                  </button>
                )}
                <button
                  onClick={() => { setDetalhes(null); abrirEditar(detalhes); setEditOpen(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-600 text-gray-400 border border-ui-border hover:text-ui-text hover:bg-surface-500 transition-colors"
                >
                  <Pencil size={13} />
                  Editar
                </button>
                <Button variant="secondary" onClick={() => setDetalhes(null)}>Fechar</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Novo Agendamento ──────────────────────────────── */}
      <Modal isOpen={novoOpen} onClose={() => setNovoOpen(false)} title="Novo Agendamento" size="lg">
        <div className="space-y-5">
          {/* ── Seção 1: Quem ── */}
          <section className="space-y-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <User size={12} /> Cliente &amp; Veículo
            </p>

            {/* Cliente autocomplete */}
            <div>
              <label className={labelCls}>Cliente <span className="text-accent">*</span></label>
              <div className="relative" ref={dropdownRef}>
                <input
                  value={form.clienteSearch}
                  onChange={e => {
                    setForm(p => ({ ...p, clienteSearch: e.target.value, clienteId: '', veiculoId: '' }))
                    setDropdownOpen(true)
                  }}
                  onFocus={() => { if (form.clienteSearch.length > 0) setDropdownOpen(true) }}
                  placeholder="Buscar cliente pelo nome..."
                  className={inputCls}
                />
                {dropdownOpen && clientesFiltrados.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-surface-700 border border-ui-border rounded-xl shadow-xl overflow-hidden">
                    {clientesFiltrados.slice(0, 6).map(c => (
                      <button
                        key={c.id}
                        onMouseDown={() => { selecionarCliente(c); setDropdownOpen(false) }}
                        className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-surface-600 hover:text-ui-text transition-colors flex items-center justify-between"
                      >
                        <span>{c.nome}</span>
                        <span className="text-xs text-gray-600">{c.telefone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Veículo — only when client selected */}
            {form.clienteId && (
              <div>
                <label className={labelCls}>Veículo</label>
                <select
                  value={form.veiculoId}
                  onChange={e => setForm(p => ({ ...p, veiculoId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Sem veículo específico</option>
                  {veiculosCliente.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.marca} {v.modelo} {v.ano} — {v.placa}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {/* ── Seção 2: O quê ── */}
          <section className="space-y-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <Wrench size={12} /> Serviço &amp; Responsável
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Serviço</label>
                <select
                  value={form.servicoId}
                  onChange={e => setForm(p => ({ ...p, servicoId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Nenhum</option>
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Valor (R$)</label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={form.valor}
                  onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Instalador</label>
                <select
                  value={form.instaladorId}
                  onChange={e => setForm(p => ({ ...p, instaladorId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Nenhum</option>
                  {instaladoresAtivos.map(i => (
                    <option key={i.id} value={i.id}>{i.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── Seção 3: Quando ── */}
          <section className="space-y-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <CalendarClock size={12} /> Data &amp; Horário
            </p>
            {form.mesmoDia ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Data <span className="text-accent">*</span></label>
                  <DateField value={form.data} onChange={(iso) => setForm(p => ({ ...p, data: iso, dataSaida: iso }))} />
                </div>
                <div>
                  <label className={labelCls}>Horário <span className="text-accent">*</span></label>
                  <input
                    type="time"
                    value={form.horario}
                    onChange={e => setForm(p => ({ ...p, horario: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Entrada <span className="text-accent">*</span></label>
                    <DateField value={form.data} onChange={(iso) => setForm(p => ({ ...p, data: iso }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Saída prevista</label>
                    <DateField value={form.dataSaida} min={form.data} onChange={(iso) => setForm(p => ({ ...p, dataSaida: iso }))} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Horário <span className="text-accent">*</span></label>
                  <input
                    type="time"
                    value={form.horario}
                    onChange={e => setForm(p => ({ ...p, horario: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, mesmoDia: !p.mesmoDia, dataSaida: !p.mesmoDia ? p.data : p.dataSaida }))}
              className="flex items-center gap-2 text-sm font-medium transition-colors mt-1"
              style={{ color: form.mesmoDia ? 'var(--wrap-accent)' : '#6b7280' }}
            >
              <span
                className="relative rounded-full transition-colors"
                style={{ height: 22, width: 40, background: form.mesmoDia ? 'var(--wrap-accent)' : 'var(--surface-500)' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform"
                  style={{ width: 18, height: 18, transform: form.mesmoDia ? 'translateX(18px)' : 'translateX(0)' }}
                />
              </span>
              Entra e sai no mesmo dia
            </button>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={() => setNovoOpen(false)}>Cancelar</Button>
            <ActionButton onClick={onSalvar}>Criar Agendamento</ActionButton>
          </div>
        </div>
      </Modal>

      {/* ── Modal Editar Agendamento ───────────────────────────── */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Editar Agendamento" size="lg">
        <div className="space-y-4">
          {/* Cliente */}
          <div>
            <label className={labelCls}>Cliente</label>
            <select
              value={editForm.clienteId}
              onChange={e => {
                const cId = e.target.value
                const primeiro = veiculos.find(v => v.clienteId === cId)
                setEditForm(p => ({ ...p, clienteId: cId, veiculoId: primeiro?.id ?? '' }))
              }}
              className={inputCls}
            >
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {/* Veículo */}
          {editForm.clienteId && (
            <div>
              <label className={labelCls}>Veículo</label>
              <select
                value={editForm.veiculoId}
                onChange={e => setEditForm(p => ({ ...p, veiculoId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Sem veículo específico</option>
                {editVeiculosCliente.map(v => (
                  <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.ano} — {v.placa}</option>
                ))}
              </select>
            </div>
          )}

          {/* Serviço + Valor + Instalador */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Serviço</label>
              <select
                value={editForm.servicoId}
                onChange={e => setEditForm(p => ({ ...p, servicoId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Nenhum</option>
                {servicos.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Valor (R$)</label>
              <input
                type="number"
                min={0}
                step={10}
                value={editForm.valor}
                onChange={e => setEditForm(p => ({ ...p, valor: e.target.value }))}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Instalador</label>
              <select
                value={editForm.instaladorId}
                onChange={e => setEditForm(p => ({ ...p, instaladorId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Nenhum</option>
                {instaladoresAtivos.map(i => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data & Horário */}
          {editForm.mesmoDia ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Data <span className="text-accent">*</span></label>
                <DateField value={editForm.data} onChange={(iso) => setEditForm(p => ({ ...p, data: iso, dataSaida: iso }))} />
              </div>
              <div>
                <label className={labelCls}>Horário <span className="text-accent">*</span></label>
                <input
                  type="time"
                  value={editForm.horario}
                  onChange={e => setEditForm(p => ({ ...p, horario: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Entrada <span className="text-accent">*</span></label>
                  <DateField value={editForm.data} onChange={(iso) => setEditForm(p => ({ ...p, data: iso }))} />
                </div>
                <div>
                  <label className={labelCls}>Saída prevista</label>
                  <DateField value={editForm.dataSaida} min={editForm.data} onChange={(iso) => setEditForm(p => ({ ...p, dataSaida: iso }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Horário <span className="text-accent">*</span></label>
                <input
                  type="time"
                  value={editForm.horario}
                  onChange={e => setEditForm(p => ({ ...p, horario: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => setEditForm(p => ({ ...p, mesmoDia: !p.mesmoDia, dataSaida: !p.mesmoDia ? p.data : p.dataSaida }))}
            className="flex items-center gap-2 text-sm font-medium transition-colors mt-1"
            style={{ color: editForm.mesmoDia ? 'var(--wrap-accent)' : '#6b7280' }}
          >
            <span
              className="relative rounded-full transition-colors"
              style={{ height: 22, width: 40, background: editForm.mesmoDia ? 'var(--wrap-accent)' : 'var(--surface-500)' }}
            >
              <span
                className="absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform"
                style={{ width: 18, height: 18, transform: editForm.mesmoDia ? 'translateX(18px)' : 'translateX(0)' }}
              />
            </span>
            Entra e sai no mesmo dia
          </button>

          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <ActionButton onClick={onSalvarEdicao}>Salvar Alterações</ActionButton>
          </div>
        </div>
      </Modal>

      {/* ── Modal Delete confirm ────────────────────────────────── */}
      <Modal isOpen={!!confirmarDelete} onClose={() => setConfirmarDelete(null)} title="Excluir Agendamento" size="sm">
        <p className="text-sm text-gray-400 mb-5">
          Tem certeza que deseja excluir este agendamento? Essa ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmarDelete(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
