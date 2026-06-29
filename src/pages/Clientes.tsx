import { useState, useRef } from 'react'
import {
  Plus, Search, Star, Pencil, Trash2, Car, ClipboardList,
  User, Phone, Mail, CheckCircle, RotateCcw,
  LayoutDashboard, X, Loader2, Check, Shield, Zap,
} from 'lucide-react'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ActionButton } from '../components/ActionButton'
import { Modal } from '../components/Modal'
import {
  useClientes,
  fmt, fmtDate, initials, isVip,
  COMO_CONHECEU, statusConfig,
} from '../hooks/useClientes'

// ── Estilos comuns ────────────────────────────────────────────────
const inputCls  = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-500 focus:border-accent/50 outline-none transition-colors'
const selectCls = `${inputCls} cursor-pointer`

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────
export function Clientes() {
  const {
    search, setSearch, filtered,
    statusFiltro, setStatusFiltro,
    totalClientes, vipCount, novosCount, posVendaCount,
    detalhes, setDetalhes,
    detVeics, detOsCliente, detUltimaVisita, detGarantias,
    editando,
    form, setForm, cepInput, setCepInput, cepResult,
    prepararNovo, prepararEditar, handleSalvarCliente, resetForm,
    confirmarDelete, setConfirmarDelete, handleDelete, handleReativar,
    veiculoForm, setVeiculoForm, placaResult,
    editVeiculoId, resetVeiculo, prepararEditarVeiculo, handleSalvarVeiculo,
    deletarVeiculoId, setDeletarVeiculoId, handleDeletarVeiculo,
    garEditForm, setGarEditForm,
    garDeletarId, setGarDeletarId,
    garAcionarId, setGarAcionarId,
    prepararEditarGar, handleSalvarGar,
    handleDeletarGar, handleAcionarGar,
  } = useClientes()

  // ── Pure UI state ─────────────────────────────────────────────
  const [novoOpen,      setNovoOpen]      = useState(false)
  const [abaDetalhes,   setAbaDetalhes]   = useState<'geral' | 'veiculos' | 'historico' | 'garantias'>('geral')
  const [addVeiculoOpen, setAddVeiculoOpen] = useState(false)
  const [garEditOpen,   setGarEditOpen]   = useState(false)
  const cepInputRef = useRef<HTMLInputElement>(null)

  // ── Wrapper handlers (data action + UI modal close) ───────────
  const onAbrirNovo = () => { prepararNovo(); setNovoOpen(true) }

  const onAbrirEditar = (c: typeof filtered[number]) => { prepararEditar(c); setNovoOpen(true) }

  const onSalvarCliente = () => { if (handleSalvarCliente()) setNovoOpen(false) }

  const onSalvarVeiculo = () => { if (handleSalvarVeiculo()) setAddVeiculoOpen(false) }

  const onSalvarGar = () => { if (handleSalvarGar()) setGarEditOpen(false) }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ui-text">Clientes</h1>
          <p className="text-gray-500 text-xs mt-0.5">Base de clientes da loja</p>
        </div>
        <Button onClick={onAbrirNovo}>
          <Plus size={15} /> Novo Cliente
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <p className="text-[11px] text-gray-500 font-medium">Total de Clientes</p>
          <p className="text-2xl font-bold mt-1.5 text-ui-text">{totalClientes}</p>
        </Card>
        <Card>
          <p className="text-[11px] text-gray-500 font-medium">Clientes VIP</p>
          <p className="text-2xl font-bold mt-1.5 text-amber-400">{vipCount}</p>
          <p className="text-[11px] text-gray-600 mt-1">≥ R$ 10.000 gastos</p>
        </Card>
        <Card>
          <p className="text-[11px] text-gray-500 font-medium">Novos este mês</p>
          <p className="text-2xl font-bold mt-1.5 text-emerald-400">{novosCount}</p>
        </Card>
        <Card>
          <p className="text-[11px] text-gray-500 font-medium">Pós-venda Pendente</p>
          <p className="text-2xl font-bold mt-1.5 text-accent">{posVendaCount}</p>
          <p className="text-[11px] text-gray-600 mt-1">Sem contato &gt; 30 dias</p>
        </Card>
      </div>

      {/* Busca + filtro de status */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            placeholder="Buscar por nome, e-mail, CPF ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-700 border border-ui-border rounded-lg pl-8 pr-4 py-2 text-sm text-ui-text placeholder-gray-500 focus:border-accent/50 outline-none transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {(['ativo', 'inativo'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFiltro(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                statusFiltro === s
                  ? 'bg-accent/10 border-accent/40 text-accent'
                  : 'bg-surface-700 border-ui-border text-gray-500 hover:text-gray-300'
              }`}
            >
              {s === 'ativo' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-ui-border">
          <h2 className="text-sm font-semibold text-ui-text">Todos os Clientes</h2>
          <p className="text-gray-600 text-xs mt-0.5">{filtered.length} clientes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ui-border">
                {['Cliente', 'Telefone', 'Como Conheceu', 'Total Gasto', 'Cadastro', 'Perfil', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-600 text-sm">
                    Nenhum cliente encontrado para "{search}"
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr
                  key={c.id}
                  onClick={() => { setDetalhes(c); setAbaDetalhes('geral') }}
                  className="hover:bg-surface-600/40 transition-colors cursor-pointer group"
                >
                  {/* Avatar + nome */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isVip(c) ? 'bg-amber-500/20 text-amber-400' : 'bg-surface-500 text-gray-400'
                      }`}>
                        {initials(c.nome)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ui-text flex items-center gap-1.5">
                          {c.nome}
                          {isVip(c) && <Star size={11} className="fill-amber-400 text-amber-400" />}
                        </p>
                        <p className="text-[11px] text-gray-600">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-sm text-gray-400">{c.telefone || '—'}</td>
                  <td className="py-3.5 px-4 text-sm text-gray-400">{c.comoConheceu}</td>
                  <td className="py-3.5 px-4 text-sm font-semibold text-ui-text">{fmt(c.totalGasto)}</td>
                  <td className="py-3.5 px-4 text-sm text-gray-500">{fmtDate(c.dataCadastro)}</td>
                  <td className="py-3.5 px-4">
                    {c.status === 'inativo'
                      ? <Badge label="Inativo" variant="default" />
                      : isVip(c)
                        ? <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium"><Star size={11} className="fill-amber-400" />VIP</span>
                        : <Badge label="Padrão" variant="default" />
                    }
                  </td>
                  {/* Ações no hover */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={e => { e.stopPropagation(); onAbrirEditar(c) }}
                        className="p-1.5 rounded-lg hover:bg-surface-500 text-gray-500 hover:text-ui-text transition-colors"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      {statusFiltro === 'inativo' ? (
                        <button
                          onClick={e => { e.stopPropagation(); handleReativar(c.id) }}
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-600 hover:text-emerald-400 transition-colors"
                          title="Reativar"
                        >
                          <RotateCcw size={13} />
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmarDelete(c.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ════════════════════════════════════════════════════
          MODAL: NOVO / EDITAR CLIENTE
      ════════════════════════════════════════════════════ */}
      <Modal
        isOpen={novoOpen}
        onClose={() => { setNovoOpen(false); resetForm() }}
        title={editando ? 'Editar Cliente' : 'Novo Cliente'}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Nome" required>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Telefone">
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                className={inputCls}
              />
            </Field>

            <Field label="E-mail">
              <input
                type="email"
                placeholder="email@exemplo.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={inputCls}
              />
            </Field>

            <Field label="CPF">
              <input
                type="text"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))}
                className={inputCls}
              />
            </Field>

            <Field label="CEP">
              <div className="relative">
                <input
                  ref={cepInputRef}
                  type="text"
                  placeholder="00000-000"
                  value={cepInput}
                  onChange={e => setCepInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className={`${inputCls} pr-8`}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {cepResult.loading && <Loader2 size={13} className="text-gray-500 animate-spin" />}
                  {cepResult.data && !cepResult.loading && <Check size={13} className="text-emerald-400" />}
                </div>
              </div>
              {cepResult.data && (
                <p className="mt-1 text-[11px] text-gray-500">
                  {cepResult.data.logradouro && `${cepResult.data.logradouro}, `}{cepResult.data.bairro && `${cepResult.data.bairro} — `}{cepResult.data.uf}
                </p>
              )}
            </Field>

            <div className="col-span-2">
              <Field label="Cidade">
                <input
                  type="text"
                  placeholder="São Paulo"
                  value={form.cidade}
                  onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Como nos conheceu">
                <select
                  value={form.comoConheceu}
                  onChange={e => setForm(f => ({ ...f, comoConheceu: e.target.value }))}
                  className={selectCls}
                >
                  {COMO_CONHECEU.map(op => <option key={op}>{op}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-ui-border">
            <Button variant="secondary" onClick={() => { setNovoOpen(false); resetForm() }}>
              Cancelar
            </Button>
            <ActionButton onClick={onSalvarCliente}>
              <CheckCircle size={15} />{editando ? 'Salvar alterações' : 'Cadastrar Cliente'}
            </ActionButton>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════
          MODAL: DETALHES DO CLIENTE
      ════════════════════════════════════════════════════ */}
      {detalhes && (
        <Modal
          isOpen
          onClose={() => { setDetalhes(null); setAddVeiculoOpen(false) }}
          title=""
          size="xl"
        >
          <div className="space-y-5 -mt-2">

            {/* Header do cliente */}
            <div className="flex items-start gap-4 p-4 bg-surface-700 rounded-xl border border-ui-border">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${
                isVip(detalhes) ? 'bg-amber-500/20 text-amber-400' : 'bg-surface-500 text-gray-300'
              }`}>
                {initials(detalhes.nome)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-ui-text">{detalhes.nome}</h2>
                  {isVip(detalhes)
                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"><Star size={10} className="fill-amber-400" />VIP</span>
                    : <Badge label="Padrão" variant="default" />
                  }
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  {detalhes.telefone && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-400"><Phone size={11} />{detalhes.telefone}</span>
                  )}
                  {detalhes.email && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-400"><Mail size={11} />{detalhes.email}</span>
                  )}
                  {detalhes.cpf && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500"><User size={11} />CPF: {detalhes.cpf}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Abas */}
            <div className="flex gap-1 border-b border-ui-border pb-0">
              {([
                { key: 'geral',     label: 'Visão Geral',                              icon: LayoutDashboard },
                { key: 'veiculos',  label: `Veículos (${detVeics.length})`,            icon: Car             },
                { key: 'historico', label: `Histórico de OS (${detOsCliente.length})`, icon: ClipboardList   },
                { key: 'garantias', label: `Garantias (${detGarantias.length})`,       icon: Shield          },
              ] as { key: 'geral' | 'veiculos' | 'historico' | 'garantias'; label: string; icon: typeof Car }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setAbaDetalhes(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all -mb-px ${
                    abaDetalhes === tab.key
                      ? 'border-accent text-accent bg-accent/5'
                      : 'border-transparent text-gray-500 hover:text-ui-text hover:border-gray-400'
                  }`}
                >
                  <tab.icon size={13} />{tab.label}
                </button>
              ))}
            </div>

            {/* ── Aba: Visão Geral ── */}
            {abaDetalhes === 'geral' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-surface-700 rounded-xl border border-ui-border">
                    <p className="text-[11px] text-gray-600 mb-1">Total Gasto</p>
                    <p className="text-xl font-bold text-ui-text">{fmt(detalhes.totalGasto)}</p>
                  </div>
                  <div className="p-3.5 bg-surface-700 rounded-xl border border-ui-border">
                    <p className="text-[11px] text-gray-600 mb-1">Ordens de Serviço</p>
                    <p className="text-xl font-bold text-ui-text">{detOsCliente.length}</p>
                  </div>
                  <div className="p-3.5 bg-surface-700 rounded-xl border border-ui-border">
                    <p className="text-[11px] text-gray-600 mb-1">Última Visita</p>
                    <p className="text-sm font-semibold text-ui-text">{detUltimaVisita}</p>
                  </div>
                  <div className="p-3.5 bg-surface-700 rounded-xl border border-ui-border">
                    <p className="text-[11px] text-gray-600 mb-1">Como Conheceu</p>
                    <p className="text-sm font-semibold text-ui-text">{detalhes.comoConheceu}</p>
                  </div>
                </div>
                <div className="p-3.5 bg-surface-700 rounded-xl border border-ui-border">
                  <p className="text-[11px] text-gray-600 mb-1">Cliente desde</p>
                  <p className="text-sm font-semibold text-ui-text">{fmtDate(detalhes.dataCadastro)}</p>
                </div>
              </div>
            )}

            {/* ── Aba: Veículos ── */}
            {abaDetalhes === 'veiculos' && (
              <div className="space-y-3">
                {detVeics.length === 0 ? (
                  <div className="py-10 text-center text-gray-600 text-sm">
                    <Car size={28} className="mx-auto mb-2 opacity-30" />
                    Nenhum veículo cadastrado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detVeics.map(v => (
                      <div key={v.id}>
                        {editVeiculoId === v.id ? (
                          <div className="p-4 bg-surface-700 rounded-xl border border-accent/30 space-y-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Editar Veículo</p>
                              <button onClick={resetVeiculo} className="text-gray-500 hover:text-ui-text"><X size={14} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <Field label="Marca" required><input value={veiculoForm.marca} onChange={e => setVeiculoForm(f => ({ ...f, marca: e.target.value }))} className={inputCls} /></Field>
                              <Field label="Modelo" required><input value={veiculoForm.modelo} onChange={e => setVeiculoForm(f => ({ ...f, modelo: e.target.value }))} className={inputCls} /></Field>
                              <Field label="Ano"><input type="number" value={veiculoForm.ano} onChange={e => setVeiculoForm(f => ({ ...f, ano: e.target.value }))} className={inputCls} /></Field>
                              <Field label="Cor"><input value={veiculoForm.cor} onChange={e => setVeiculoForm(f => ({ ...f, cor: e.target.value }))} className={inputCls} /></Field>
                              <div className="col-span-2">
                                <Field label="Placa" required>
                                  <div className="relative">
                                    <input value={veiculoForm.placa} onChange={e => setVeiculoForm(f => ({ ...f, placa: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8) }))} className={`${inputCls} uppercase font-mono pr-8`} />
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                      {placaResult.loading && <Loader2 size={13} className="text-gray-500 animate-spin" />}
                                      {placaResult.apiOk && !placaResult.loading && <Check size={13} className="text-emerald-400" />}
                                    </div>
                                  </div>
                                  {placaResult.apiOk && <p className="mt-1 text-[11px] text-emerald-400">Dados preenchidos automaticamente</p>}
                                </Field>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="secondary" onClick={resetVeiculo}>Cancelar</Button>
                              <Button size="sm" onClick={onSalvarVeiculo}>Salvar</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="group flex items-center gap-3 p-3.5 bg-surface-700 rounded-xl border border-ui-border">
                            <div className="w-8 h-8 bg-surface-600 rounded-lg flex items-center justify-center shrink-0">
                              <Car size={15} className="text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-ui-text">{v.marca} {v.modelo} {v.ano}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5">{v.cor} · <span className="font-mono">{v.placa}</span></p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { prepararEditarVeiculo(v); setAddVeiculoOpen(false) }} className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-ui-text transition-colors"><Pencil size={12} /></button>
                              <button onClick={() => setDeletarVeiculoId(v.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Botão + sub-form de adicionar veículo */}
                {!addVeiculoOpen ? (
                  <button
                    onClick={() => setAddVeiculoOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-ui-border text-xs text-gray-500 hover:border-accent/40 hover:text-accent transition-all"
                  >
                    <Plus size={14} /> Adicionar Veículo
                  </button>
                ) : (
                  <div className="p-4 bg-surface-700 rounded-xl border border-accent/30 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Novo Veículo</p>
                      <button onClick={() => { setAddVeiculoOpen(false); resetVeiculo() }} className="text-gray-500 hover:text-ui-text"><X size={14} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Marca" required>
                        <input placeholder="Ex: Toyota" value={veiculoForm.marca} onChange={e => setVeiculoForm(f => ({ ...f, marca: e.target.value }))} className={inputCls} />
                      </Field>
                      <Field label="Modelo" required>
                        <input placeholder="Ex: Corolla" value={veiculoForm.modelo} onChange={e => setVeiculoForm(f => ({ ...f, modelo: e.target.value }))} className={inputCls} />
                      </Field>
                      <Field label="Ano">
                        <input type="number" placeholder={String(new Date().getFullYear())} value={veiculoForm.ano} onChange={e => setVeiculoForm(f => ({ ...f, ano: e.target.value }))} className={inputCls} />
                      </Field>
                      <Field label="Cor">
                        <input placeholder="Ex: Preto" value={veiculoForm.cor} onChange={e => setVeiculoForm(f => ({ ...f, cor: e.target.value }))} className={inputCls} />
                      </Field>
                      <div className="col-span-2">
                        <Field label="Placa" required>
                          <div className="relative">
                            <input
                              placeholder="ABC1D23"
                              value={veiculoForm.placa}
                              onChange={e => setVeiculoForm(f => ({ ...f, placa: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8) }))}
                              className={`${inputCls} uppercase font-mono pr-8`}
                            />
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                              {placaResult.loading && <Loader2 size={13} className="text-gray-500 animate-spin" />}
                              {placaResult.apiOk && !placaResult.loading && <Check size={13} className="text-emerald-400" />}
                            </div>
                          </div>
                          {placaResult.apiOk && (
                            <p className="mt-1 text-[11px] text-emerald-400">Dados preenchidos automaticamente</p>
                          )}
                        </Field>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="secondary" onClick={() => { setAddVeiculoOpen(false); resetVeiculo() }}>Cancelar</Button>
                      <Button size="sm" onClick={onSalvarVeiculo}><Plus size={13} />Salvar Veículo</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Aba: Histórico de OS ── */}
            {abaDetalhes === 'historico' && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {detOsCliente.length === 0 ? (
                  <div className="py-10 text-center text-gray-600 text-sm">
                    <ClipboardList size={28} className="mx-auto mb-2 opacity-30" />
                    Nenhuma OS encontrada
                  </div>
                ) : detOsCliente.map(os => {
                  const sc = statusConfig[os.status]
                  return (
                    <div key={os.id} className="flex items-center gap-3 p-3 bg-surface-700 rounded-xl border border-ui-border">
                      <span className="text-xs font-mono text-accent font-semibold shrink-0">#{os.numero}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ui-text truncate">{os.servicos.map(s => s.nome).join(', ')}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{fmtDate(os.dataCriacao)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-ui-text">{fmt(os.valorTotal)}</p>
                        <div className="mt-0.5"><Badge label={sc.label} variant={sc.variant} /></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Aba: Garantias ── */}
            {abaDetalhes === 'garantias' && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {detGarantias.length === 0 ? (
                  <div className="py-10 text-center text-gray-600 text-sm">
                    <Shield size={28} className="mx-auto mb-2 opacity-30" />
                    Nenhuma garantia encontrada
                  </div>
                ) : detGarantias.map(g => (
                  <div key={g.id} className="group flex items-center gap-3 p-3.5 bg-surface-700 rounded-xl border border-ui-border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-accent font-semibold">#{g.osNumero ?? '—'}</span>
                        <p className="text-sm font-medium text-ui-text truncate">{g.servico || '—'}</p>
                        <Badge label={g.displayStatus.label} variant={g.displayStatus.variant} />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {g.produto && `${g.produto} · `}
                        Válida até {new Date(g.dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}
                        {g.diasRestantes >= 0 ? ` (${g.diasRestantes}d)` : ` (${Math.abs(g.diasRestantes)}d atrás)`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {g.status === 'ativa' && (
                        <button
                          onClick={() => setGarAcionarId(g.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                        >
                          <Zap size={11} />Acionar
                        </button>
                      )}
                      <button onClick={() => { prepararEditarGar(g); setGarEditOpen(true) }} className="p-1.5 rounded-lg hover:bg-surface-500 text-gray-500 hover:text-ui-text transition-colors">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => setGarDeletarId(g.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer do modal detalhes */}
            <div className="flex items-center justify-between pt-4 border-t border-ui-border">
              <Button
                variant="danger"
                size="sm"
                onClick={() => { setConfirmarDelete(detalhes.id); setDetalhes(null) }}
              >
                <Trash2 size={13} /> Excluir Cliente
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setDetalhes(null); setAddVeiculoOpen(false) }}>
                  Fechar
                </Button>
                <Button onClick={() => { prepararEditar(detalhes); setDetalhes(null); setNovoOpen(true) }}>
                  <Pencil size={13} /> Editar Cliente
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL: CONFIRMAR EXCLUSÃO DE VEÍCULO
      ════════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!deletarVeiculoId}
        onClose={() => setDeletarVeiculoId(null)}
        title="Remover veículo"
        size="sm"
      >
        <p className="text-sm text-gray-400 mb-5">Confirma a remoção deste veículo? Esta ação não pode ser desfeita.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeletarVeiculoId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDeletarVeiculo}><Trash2 size={14} /> Remover</Button>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════
          MODAL: CONFIRMAR EXCLUSÃO
      ════════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!confirmarDelete}
        onClose={() => setConfirmarDelete(null)}
        title="Confirmar exclusão"
        size="sm"
      >
        <p className="text-sm text-gray-400 mb-5">
          Esta ação é irreversível. O cliente e todos os seus dados serão removidos.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmarDelete(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 size={14} /> Excluir
          </Button>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════
          MODAIS: GARANTIA
      ════════════════════════════════════════════════════ */}
      <Modal isOpen={garEditOpen} onClose={() => setGarEditOpen(false)} title="Editar Garantia" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Serviço</label>
            <input
              value={garEditForm.servico}
              onChange={e => setGarEditForm(p => ({ ...p, servico: e.target.value }))}
              placeholder="Ex: PPF Full Body"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Produto</label>
            <input
              value={garEditForm.produto}
              onChange={e => setGarEditForm(p => ({ ...p, produto: e.target.value }))}
              placeholder="Ex: Filme PPF Xpel Ultimate Plus"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Data Início</label>
              <input
                type="date"
                value={garEditForm.dataInicio}
                onChange={e => setGarEditForm(p => ({ ...p, dataInicio: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Data Vencimento <span className="text-accent">*</span></label>
              <input
                type="date"
                value={garEditForm.dataFim}
                onChange={e => setGarEditForm(p => ({ ...p, dataFim: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={() => setGarEditOpen(false)}>Cancelar</Button>
            <Button onClick={onSalvarGar}>Salvar Alterações</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!garDeletarId} onClose={() => setGarDeletarId(null)} title="Excluir Garantia" size="sm">
        <p className="text-sm text-gray-400 mb-5">Tem certeza que deseja excluir esta garantia? Essa ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setGarDeletarId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDeletarGar}>Excluir</Button>
        </div>
      </Modal>

      <Modal isOpen={!!garAcionarId} onClose={() => setGarAcionarId(null)} title="Acionar Garantia" size="sm">
        <p className="text-sm text-gray-400 mb-5">Confirma o acionamento desta garantia? O status será alterado para "Acionada".</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setGarAcionarId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleAcionarGar}>Acionar Garantia</Button>
        </div>
      </Modal>
    </div>
  )
}
