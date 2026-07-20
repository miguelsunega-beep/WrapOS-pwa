import { Fragment, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Search, X, Check, Zap, Loader2, Car, ChevronRight,
  Plus, AlertCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { DateField } from './DateField'
import { usePlacaLookup } from '../hooks/usePlacaLookup'
import { todayLocal } from '../lib/dateUtils'
import type { Cliente, Veiculo, Instalador, OrdemServico } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────

const CORES_VEICULO: { nome: string; hex: string }[] = [
  { nome: 'Preto', hex: '#1a1a1a' }, { nome: 'Branco', hex: '#e5e5e5' },
  { nome: 'Prata', hex: '#c4c8cc' }, { nome: 'Cinza', hex: '#6b7280' },
  { nome: 'Vermelho', hex: '#c0392b' }, { nome: 'Azul', hex: '#2563eb' },
  { nome: 'Verde', hex: '#16a34a' }, { nome: 'Amarelo', hex: '#eab308' },
  { nome: 'Laranja', hex: '#ea580c' }, { nome: 'Marrom', hex: '#78350f' },
  { nome: 'Bege', hex: '#d6c7a1' }, { nome: 'Dourado', hex: '#c8a44d' },
  { nome: 'Vinho', hex: '#7b1e3a' }, { nome: 'Grafite', hex: '#3a3f44' },
]

const inputCls =
  'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text focus:border-accent/50 outline-none transition-colors placeholder-gray-500'
const errInputCls =
  'w-full bg-surface-700 border border-red-500/50 rounded-lg px-3 py-2 text-sm text-ui-text focus:border-red-400/70 outline-none transition-colors placeholder-gray-500'

const slideVariants = {
  enter: (d: number) => ({ x: d * 44, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit:  (d: number) => ({ x: -d * 44, opacity: 0, transition: { duration: 0.14 } }),
}

// ── Step sub-renderers ───────────────────────────────────────────

function StepCliente({
  busca, setBusca, clienteSel, clientesFiltrados, showDrop, setShowDrop,
  onSelecionar, onClear, criando, setCriando,
  novoNome, setNovoNome, novoTel, setNovoTel, errors,
}: {
  busca: string; setBusca: (v: string) => void
  clienteSel: Cliente | null
  clientesFiltrados: Cliente[]
  showDrop: boolean; setShowDrop: (v: boolean) => void
  onSelecionar: (c: Cliente) => void; onClear: () => void
  criando: boolean; setCriando: (v: boolean) => void
  novoNome: string; setNovoNome: (v: string) => void
  novoTel: string; setNovoTel: (v: string) => void
  errors: Record<string, string>
}) {
  // When a client is selected, show compact view — hide search
  if (clienteSel && !criando) {
    return (
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3.5 rounded-xl"
          style={{ backgroundColor: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.20)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Check size={14} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-ui-text">{clienteSel.nome}</p>
              {clienteSel.telefone && (
                <p className="text-[11px] text-gray-500">{clienteSel.telefone}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClear}
            className="text-[11px] font-medium transition-colors text-gray-500 hover:text-ui-text"
          >
            Trocar cliente
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Buscar cliente existente
        </p>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Nome ou telefone..."
            value={busca}
            disabled={criando}
            onChange={e => setBusca(e.target.value)}
            onFocus={() => busca && setShowDrop(true)}
            className={`${errors.busca && !clienteSel && !criando ? errInputCls : inputCls} pl-8 pr-8 disabled:opacity-40`}
          />
          {busca && !criando && (
            <button
              onClick={onClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-ui-text transition-colors"
            >
              <X size={13} />
            </button>
          )}

          <AnimatePresence>
            {showDrop && busca.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute z-30 left-0 right-0 top-full mt-1 bg-surface-700 border border-ui-border rounded-xl shadow-2xl overflow-hidden"
              >
                {clientesFiltrados.length === 0 ? (
                  <div className="px-3 py-3 text-center">
                    <p className="text-xs text-gray-500">Nenhum cliente encontrado</p>
                  </div>
                ) : (
                  clientesFiltrados.map(c => (
                    <button
                      key={c.id}
                      onMouseDown={() => onSelecionar(c)}
                      className="w-full text-left px-3 py-2.5 hover:bg-surface-600 border-b border-ui-border/50 last:border-0 transition-colors"
                    >
                      <p className="text-sm font-medium text-ui-text">{c.nome}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{c.telefone}</p>
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {errors.busca && !clienteSel && !criando && (
          <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
            <AlertCircle size={11} />{errors.busca}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-ui-border" />
        <span className="text-[10px] text-gray-600 font-medium">ou</span>
        <div className="flex-1 h-px bg-ui-border" />
      </div>

      <div>
        {!criando ? (
          <button
            onClick={() => setCriando(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-ui-border text-gray-500 hover:border-accent/40 hover:text-accent hover:bg-accent/5 transition-all text-sm font-medium"
          >
            <Plus size={14} />
            Criar novo cliente
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 p-4 bg-surface-700 rounded-xl border border-ui-border"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-ui-text">Novo cliente</p>
              <button onClick={() => setCriando(false)} className="text-gray-500 hover:text-ui-text transition-colors">
                <X size={13} />
              </button>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">Nome <span className="text-accent">*</span></label>
              <input
                type="text"
                placeholder="Nome completo"
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                className={errors.novoNome ? errInputCls : inputCls}
                autoFocus
              />
              {errors.novoNome && (
                <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors.novoNome}</p>
              )}
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">Telefone <span className="text-accent">*</span></label>
              <input
                type="text"
                placeholder="(11) 99999-0000"
                value={novoTel}
                onChange={e => setNovoTel(e.target.value)}
                className={errors.novoTel ? errInputCls : inputCls}
              />
              {errors.novoTel && (
                <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors.novoTel}</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function StepVeiculo({
  veiculosDoCliente, veiculoSel, setVeiculoSel,
  placaRaw, setPlacaRaw, placaLoading, placaApiOk,
  novaMarca, setNovaMarca, novoModelo, setNovoModelo,
  novoAno, setNovoAno, novaCor, setNovaCor,
  showExtras, setShowExtras, errors,
}: {
  veiculosDoCliente: Veiculo[]
  veiculoSel: Veiculo | null; setVeiculoSel: (v: Veiculo | null) => void
  placaRaw: string; setPlacaRaw: (v: string) => void
  placaLoading: boolean; placaApiOk: boolean
  novaMarca: string; setNovaMarca: (v: string) => void
  novoModelo: string; setNovoModelo: (v: string) => void
  novoAno: number; setNovoAno: (v: number) => void
  novaCor: string; setNovaCor: (v: string) => void
  showExtras: boolean; setShowExtras: (v: boolean) => void
  errors: Record<string, string>
}) {
  return (
    <div className="space-y-4">
      {veiculosDoCliente.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Veículos cadastrados</p>
          <div className="flex flex-wrap gap-2">
            {veiculosDoCliente.map(v => {
              const sel = veiculoSel?.id === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setVeiculoSel(sel ? null : v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    sel
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'bg-surface-700 border-ui-border text-gray-400 hover:border-gray-500 hover:text-ui-text'
                  }`}
                >
                  <Car size={11} />
                  {v.marca} {v.modelo} · <span className="font-mono">{v.placa}</span>
                  {sel && <Check size={11} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {veiculosDoCliente.length > 0 && !veiculoSel && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-ui-border" />
          <span className="text-[10px] text-gray-600 font-medium">ou cadastrar novo</span>
          <div className="flex-1 h-px bg-ui-border" />
        </div>
      )}

      {!veiculoSel && (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">Placa <span className="text-accent">*</span></label>
            <div className="relative">
              <input
                type="text"
                placeholder="ABC1D23"
                value={placaRaw}
                onChange={e => setPlacaRaw(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8))}
                maxLength={8}
                className={`${errors.placa ? errInputCls : inputCls} pr-10 font-mono tracking-widest`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {placaLoading && <Loader2 size={14} className="text-gray-500 animate-spin" />}
                {placaApiOk && !placaLoading && <Check size={14} className="text-emerald-400" />}
              </div>
            </div>
            {placaApiOk && (
              <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
                <Check size={10} /> Dados preenchidos automaticamente
              </p>
            )}
            {errors.placa && (
              <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors.placa}</p>
            )}
          </div>

          <AnimatePresence>
            {(placaRaw.replace(/[^A-Z0-9]/gi, '').length >= 7 || novaMarca || novoModelo) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3"
              >
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">Marca <span className="text-accent">*</span></label>
                  <input
                    type="text"
                    placeholder="Ex: Toyota"
                    value={novaMarca}
                    onChange={e => setNovaMarca(e.target.value)}
                    className={errors.marca ? errInputCls : inputCls}
                  />
                  {errors.marca && (
                    <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors.marca}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">Modelo <span className="text-accent">*</span></label>
                  <input
                    type="text"
                    placeholder="Ex: Corolla"
                    value={novoModelo}
                    onChange={e => setNovoModelo(e.target.value)}
                    className={errors.modelo ? errInputCls : inputCls}
                  />
                  {errors.modelo && (
                    <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors.modelo}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(placaRaw.replace(/[^A-Z0-9]/gi, '').length >= 7 || novaMarca) && (
            <div className="space-y-3">
              <div className="w-40">
                <label className="text-[11px] text-gray-500 block mb-1">Ano</label>
                <input
                  type="number"
                  value={novoAno}
                  onChange={e => setNovoAno(Number(e.target.value))}
                  min={1990}
                  max={new Date().getFullYear() + 1}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1.5">Cor</label>
                <div className="flex flex-wrap gap-1.5">
                  {CORES_VEICULO.map(c => {
                    const sel = novaCor.trim().toLowerCase() === c.nome.toLowerCase()
                    return (
                      <button
                        key={c.nome}
                        type="button"
                        onClick={() => setNovaCor(c.nome)}
                        title={c.nome}
                        className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                          sel ? 'border-accent/50 bg-accent/10 text-ui-text' : 'border-ui-border bg-surface-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: c.hex, border: '1px solid rgba(128,128,128,0.35)' }} />
                        {c.nome}
                      </button>
                    )
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Outra cor (opcional)"
                  value={CORES_VEICULO.some(c => c.nome.toLowerCase() === novaCor.trim().toLowerCase()) ? '' : novaCor}
                  onChange={e => setNovaCor(e.target.value)}
                  className={`${inputCls} mt-2`}
                />
              </div>
            </div>
          )}

          {(placaRaw.replace(/[^A-Z0-9]/gi, '').length >= 7 || novaMarca) && (
            <button
              onClick={() => setShowExtras(!showExtras)}
              className="text-[11px] text-gray-500 hover:text-accent transition-colors"
            >
              {showExtras ? '▲ Ocultar campos opcionais' : '▼ Mostrar campos opcionais (KM)'}
            </button>
          )}

          {showExtras && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              <label className="text-[11px] text-gray-500 block mb-1">KM atual</label>
              <input type="number" placeholder="Ex: 45000" className={inputCls} />
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}

function StepServicos({
  servicos, servicoSel, setServicoSel, servicoValor, setServicoValor, obsOS, setObsOS, errors,
}: {
  servicos: { id: string; nome: string }[]
  servicoSel: string; setServicoSel: (v: string) => void
  servicoValor: string; setServicoValor: (v: string) => void
  obsOS: string; setObsOS: (v: string) => void
  errors: Record<string, string>
}) {
  return (
    <div className="space-y-4">
      {errors.servicos && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <AlertCircle size={11} />{errors.servicos}
        </p>
      )}
      <div>
        <label className="text-[11px] text-gray-500 block mb-1.5">Serviço</label>
        <select
          value={servicoSel}
          onChange={e => setServicoSel(e.target.value)}
          className={inputCls}
        >
          <option value="">Selecionar serviço…</option>
          {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[11px] text-gray-500 block mb-1.5">Valor (R$)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] select-none text-gray-500">R$</span>
          <input
            type="number" min={0} step={10} placeholder="0"
            value={servicoValor}
            onChange={e => setServicoValor(e.target.value)}
            className={`${inputCls} pl-8`}
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-gray-500 block mb-1">Observações (opcional)</label>
        <textarea
          value={obsOS}
          onChange={e => setObsOS(e.target.value)}
          placeholder="Instruções especiais, cuidados..."
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>
    </div>
  )
}

function StepPeriodo({
  instaladores, instSel, setInstSel,
  mesmoDia, setMesmoDia, dataEntrada, setDataEntrada, dataSaida, setDataSaida,
}: {
  instaladores: Instalador[]
  instSel: string; setInstSel: (v: string) => void
  mesmoDia: boolean; setMesmoDia: (v: boolean) => void
  dataEntrada: string; setDataEntrada: (v: string) => void
  dataSaida: string; setDataSaida: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      {mesmoDia ? (
        <div>
          <label className="text-[11px] text-gray-500 block mb-1.5">Data de entrada</label>
          <DateField value={dataEntrada} onChange={(iso) => { setDataEntrada(iso); setDataSaida(iso) }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-gray-500 block mb-1.5">Entrada</label>
            <DateField value={dataEntrada} onChange={(iso) => setDataEntrada(iso)} />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1.5">Saída prevista</label>
            <DateField value={dataSaida} min={dataEntrada} onChange={(iso) => setDataSaida(iso)} />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => { const v = !mesmoDia; setMesmoDia(v); if (v) setDataSaida(dataEntrada) }}
        className="flex items-center gap-2 text-sm font-medium transition-colors"
        style={{ color: mesmoDia ? 'var(--wrap-accent)' : 'var(--wrap-muted)' }}
      >
        <span className="relative rounded-full transition-colors" style={{ height: 22, width: 40, background: mesmoDia ? 'var(--wrap-accent)' : 'var(--surface-500)' }}>
          <span className="absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform" style={{ width: 18, height: 18, transform: mesmoDia ? 'translateX(18px)' : 'translateX(0)' }} />
        </span>
        Entra e sai no mesmo dia
      </button>

      <div>
        <label className="text-[11px] text-gray-500 block mb-1.5">Responsável</label>
        <select value={instSel} onChange={e => setInstSel(e.target.value)} className={`${inputCls} cursor-pointer`}>
          <option value="">— Selecionar responsável —</option>
          {instaladores.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
        </select>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────

export function CheckinRapido({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    clientes, veiculos, instaladores, servicos,
    adicionarClienteSequencial, adicionarVeiculoSequencial, adicionarOSSequencial,
  } = useApp()

  const [salvando, setSalvando] = useState(false)

  const hoje = todayLocal()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const stepDir = useRef<1 | -1>(1)

  // Step 1: Cliente
  const [busca, setBusca]           = useState('')
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null)
  const [showDrop, setShowDrop]     = useState(false)
  const [criando, setCriando]       = useState(false)
  const [novoNome, setNovoNome]     = useState('')
  const [novoTel, setNovoTel]       = useState('')

  // Step 2: Veículo
  const [placaRaw, setPlacaRaw]       = useState('')
  const [veiculoSel, setVeiculoSel]   = useState<Veiculo | null>(null)
  const [novaMarca, setNovaMarca]     = useState('')
  const [novoModelo, setNovoModelo]   = useState('')
  const [novoAno, setNovoAno]         = useState(new Date().getFullYear())
  const [novaCor, setNovaCor]         = useState('')
  const [showExtras, setShowExtras]   = useState(false)

  // Placa API via hook
  const { loading: placaLoading, apiOk: placaApiOk, data: placaData } = usePlacaLookup(placaRaw)

  useEffect(() => {
    if (placaData && !veiculoSel) {
      setNovaMarca(placaData.marca)
      setNovoModelo(placaData.modelo)
      setNovoAno(placaData.ano)
      setNovaCor(placaData.cor)
    }
  }, [placaData, veiculoSel])

  // Step 3: Serviços
  const [servicoSel, setServicoSel]   = useState('')
  const [servicoValor, setServicoValor] = useState('')
  const [obsOS, setObsOS]             = useState('')

  // Step 4: Período
  const [mesmoDia, setMesmoDia]         = useState(true)
  const [dataEntrada, setDataEntrada]   = useState(hoje)
  const [dataSaida, setDataSaida]       = useState(hoje)
  const [instSel, setInstSel]           = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})

  const reset = useCallback(() => {
    setStep(1); stepDir.current = 1
    setBusca(''); setClienteSel(null); setShowDrop(false)
    setCriando(false); setNovoNome(''); setNovoTel('')
    setPlacaRaw(''); setVeiculoSel(null)
    setNovaMarca(''); setNovoModelo(''); setNovoAno(new Date().getFullYear()); setNovaCor('')
    setShowExtras(false)
    setServicoSel(''); setServicoValor(''); setObsOS('')
    const today = todayLocal()
    setMesmoDia(true); setDataEntrada(today); setDataSaida(today)
    setInstSel('')
    setErrors({})
  }, [])

  useEffect(() => { if (!open) reset() }, [open, reset])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Derived
  const veiculosDoCliente = useMemo(
    () => clienteSel ? veiculos.filter(v => v.clienteId === clienteSel.id) : [],
    [clienteSel, veiculos],
  )

  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return []
    const q = busca.toLowerCase()
    return clientes
      .filter(c => c.nome.toLowerCase().includes(q) || c.telefone.includes(q))
      .slice(0, 6)
  }, [busca, clientes])

  // Navigation
  const goNext = () => {
    const errs: Record<string, string> = {}
    if (step === 1) {
      if (!clienteSel && !criando) errs.busca = 'Selecione ou crie um cliente.'
      if (criando) {
        if (!novoNome.trim()) errs.novoNome = 'Nome obrigatório.'
        if (!novoTel.trim()) errs.novoTel = 'Telefone obrigatório.'
      }
    }
    if (step === 2 && !veiculoSel) {
      const limpa = placaRaw.replace(/[^A-Z0-9]/gi, '')
      if (limpa.length < 7) errs.placa = 'Placa deve ter 7 caracteres.'
      if (!novaMarca.trim()) errs.marca = 'Marca obrigatória.'
      if (!novoModelo.trim()) errs.modelo = 'Modelo obrigatório.'
    }
    if (step === 3) {
      if (!servicoSel) errs.servicos = 'Selecione um serviço.'
      else if (!(parseFloat(servicoValor) > 0)) errs.servicos = 'Informe o valor cobrado.'
    }

    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    stepDir.current = 1
    setStep(s => (s + 1) as typeof s)
  }

  const goBack = () => {
    setErrors({})
    stepDir.current = -1
    setStep(s => (s - 1) as typeof s)
  }

  const goToStep = (target: 1 | 2 | 3 | 4) => {
    if (target >= step) return
    setErrors({})
    stepDir.current = -1
    setStep(target)
  }

  // Cliente → veículo → OS precisam ser criados em sequência estrita e awaited:
  // veículo referencia clienteId e OS referencia veiculoId via FK composta
  // (lojaId, id) — disparar as três em paralelo/otimista faz o insert do
  // veículo/OS chegar no Postgres antes do registro que ele referencia existir.
  const confirmar = async (overrideBox?: number, overrideInst?: string) => {
    if (salvando) return
    const finalBox  = overrideBox ?? 0
    const finalInst = overrideInst ?? instSel

    setSalvando(true)
    try {
      // 1. Resolve clienteId
      let clienteId = clienteSel?.id ?? ''
      if (criando) {
        try {
          clienteId = await adicionarClienteSequencial({
            nome: novoNome.trim(),
            telefone: novoTel.trim(),
            email: '', cpf: '',
            comoConheceu: 'Check-in Rápido',
            dataCadastro: todayLocal(),
            totalGasto: 0,
          })
        } catch {
          toast.error('Não foi possível criar o cliente. Tente novamente.')
          return
        }
      }

      // 2. Resolve veiculoId (depende do clienteId já confirmado no passo 1)
      let veiculoId = veiculoSel?.id ?? ''
      if (!veiculoSel) {
        const limpa = placaRaw.replace(/[^A-Z0-9]/gi, '').toUpperCase()
        const placaFmt = limpa.length === 7 ? `${limpa.slice(0, 3)}-${limpa.slice(3)}` : limpa
        try {
          veiculoId = await adicionarVeiculoSequencial({
            clienteId,
            marca: novaMarca, modelo: novoModelo, ano: novoAno, cor: novaCor,
            placa: placaFmt,
          })
        } catch {
          toast.error('Não foi possível criar o veículo. Tente novamente.')
          return
        }
      }

      // 3. Build item from catalog service
      const serv = servicos.find(s => s.id === servicoSel)
      const valorNum = parseFloat(servicoValor) || 0
      const itens = serv ? [{ servicoId: serv.id, nome: serv.nome, preco: valorNum }] : []
      const valorTotal = valorNum
      const nomeCliente  = criando ? novoNome.trim() : (clienteSel?.nome ?? '')
      const labelVeiculo = veiculoSel
        ? `${veiculoSel.marca} ${veiculoSel.modelo}`
        : `${novaMarca} ${novoModelo}`.trim()

      // 4. Criar a OS (depende do veiculoId já confirmado no passo 2)
      let numero: number
      try {
        numero = await adicionarOSSequencial({
          clienteId, veiculoId,
          servicos: itens,
          valorTotal,
          formaPagamento: 'A definir',
          instaladorId: finalInst,
          box: finalBox,
          comissao: 0,
          observacoes: obsOS,
          status: 'aguardando_aprovacao',
          dataEntrada,
          dataSaidaPrevista: mesmoDia ? dataEntrada : (dataSaida || undefined),
        } as Omit<OrdemServico, 'id' | 'numero' | 'dataCriacao'>)
      } catch {
        toast.error('Não foi possível criar a ordem de serviço. Tente novamente.')
        return
      }

      toast.success(`OS #${numero} criada — ${nomeCliente} · ${labelVeiculo}`)
      onClose()
    } finally {
      setSalvando(false)
    }
  }

  const STEPS = ['Cliente', 'Veículo', 'Serviços', 'Período'] as const

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative z-10 w-full max-w-[560px] bg-surface-800 rounded-2xl border border-ui-border shadow-2xl flex flex-col"
            style={{ maxHeight: '90vh' }}
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Zap size={14} className="text-accent" />
                </div>
                <h2 className="text-base font-bold text-ui-text">Check-in Rápido</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-500 hover:text-ui-text hover:bg-surface-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stepper */}
            <div className="flex items-start px-8 py-4 border-b border-ui-border shrink-0">
              {STEPS.map((label, i) => {
                const s = (i + 1) as 1 | 2 | 3 | 4
                const done = s < step
                const curr = s === step
                return (
                  <Fragment key={label}>
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => done ? goToStep(s) : undefined}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all ${
                          curr
                            ? 'bg-accent border-accent text-white shadow-sm shadow-accent/40'
                            : done
                              ? 'bg-emerald-500 border-emerald-500 text-white cursor-pointer hover:opacity-80'
                              : 'border-gray-600 text-gray-600 cursor-default'
                        }`}
                      >
                        {done ? <Check size={11} /> : s}
                      </button>
                      <span className={`text-[10px] font-medium whitespace-nowrap ${
                        curr ? 'text-accent' : done ? 'text-emerald-400' : 'text-gray-600'
                      }`}>
                        {label}
                      </span>
                    </div>
                    {i < 3 && (
                      <div className={`flex-1 h-px mt-3.5 mx-1 transition-colors ${done ? 'bg-emerald-500' : 'bg-gray-700'}`} />
                    )}
                  </Fragment>
                )
              })}
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <AnimatePresence mode="wait" custom={stepDir.current}>
                <motion.div
                  key={step}
                  custom={stepDir.current}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="p-6 space-y-4"
                >
                  {step === 1 && (
                    <StepCliente
                      busca={busca}
                      setBusca={v => { setBusca(v); setShowDrop(true); setClienteSel(null); setCriando(false) }}
                      clienteSel={clienteSel}
                      clientesFiltrados={clientesFiltrados}
                      showDrop={showDrop}
                      setShowDrop={setShowDrop}
                      onSelecionar={c => { setClienteSel(c); setBusca(c.nome); setShowDrop(false); setCriando(false) }}
                      onClear={() => { setClienteSel(null); setBusca(''); setCriando(false) }}
                      criando={criando}
                      setCriando={v => { setCriando(v); if (v) { setClienteSel(null); setBusca('') } }}
                      novoNome={novoNome}
                      setNovoNome={setNovoNome}
                      novoTel={novoTel}
                      setNovoTel={setNovoTel}
                      errors={errors}
                    />
                  )}
                  {step === 2 && (
                    <StepVeiculo
                      veiculosDoCliente={veiculosDoCliente}
                      veiculoSel={veiculoSel}
                      setVeiculoSel={v => { setVeiculoSel(v); if (v) { setPlacaRaw(''); setNovaMarca(''); setNovoModelo('') } }}
                      placaRaw={placaRaw}
                      setPlacaRaw={v => { setPlacaRaw(v); setVeiculoSel(null) }}
                      placaLoading={placaLoading}
                      placaApiOk={placaApiOk}
                      novaMarca={novaMarca}
                      setNovaMarca={setNovaMarca}
                      novoModelo={novoModelo}
                      setNovoModelo={setNovoModelo}
                      novoAno={novoAno}
                      setNovoAno={setNovoAno}
                      novaCor={novaCor}
                      setNovaCor={setNovaCor}
                      showExtras={showExtras}
                      setShowExtras={setShowExtras}
                      errors={errors}
                    />
                  )}
                  {step === 3 && (
                    <StepServicos
                      servicos={servicos}
                      servicoSel={servicoSel}
                      setServicoSel={setServicoSel}
                      servicoValor={servicoValor}
                      setServicoValor={setServicoValor}
                      obsOS={obsOS}
                      setObsOS={setObsOS}
                      errors={errors}
                    />
                  )}
                  {step === 4 && (
                    <StepPeriodo
                      instaladores={instaladores.filter(i => i.ativo)}
                      instSel={instSel}
                      setInstSel={setInstSel}
                      mesmoDia={mesmoDia}
                      setMesmoDia={setMesmoDia}
                      dataEntrada={dataEntrada}
                      setDataEntrada={setDataEntrada}
                      dataSaida={dataSaida}
                      setDataSaida={setDataSaida}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-ui-border shrink-0 rounded-b-2xl">
              <button
                onClick={step === 1 ? onClose : goBack}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-ui-text hover:bg-surface-600 transition-colors"
              >
                {step === 1 ? 'Cancelar' : '← Voltar'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={step === 4 ? () => { void confirmar() } : goNext}
                  disabled={step === 4 && salvando}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {step === 4
                    ? (salvando
                      ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                      : <><Check size={14} /> Confirmar</>)
                    : <>Próximo <ChevronRight size={14} /></>
                  }
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
