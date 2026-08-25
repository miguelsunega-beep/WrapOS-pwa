import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Search, X, Check, Zap, Loader2, Car, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { todayLocal } from '../lib/dateUtils'
import { VeiculoMarcaModeloSelect } from './VeiculoMarcaModeloSelect'
import type { Cliente, Veiculo } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text focus:border-accent/50 outline-none transition-colors placeholder-gray-500'

const slideVariants = {
  enter: (d: number) => ({ x: d * 44, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit:  (d: number) => ({ x: -d * 44, opacity: 0, transition: { duration: 0.14 } }),
}

// ── Seção sub-renderers ───────────────────────────────────────────

function SecaoCliente({
  busca, setBusca, clienteSel, clientesFiltrados, showDrop, setShowDrop,
  onSelecionar, onClear, criando, setCriando, novoNome, setNovoNome,
}: {
  busca: string; setBusca: (v: string) => void
  clienteSel: Cliente | null
  clientesFiltrados: Cliente[]
  showDrop: boolean; setShowDrop: (v: boolean) => void
  onSelecionar: (c: Cliente) => void; onClear: () => void
  criando: boolean; setCriando: (v: boolean) => void
  novoNome: string; setNovoNome: (v: string) => void
}) {
  // Cliente já selecionado — mostra resumo compacto, esconde busca
  if (clienteSel && !criando) {
    return (
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
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Nome ou telefone..."
          value={busca}
          disabled={criando}
          onChange={e => setBusca(e.target.value)}
          onFocus={() => busca && setShowDrop(true)}
          className={`${inputCls} pl-8 pr-8 disabled:opacity-40`}
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

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-ui-border" />
        <span className="text-[10px] text-gray-600 font-medium">ou</span>
        <div className="flex-1 h-px bg-ui-border" />
      </div>

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
              className={inputCls}
              autoFocus
            />
          </div>
        </motion.div>
      )}
    </div>
  )
}

function SecaoVeiculo({
  veiculosDoCliente, veiculoSel, setVeiculoSel, marca, setMarca, modelo, setModelo,
}: {
  veiculosDoCliente: Veiculo[]
  veiculoSel: Veiculo | null; setVeiculoSel: (v: Veiculo | null) => void
  marca: string; setMarca: (v: string) => void
  modelo: string; setModelo: (v: string) => void
}) {
  return (
    <div className="space-y-3">
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
                  {v.marca} {v.modelo}
                  {sel && <Check size={11} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!veiculoSel && (
        <div>
          {veiculosDoCliente.length > 0 && (
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-ui-border" />
              <span className="text-[10px] text-gray-600 font-medium">ou escolher novo</span>
              <div className="flex-1 h-px bg-ui-border" />
            </div>
          )}
          <VeiculoMarcaModeloSelect
            marca={marca}
            modelo={modelo}
            onChangeMarca={setMarca}
            onChangeModelo={setModelo}
          />
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────

export function CheckinRapido({
  open, onClose, agendamentoId,
}: {
  open: boolean
  onClose: () => void
  /** Quando informado, pré-preenche cliente/veículo a partir de um agendamento existente e vincula a OS criada a ele. */
  agendamentoId?: string
}) {
  const {
    clientes, veiculos, agendamentos,
    adicionarClienteSequencial, adicionarVeiculoSequencial, adicionarOSSequencial,
  } = useApp()

  const [salvando, setSalvando] = useState(false)

  // Cliente
  const [busca, setBusca]           = useState('')
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null)
  const [showDrop, setShowDrop]     = useState(false)
  const [criando, setCriando]       = useState(false)
  const [novoNome, setNovoNome]     = useState('')

  // Veículo
  const [veiculoSel, setVeiculoSel] = useState<Veiculo | null>(null)
  const [marca, setMarca]           = useState('')
  const [modelo, setModelo]         = useState('')

  const reset = useCallback(() => {
    setBusca(''); setClienteSel(null); setShowDrop(false)
    setCriando(false); setNovoNome('')
    setVeiculoSel(null); setMarca(''); setModelo('')
  }, [])

  useEffect(() => { if (!open) reset() }, [open, reset])

  // Pré-preenche a partir de um agendamento existente ("Dar entrada")
  useEffect(() => {
    if (!open || !agendamentoId) return
    const ag = agendamentos.find(a => a.id === agendamentoId)
    if (!ag) return
    const cli  = clientes.find(c => c.id === ag.clienteId) ?? null
    const veic = veiculos.find(v => v.id === ag.veiculoId) ?? null
    setClienteSel(cli)
    setBusca(cli?.nome ?? '')
    setVeiculoSel(veic)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agendamentoId])

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

  const clienteOk     = !!clienteSel || (criando && novoNome.trim().length > 0)
  const veiculoOk      = !!veiculoSel || marca.trim().length > 0
  const podeConfirmar = clienteOk && veiculoOk

  // Cliente → veículo → OS precisam ser criados em sequência estrita e awaited:
  // veículo referencia clienteId e OS referencia veiculoId via FK composta
  // (lojaId, id) — disparar as três em paralelo/otimista faz o insert do
  // veículo/OS chegar no Postgres antes do registro que ele referencia existir.
  const confirmar = async () => {
    if (salvando || !podeConfirmar) return

    setSalvando(true)
    try {
      // 1. Resolve clienteId
      let clienteId = clienteSel?.id ?? ''
      if (!clienteSel) {
        const nomeNormalizado = novoNome.trim().toLowerCase()
        const jaExiste = clientes.some(c => c.nome.trim().toLowerCase() === nomeNormalizado)
        if (jaExiste && !window.confirm(`Já existe um cliente chamado "${novoNome.trim()}". Criar mesmo assim?`)) {
          setSalvando(false)
          return
        }
        try {
          clienteId = await adicionarClienteSequencial({
            nome: novoNome.trim(),
            telefone: '',
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
        try {
          veiculoId = await adicionarVeiculoSequencial({
            clienteId,
            marca: marca.trim(), modelo: modelo.trim(),
            ano: new Date().getFullYear(),
            cor: '', placa: '',
          })
        } catch {
          toast.error('Não foi possível criar o veículo. Tente novamente.')
          return
        }
      }

      // 3. Criar a OS (depende do veiculoId já confirmado no passo 2) — cadastro
      // mínimo com status 'checkin', o resto é completado depois na OSModal.
      try {
        await adicionarOSSequencial({
          clienteId, veiculoId,
          servicos: [],
          valorTotal: 0,
          formaPagamento: '',
          instaladorId: '',
          box: 0,
          comissao: 0,
          observacoes: '',
          status: 'checkin',
          dataSaidaPrevista: undefined,
          ...(agendamentoId ? { agendamentoId } : {}),
        })
      } catch {
        toast.error('Não foi possível criar a ordem de serviço. Tente novamente.')
        return
      }

      toast.success('Carro no sistema — complete o cadastro quando puder.')
      onClose()
    } finally {
      setSalvando(false)
    }
  }

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

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <motion.div
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                className="p-6 space-y-6"
              >
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Cliente</p>
                  <SecaoCliente
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
                  />
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Veículo</p>
                  <SecaoVeiculo
                    veiculosDoCliente={veiculosDoCliente}
                    veiculoSel={veiculoSel}
                    setVeiculoSel={v => { setVeiculoSel(v); if (v) { setMarca(''); setModelo('') } }}
                    marca={marca}
                    setMarca={setMarca}
                    modelo={modelo}
                    setModelo={setModelo}
                  />
                </div>

                <p className="text-[11px] text-gray-500">
                  Telefone, placa e mais detalhes você completa depois, sem pressa.
                </p>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-ui-border shrink-0 rounded-b-2xl">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-ui-text hover:bg-surface-600 transition-colors"
              >
                Cancelar
              </button>

              <button
                onClick={() => { void confirmar() }}
                disabled={!podeConfirmar || salvando}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {salvando
                  ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                  : <><Check size={14} /> Confirmar check-in</>
                }
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
