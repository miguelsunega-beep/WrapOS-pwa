import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Plus, Search, Trash2, Check, X,
  DollarSign, User, Wrench, MessageSquare, Zap, Link, Link2Off,
} from 'lucide-react'
import { useDraftState } from '../hooks/useDraftState'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ActionButton } from '../components/ActionButton'
import { Modal } from '../components/Modal'
import { CheckinRapido } from '../components/CheckinRapido'
import { ConcluirOSModal } from '../components/ConcluirOSModal'
import { OSModal } from '../components/OSModal'
import { DateField } from '../components/DateField'
import { isOSAtrasada } from '../lib/osStatus'
import {
  useOrdemServico,
  statusConfig, fmt, FORMAS_PAGAMENTO, CORES_VEICULO_OS,
} from '../hooks/useOrdemServico'
import type { StatusOS, OrdemServico, Veiculo } from '../types'
import type { FiltroStatus } from '../hooks/useOrdemServico'

// ── Visual helpers ────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs text-gray-500 mb-1.5">
      {children}{required && <span className="text-accent ml-0.5">*</span>}
    </label>
  )
}

function FieldWrap({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

const inputCls  = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text focus:border-accent/50 outline-none transition-colors'
const selectCls = `${inputCls} cursor-pointer`

// ── Sub-component: status filter cards ────────────────────────────

interface StatusCardsProps {
  counts:      Record<StatusOS, number>
  statusFilter: FiltroStatus
  onToggle:    (s: StatusOS) => void
}

function OSStatusCards({ counts, statusFilter, onToggle }: StatusCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {([
        { s: 'em_andamento',         label: 'Em Andamento',      color: 'text-amber-400',   ring: 'ring-amber-500/30'   },
        { s: 'aguardando_material',  label: 'Aguard. Material',  color: 'text-blue-400',    ring: 'ring-blue-500/30'    },
        { s: 'aguardando_aprovacao', label: 'Aguard. Aprovação', color: 'text-purple-400',  ring: 'ring-purple-500/30'  },
        { s: 'concluido',            label: 'Concluídas',        color: 'text-emerald-400', ring: 'ring-emerald-500/30' },
        { s: 'cancelado',            label: 'Canceladas',        color: 'text-red-400',     ring: 'ring-red-500/30'     },
      ] as { s: StatusOS; label: string; color: string; ring: string }[]).map(item => (
        <button
          key={item.s}
          onClick={() => onToggle(item.s)}
          className={`text-left p-4 rounded-xl border transition-all ${
            statusFilter === item.s
              ? `bg-surface-700 border-ui-border ring-2 ${item.ring}`
              : 'bg-surface-800 border-ui-border hover:border-gray-600'
          }`}
        >
          <p className="text-[11px] text-gray-500 font-medium">{item.label}</p>
          <p className={`text-2xl font-bold mt-1.5 ${item.color}`}>{counts[item.s]}</p>
        </button>
      ))}
    </div>
  )
}

// ── Sub-component: OS list (desktop table + mobile cards) ─────────

interface OSListProps {
  filtered:          OrdemServico[]
  onOpen:            (os: OrdemServico) => void
  onConfirmarDelete: (id: string) => void
  clienteNome:       (id: string) => string
  veiculoLabel:      (id: string) => string
  getVeiculo:        (id: string) => Veiculo | undefined
}

function OSList({ filtered, onOpen, onConfirmarDelete, clienteNome, veiculoLabel, getVeiculo }: OSListProps) {
  return (
    <Card padding={false}>
      <div className="px-4 py-4 border-b border-ui-border flex justify-between items-center">
        <div>
          <h2 className="text-sm font-semibold text-ui-text">Todas as Ordens</h2>
          <p className="text-gray-600 text-xs mt-0.5">{filtered.length} encontradas</p>
        </div>
      </div>

      {/* Visão Desktop: Tabela */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ui-border">
              {['#OS', 'Cliente', 'Veículo', 'Serviços', 'Valor', 'Status', ''].map(h => (
                <th key={h} className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border">
            {filtered.map(os => {
              const v  = getVeiculo(os.veiculoId)
              const sc = statusConfig[os.status]
              return (
                <tr key={os.id} onClick={() => onOpen(os)} className="hover:bg-surface-600/40 transition-colors cursor-pointer group">
                  <td className="py-3.5 px-4 text-xs font-mono text-accent font-semibold">#{os.numero}</td>
                  <td className="py-3.5 px-4 text-sm font-medium text-ui-text">{clienteNome(os.clienteId)}</td>
                  <td className="py-3.5 px-4">
                    <p className="text-sm text-gray-300">{veiculoLabel(os.veiculoId)}</p>
                    <p className="text-[11px] text-gray-600 font-mono mt-0.5">{v?.placa ?? '—'}</p>
                  </td>
                  <td className="py-3.5 px-4 text-sm text-gray-400 max-w-[180px] truncate">{os.servicos.map(s => s.nome).join(', ')}</td>
                  <td className="py-3.5 px-4 text-sm font-bold text-ui-text">{fmt(os.valorTotal)}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <Badge label={sc.label} variant={sc.variant} />
                      {isOSAtrasada(os) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">ATRASADO</span>
                      )}
                      {os.status === 'concluido' && os.statusPagamento === 'a_receber' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">A RECEBER</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={e => { e.stopPropagation(); onConfirmarDelete(os.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Visão Mobile: Lista de Cards */}
      <div className="md:hidden flex flex-col divide-y divide-ui-border">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-600 text-sm">Nenhuma OS encontrada.</div>
        ) : filtered.map(os => {
          const v  = getVeiculo(os.veiculoId)
          const sc = statusConfig[os.status]
          return (
            <button key={os.id} onClick={() => onOpen(os)} className="p-4 text-left hover:bg-surface-600/40 transition-colors flex flex-col gap-2">
              <div className="flex justify-between items-start w-full">
                <div>
                  <span className="text-xs font-mono text-accent font-bold bg-accent/10 px-1.5 py-0.5 rounded mr-2">#{os.numero}</span>
                  <span className="text-sm font-semibold text-ui-text">{clienteNome(os.clienteId)}</span>
                </div>
                <span className="text-sm font-bold text-ui-text">{fmt(os.valorTotal)}</span>
              </div>
              <div className="flex justify-between items-end w-full">
                <div>
                  <p className="text-xs text-gray-400">{veiculoLabel(os.veiculoId)} <span className="text-[10px] uppercase ml-1">({v?.placa ?? '—'})</span></p>
                  <p className="text-[11px] text-gray-500 mt-1 truncate max-w-[200px]">{os.servicos.map(s => s.nome).join(', ')}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge label={sc.label} variant={sc.variant} />
                  {isOSAtrasada(os) && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">ATRASADO</span>
                  )}
                  {os.status === 'concluido' && os.statusPagamento === 'a_receber' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">A RECEBER</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────

export function OrdemServico() {
  const {
    servicos, instaladores,
    search, setSearch,
    statusFilter, setStatusFilter,
    filtered, counts, totalOS,
    osAberta, setOsAberta,
    confirmarDelete, setConfirmarDelete, handleDelete, excluirOS,
    concluirOSData, setConcluirOSData,
    abrirConcluir,
    form, setForm,
    criandoCliente, setCriandoCliente,
    novoCli, setNovoCli,
    clientesFiltrados, veiculosDoCliente,
    valorTotalNova, comissaoValor,
    resetForm, selecionarCliente, handleCriarClienteInline,
    toggleServico, setValorServico,
    handleInstaladorChange, handleSalvar,
    agendamentoSugerido, setAgendamentoSugerido,
    confirmarVincularAgendamento, recusarVincularAgendamento,
    clienteNome, getCliente, getVeiculo, veiculoLabel,
  } = useOrdemServico()

  // ── UI state ──────────────────────────────────────────────────
  const [novaOSOpen, setNovaOSOpen]     = useDraftState('wrapos_draft_os_nova_open', false)
  const [checkinOpen, setCheckinOpen]   = useState(false)
  const [dropdownOpen, setDropdown]     = useState(false)
  const dropdownRef                     = useRef<HTMLDivElement>(null)
  const location                        = useLocation()

  // ── Click-outside: autocomplete dropdown ──────────────────────
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdown(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // ── Wrapper functions ─────────────────────────────────────────
  const onNova   = () => { resetForm(); setDropdown(false); setNovaOSOpen(true) }

  // ── Auto-open Nova OS from navigation state (Início → Nova OS) ──
  useEffect(() => {
    const state = location.state as { novaOS?: boolean } | null
    if (state?.novaOS) onNova()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const onSalvar = async () => { if (await handleSalvar()) setNovaOSOpen(false) }
  const onCriarClienteInline = async () => { await handleCriarClienteInline() }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ui-text">Ordens de Serviço</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            {totalOS} OS — {counts.em_andamento + counts.aguardando_material} em aberto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCheckinOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-ui-border text-gray-400 hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-all"
          >
            <Zap size={14} /> Check-in Rápido
          </button>
          <Button onClick={onNova}>
            <Plus size={15} /> Nova OS
          </Button>
        </div>
      </div>

      {/* Status cards (filtro clicável) */}
      <OSStatusCards
        counts={counts}
        statusFilter={statusFilter}
        onToggle={s => setStatusFilter(f => f === s ? 'todos' : s)}
      />

      {/* Busca */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            placeholder="Buscar por cliente, #OS ou serviço..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-700 border border-ui-border rounded-lg pl-8 pr-4 py-2 text-sm text-ui-text placeholder-gray-500 focus:border-accent/50 outline-none"
          />
        </div>
        {statusFilter !== 'todos' && (
          <span className="flex items-center gap-2 px-3 py-1.5 bg-surface-700 border border-ui-border rounded-lg text-xs text-gray-400">
            Filtro: <b className="text-ui-text">
              {statusFilter === 'abertos' ? 'Em Aberto' : statusConfig[statusFilter as StatusOS].label}
            </b>
            <button onClick={() => setStatusFilter('todos')} className="hover:text-ui-text">
              <X size={13} />
            </button>
          </span>
        )}
      </div>

      {/* Lista */}
      <OSList
        filtered={filtered}
        onOpen={setOsAberta}
        onConfirmarDelete={setConfirmarDelete}
        clienteNome={clienteNome}
        veiculoLabel={veiculoLabel}
        getVeiculo={getVeiculo}
      />

      {/* ════════════════════════════════════════════════════════
          MODAL: NOVA OS
      ════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={novaOSOpen}
        onClose={() => { setNovaOSOpen(false); resetForm() }}
        title="Nova Ordem de Serviço"
        size="xl"
      >
        {/* Área scrollável */}
        <div className="space-y-6 max-h-[62vh] overflow-y-auto pr-2 -mr-2">

          {/* ── Seção 1: Cliente & Veículo ── */}
          <section className="space-y-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <User size={12} /> Cliente &amp; Veículo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Busca de cliente com autocomplete */}
              <div className="relative" ref={dropdownRef}>
                <Label required>Cliente</Label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Nome ou CPF..."
                    value={form.clienteSearch}
                    onChange={e => {
                      setForm(f => ({ ...f, clienteSearch: e.target.value, clienteId: '', veiculoId: '' }))
                      setDropdown(true)
                    }}
                    onFocus={() => form.clienteSearch && setDropdown(true)}
                    className="w-full bg-surface-700 border border-ui-border rounded-lg pl-8 pr-8 py-2 text-sm text-ui-text placeholder-gray-500 focus:border-accent/50 outline-none"
                  />
                  {form.clienteId && (
                    <button
                      onClick={() => setForm(f => ({ ...f, clienteId: '', clienteSearch: '', veiculoId: '' }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-ui-text"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Dropdown */}
                {dropdownOpen && form.clienteSearch.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-surface-700 border border-ui-border rounded-xl shadow-2xl overflow-hidden">
                    {clientesFiltrados.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-gray-600 text-center">Nenhum cliente encontrado</p>
                    ) : clientesFiltrados.slice(0, 6).map(c => (
                      <button
                        key={c.id}
                        onMouseDown={() => { selecionarCliente(c.id, c.nome); setDropdown(false) }}
                        className="w-full text-left px-3 py-2.5 hover:bg-surface-600 border-b border-ui-border/50 last:border-0 transition-colors"
                      >
                        <p className="text-sm font-medium text-ui-text">{c.nome}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{c.telefone} · {c.cpf}</p>
                      </button>
                    ))}
                  </div>
                )}

                {form.clienteId
                  ? <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1"><Check size={11} /> Cliente confirmado</p>
                  : form.clienteSearch && <p className="mt-1 text-[11px] text-gray-600">Digite para buscar ou clique em um resultado</p>
                }
              </div>

              {/* Veículo */}
              <FieldWrap>
                <Label>Veículo</Label>
                <select
                  value={form.veiculoId}
                  onChange={e => setForm(f => ({ ...f, veiculoId: e.target.value }))}
                  disabled={!form.clienteId}
                  className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <option className="bg-surface-700 text-ui-text" value="">
                    {form.clienteId
                      ? veiculosDoCliente.length === 0 ? 'Sem veículos cadastrados' : 'Selecionar veículo'
                      : 'Selecione o cliente primeiro'}
                  </option>
                  {veiculosDoCliente.map(v => (
                    <option className="bg-surface-700 text-ui-text" key={v.id} value={v.id}>
                      {v.marca} {v.modelo} {v.ano} · {v.placa}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              {/* Criar cliente novo inline */}
              {!form.clienteId && (
                <div className="sm:col-span-2">
                  {!criandoCliente ? (
                    <button
                      type="button"
                      onClick={() => setCriandoCliente(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-ui-border text-gray-500 hover:border-accent/40 hover:text-accent hover:bg-accent/5 transition-all text-sm font-medium"
                    >
                      <Plus size={14} /> Cadastrar cliente novo
                    </button>
                  ) : (
                    <div className="space-y-3 p-4 bg-surface-700 rounded-xl border border-ui-border">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-ui-text">Novo cliente</p>
                        <button type="button" onClick={() => setCriandoCliente(false)} className="text-gray-500 hover:text-ui-text"><X size={13} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label required>Nome</Label>
                          <input value={novoCli.nome} onChange={e => setNovoCli(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" className={inputCls} />
                        </div>
                        <div>
                          <Label required>Telefone</Label>
                          <input value={novoCli.telefone} onChange={e => setNovoCli(p => ({ ...p, telefone: e.target.value }))} placeholder="(11) 99999-0000" className={inputCls} />
                        </div>
                      </div>
                      <div className="pt-1 border-t border-ui-border/50">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Veículo (opcional)</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Placa</Label>
                            <input value={novoCli.placa} onChange={e => setNovoCli(p => ({ ...p, placa: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,8) }))} placeholder="ABC1D23" className={`${inputCls} font-mono tracking-widest`} />
                          </div>
                          <div>
                            <Label>Ano</Label>
                            <input type="number" value={novoCli.ano} onChange={e => setNovoCli(p => ({ ...p, ano: +e.target.value }))} min={1990} max={new Date().getFullYear()+1} className={inputCls} />
                          </div>
                          <div>
                            <Label>Marca</Label>
                            <input value={novoCli.marca} onChange={e => setNovoCli(p => ({ ...p, marca: e.target.value }))} placeholder="Ex: Toyota" className={inputCls} />
                          </div>
                          <div>
                            <Label>Modelo</Label>
                            <input value={novoCli.modelo} onChange={e => setNovoCli(p => ({ ...p, modelo: e.target.value }))} placeholder="Ex: Corolla" className={inputCls} />
                          </div>
                        </div>
                        <div className="mt-3">
                          <Label>Cor</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {CORES_VEICULO_OS.map(c => {
                              const sel = novoCli.cor.trim().toLowerCase() === c.nome.toLowerCase()
                              return (
                                <button key={c.nome} type="button" onClick={() => setNovoCli(p => ({ ...p, cor: c.nome }))} title={c.nome}
                                  className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${sel ? 'border-accent/50 bg-accent/10 text-ui-text' : 'border-ui-border bg-surface-600 text-gray-400 hover:border-gray-500'}`}>
                                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: c.hex, border: '1px solid rgba(128,128,128,0.35)' }} />
                                  {c.nome}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      <ActionButton onClick={onCriarClienteInline} className="w-full">
                        <Check size={14} /> Cadastrar e selecionar
                      </ActionButton>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── Seção 2: Serviços ── */}
          <section className="space-y-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <Wrench size={12} /> Serviços<span className="text-accent">*</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {servicos.map(s => {
                const selObj = form.servicosSel.find(x => x.servicoId === s.id)
                const sel = !!selObj
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between gap-2 p-3 rounded-xl border transition-all ${
                      sel ? 'border-accent/60 bg-accent/8 ring-1 ring-accent/20' : 'border-ui-border bg-surface-700 hover:border-gray-500'
                    }`}
                  >
                    <button type="button" onClick={() => toggleServico(s.id)} className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                      <span className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${sel ? 'bg-accent border-accent' : 'border-gray-600'}`}>
                        {sel && <Check size={12} className="text-white" />}
                      </span>
                      <span className="text-sm font-medium text-ui-text truncate">{s.nome}</span>
                    </button>
                    {sel && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[12px] text-gray-500">R$</span>
                        <input
                          type="number" min={0} step={10}
                          value={selObj!.valor || ''}
                          onChange={e => setValorServico(s.id, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-24 bg-surface-600 border border-ui-border rounded-lg px-2 py-1.5 text-sm text-right text-ui-text focus:border-accent/50 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Seção 3: Pagamento e Instalador ── */}
          <section className="space-y-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <DollarSign size={12} /> Financeiro &amp; Logística
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldWrap>
                <Label>Forma de Pagamento</Label>
                <select
                  value={form.formaPagamento}
                  onChange={e => setForm(f => ({ ...f, formaPagamento: e.target.value }))}
                  className={selectCls}
                >
                  {FORMAS_PAGAMENTO.map(fp => <option className="bg-surface-700 text-ui-text" key={fp}>{fp}</option>)}
                </select>
              </FieldWrap>

              <FieldWrap>
                <Label>Instalador</Label>
                <select
                  value={form.instaladorId}
                  onChange={e => handleInstaladorChange(e.target.value)}
                  className={selectCls}
                >
                  <option className="bg-surface-700 text-ui-text" value="">— Selecionar —</option>
                  {instaladores.filter(i => i.ativo).map(i => (
                    <option className="bg-surface-700 text-ui-text" key={i.id} value={i.id}>{i.nome}</option>
                  ))}
                </select>
              </FieldWrap>
            </div>

            <FieldWrap>
              <Label>Entrega prevista (opcional)</Label>
              <DateField
                value={form.dataSaidaPrevista}
                onChange={(iso) => setForm(f => ({ ...f, dataSaidaPrevista: iso }))}
              />
            </FieldWrap>

            {/* Comissão toggle */}
            <div className="p-3.5 bg-surface-700 rounded-xl border border-ui-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ui-text">Comissão do Instalador</p>
                  {form.comissaoAtiva
                    ? <p className="text-[11px] text-gray-500 mt-0.5">Valor calculado: <span className="text-ui-text font-semibold">{fmt(comissaoValor)}</span></p>
                    : <p className="text-[11px] text-gray-600 mt-0.5">Desativada — sem comissão nesta OS</p>
                  }
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, comissaoAtiva: !f.comissaoAtiva }))}
                  className={`relative rounded-full transition-colors ${form.comissaoAtiva ? 'bg-accent' : 'bg-surface-500'}`}
                  style={{ height: 22, width: 40 }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform"
                    style={{ width: 18, height: 18, transform: form.comissaoAtiva ? 'translateX(18px)' : 'translateX(0)' }}
                  />
                </button>
              </div>

              {form.comissaoAtiva && (
                <div className="space-y-2.5 pt-1 border-t border-ui-border/50">
                  <div className="flex gap-2">
                    {(['percentual', 'fixo'] as const).map(tipo => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, comissaoTipo: tipo }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          form.comissaoTipo === tipo
                            ? 'bg-accent/10 border-accent/40 text-accent'
                            : 'bg-surface-600 border-ui-border text-gray-500 hover:text-ui-text'
                        }`}
                      >
                        {tipo === 'percentual' ? 'Percentual (%)' : 'Valor Fixo (R$)'}
                      </button>
                    ))}
                  </div>

                  {form.comissaoTipo === 'percentual' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={form.comissaoPerc}
                        onChange={e => setForm(f => ({ ...f, comissaoPerc: +e.target.value }))}
                        className="w-20 bg-surface-600 border border-ui-border rounded-lg px-3 py-1.5 text-sm text-ui-text text-center focus:border-accent/50 outline-none"
                      />
                      <span className="text-sm text-gray-500">% sobre {fmt(valorTotalNova)}</span>
                      <span className="ml-auto text-sm font-bold text-ui-text">{fmt(comissaoValor)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">R$</span>
                      <input
                        type="number"
                        min={0}
                        step={10}
                        value={form.comissaoFixo}
                        onChange={e => setForm(f => ({ ...f, comissaoFixo: +e.target.value }))}
                        className="w-28 bg-surface-600 border border-ui-border rounded-lg px-3 py-1.5 text-sm text-ui-text focus:border-accent/50 outline-none"
                      />
                      <span className="text-[11px] text-gray-600">valor fixo independente do total</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── Seção 4: Observações ── */}
          <section className="space-y-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <MessageSquare size={12} /> Observações
            </p>
            <textarea
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              placeholder="Instruções especiais, cuidados com o veículo, solicitações do cliente..."
              rows={3}
              className="w-full bg-surface-700 border border-ui-border rounded-xl px-3 py-2.5 text-sm text-ui-text placeholder-gray-500 focus:border-accent/50 outline-none resize-none"
            />
          </section>
        </div>

        {/* Footer fixo: total + botões */}
        <div className="pt-5 mt-5 border-t border-ui-border space-y-3">
          <div className="flex items-center justify-between p-3 bg-surface-700 rounded-xl border border-ui-border">
            <Label>Valor Total da OS</Label>
            <span className="text-lg font-bold text-ui-text">{fmt(valorTotalNova)}</span>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => { setNovaOSOpen(false); resetForm() }}>
              Cancelar
            </Button>
            <ActionButton onClick={onSalvar}>
              <Check size={15} /> Salvar OS
            </ActionButton>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════
          MODAL: OS (unificado — mesmo componente usado no Pátio)
      ════════════════════════════════════════════════════════ */}
      <OSModal
        os={osAberta}
        cliente={osAberta ? getCliente(osAberta.clienteId) : null}
        veiculo={osAberta ? getVeiculo(osAberta.veiculoId) ?? null : null}
        instaladores={instaladores}
        onClose={() => setOsAberta(null)}
        onConfirmarConcluir={abrirConcluir}
        onExcluir={excluirOS}
      />

      <ConcluirOSModal
        os={concluirOSData}
        onClose={() => setConcluirOSData(null)}
      />

      {/* ════════════════════════════════════════════════════════
          MODAL: CONFIRMAR DELETE
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={!!confirmarDelete} onClose={() => setConfirmarDelete(null)} title="Confirmar exclusão" size="sm">
        <p className="text-sm text-gray-400 mb-5">Esta ação é irreversível. Deseja excluir esta OS?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmarDelete(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}><Trash2 size={14} />Excluir</Button>
        </div>
      </Modal>

      <CheckinRapido open={checkinOpen} onClose={() => setCheckinOpen(false)} />

      {/* ════════════════════════════════════════════════════════
          MODAL: VINCULAR AGENDAMENTO
      ════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!agendamentoSugerido}
        onClose={() => setAgendamentoSugerido(null)}
        title="Agendamento encontrado"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Existe um agendamento para este veículo/cliente hoje:
          </p>
          {agendamentoSugerido && (
            <div className="flex items-center gap-3 p-3.5 bg-surface-700 rounded-xl border border-ui-border">
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <Link size={16} className="text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ui-text">
                  Box {agendamentoSugerido.box} &mdash; {agendamentoSugerido.horario}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Agendado para hoje
                </p>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500">
            Deseja vincular esta OS ao agendamento? O box será definido conforme o agendamento.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={async () => { if (await confirmarVincularAgendamento()) setNovaOSOpen(false) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              <Link size={15} /> Sim, vincular ao agendamento
            </button>
            <button
              onClick={async () => { if (await recusarVincularAgendamento()) setNovaOSOpen(false) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm border border-ui-border text-gray-400 hover:text-ui-text hover:border-gray-600 transition-colors"
            >
              <Link2Off size={14} /> Não, criar OS sem vínculo
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
