import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  X, Printer, Save, Trash2, RotateCcw, PlayCircle, PackageSearch, CheckCircle2,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { MaterialSelector } from './MaterialSelector'
import { fmt, fmtDate, FORMAS_PAGAMENTO } from '../hooks/useOrdemServico'
import { isOSAtrasada } from '../lib/osStatus'
import type { OrdemServico, Cliente, Veiculo, Instalador, MaterialUsado, ItemOS, StatusOS } from '../types'

const STATUS_LABEL: Record<string, string> = {
  em_andamento:         'Em Andamento',
  aguardando_material:  'Aguard. Material',
  aguardando_aprovacao: 'Aguard. Aprovação',
  concluido:            'Concluído',
  cancelado:            'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  em_andamento:         'rgba(52,211,153,0.15)',
  aguardando_material:  'rgba(255,107,53,0.15)',
  aguardando_aprovacao: 'rgba(139,92,246,0.15)',
  concluido:            'rgba(52,211,153,0.15)',
  cancelado:            'rgba(232,48,74,0.15)',
}

const STATUS_TEXT: Record<string, string> = {
  em_andamento:         '#34d399',
  aguardando_material:  '#ff6b35',
  aguardando_aprovacao: '#8b5cf6',
  concluido:            '#34d399',
  cancelado:            '#e8304a',
}

/** Ação de um clique só, equivalente ao "nextAction" que existia na página Ordens de Serviço. */
const NEXT_ACTION: Partial<Record<StatusOS, { label: string; proximo: StatusOS; icon: typeof PlayCircle }>> = {
  aguardando_aprovacao: { label: 'Aprovar',           proximo: 'em_andamento', icon: PlayCircle    },
  aguardando_material:  { label: 'Material Recebido', proximo: 'em_andamento', icon: PackageSearch },
}

interface OSModalProps {
  os: OrdemServico | null
  cliente: Cliente | null
  veiculo: Veiculo | null
  instaladores: Instalador[]
  onClose: () => void
  onConfirmarConcluir: (osId: string) => void
  onExcluir?: (osId: string) => void
}

interface FormState {
  instaladorId:   string
  formaPagamento: string
  observacoes:    string
}

const inputCls =
  'w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-colors bg-surface-700 border border-ui-border text-ui-text placeholder-gray-600'

export function OSModal({ os, cliente, veiculo, instaladores, onClose, onConfirmarConcluir, onExcluir }: OSModalProps) {
  const { servicos, produtos, editarOS, salvarMateriaisOS, lancamentos, deletarLancamento, cancelarOS, registrarPagamentoOS, mudarStatusOS } = useApp()

  const [form, setForm]           = useState<FormState>({ instaladorId: '', formaPagamento: '', observacoes: '' })
  const [materiais, setMateriais] = useState<MaterialUsado[]>([])
  const [servicosForm, setServicosForm] = useState<ItemOS[]>([])
  const [novoServicoId, setNovoServicoId] = useState('')

  const [voltarConfirm, setVoltarConfirm]     = useState(false)
  const [excluirConfirm, setExcluirConfirm]   = useState(false)
  const [cancelarConfirm, setCancelarConfirm] = useState(false)
  const [closeConfirm, setCloseConfirm]       = useState(false)
  const [pagamentoConfirm, setPagamentoConfirm]           = useState(false)
  const [formaPagamentoRecebida, setFormaPagamentoRecebida] = useState('')

  useEffect(() => {
    if (os) {
      setForm({
        instaladorId:   os.instaladorId,
        formaPagamento: os.formaPagamento,
        observacoes:    os.observacoes,
      })
      setMateriais(os.materiaisUsados ?? [])
      setServicosForm(os.servicos)
      setNovoServicoId('')
      setVoltarConfirm(false)
      setExcluirConfirm(false)
      setCancelarConfirm(false)
      setCloseConfirm(false)
      setPagamentoConfirm(false)
      setFormaPagamentoRecebida(os.formaPagamento)
    }
  }, [os?.id])

  const valorTotal = useMemo(
    () => servicosForm.reduce((sum, s) => sum + (s.preco || 0), 0),
    [servicosForm],
  )

  const custoMateriais = useMemo(() => materiais.reduce((sum, m) => {
    if (m.origem === 'estoque') {
      const p = produtos.find(x => x.id === m.produtoId)
      return sum + (p ? p.valorUnitario * m.quantidade : 0)
    }
    return sum + (m.custo ?? 0)
  }, 0), [materiais, produtos])

  // Compara sempre contra os dados atuais da própria OS (nunca contra um snapshot separado
  // que precisaria ser mantido em sincronia manualmente e poderia ficar desatualizado).
  const isDirty = !!os && (
    form.instaladorId !== os.instaladorId ||
    form.formaPagamento !== os.formaPagamento ||
    form.observacoes !== os.observacoes ||
    JSON.stringify(materiais) !== JSON.stringify(os.materiaisUsados ?? []) ||
    JSON.stringify(servicosForm) !== JSON.stringify(os.servicos)
  )

  const servicosDisponiveis = servicos.filter(s => !servicosForm.some(x => x.servicoId === s.id))

  // ── Serviços editáveis ──────────────────────────────────────────
  const addServico = (servicoId: string) => {
    const s = servicos.find(x => x.id === servicoId)
    if (!s) return
    setServicosForm(prev => [...prev, { servicoId: s.id, nome: s.nome, preco: s.preco ?? 0 }])
    setNovoServicoId('')
  }
  const updateValorServico = (i: number, preco: number) =>
    setServicosForm(prev => prev.map((x, j) => j === i ? { ...x, preco } : x))
  const removeServico = (i: number) =>
    setServicosForm(prev => prev.filter((_, j) => j !== i))

  // ── Ações ─────────────────────────────────────────────────────
  const persist = () => {
    if (!os) return
    editarOS(os.id, {
      instaladorId:   form.instaladorId,
      formaPagamento: form.formaPagamento,
      observacoes:    form.observacoes,
      servicos:       servicosForm,
      valorTotal,
    })
    salvarMateriaisOS(os.id, materiais)
  }

  const handleSalvar = () => {
    persist()
    toast.success('OS salva!')
  }

  const handleVoltar = () => {
    if (!os) return
    const lanc = lancamentos.find(l => l.osId === os.id && l.tipo === 'entrada')
    if (lanc) deletarLancamento(lanc.id)
    editarOS(os.id, { status: 'em_andamento' })
    setVoltarConfirm(false)
    onClose()
  }

  const handleExcluir = () => {
    if (!os || !onExcluir) return
    onExcluir(os.id)
    setExcluirConfirm(false)
    onClose()
  }

  const handleCancelar = () => {
    if (!os) return
    cancelarOS(os.id)
    setCancelarConfirm(false)
  }

  const handleRegistrarPagamento = () => {
    if (!os) return
    registrarPagamentoOS(os.id, formaPagamentoRecebida)
    setPagamentoConfirm(false)
  }

  const attemptClose = () => {
    if (isDirty) setCloseConfirm(true)
    else onClose()
  }

  const handleConcluir = () => {
    if (!os) return
    // Garante que materiais/serviços editados aqui (ainda não salvos via "Salvar")
    // não se percam antes do ConcluirOSModal abrir com os dados da OS.
    persist()
    onClose()
    onConfirmarConcluir(os.id)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && os) attemptClose() }
    if (os) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os, isDirty])

  const nextAction = os ? NEXT_ACTION[os.status] : undefined
  const atrasada = os ? isOSAtrasada(os) : false

  return (
    <AnimatePresence>
      {os && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 backdrop-blur-[2px]"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="os-modal"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="relative flex flex-col rounded-2xl overflow-hidden"
              style={{
                width: 'min(75vw, 960px)',
                height: 'min(80vh, 800px)',
                backgroundColor: 'var(--wrap-surface)',
                border: '1px solid var(--wrap-border2)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
              }}
            >
              {/* ── Confirm overlays ── */}
              {(voltarConfirm || excluirConfirm || cancelarConfirm || pagamentoConfirm || closeConfirm) && (
                <div className="absolute inset-0 z-10 bg-black/70 flex items-center justify-center p-8">
                  <div
                    className="rounded-xl p-5 space-y-4 w-full max-w-sm"
                    style={{ backgroundColor: 'var(--wrap-surface)', border: '1px solid var(--wrap-border2)' }}
                  >
                    {voltarConfirm && (
                      <>
                        <p className="text-[14px] font-bold text-ui-text">Voltar OS ao pátio?</p>
                        <p className="text-[12px] text-gray-500">
                          O lançamento financeiro vinculado será removido e a OS retornará ao status "Em Andamento".
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => setVoltarConfirm(false)} className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold bg-surface-600 text-ui-text border border-ui-border">Cancelar</button>
                          <button onClick={handleVoltar} className="flex-1 py-2.5 rounded-lg text-[12px] font-bold" style={{ backgroundColor: 'rgba(232,48,74,0.15)', color: '#e8304a', border: '1px solid rgba(232,48,74,0.30)' }}>Confirmar</button>
                        </div>
                      </>
                    )}
                    {excluirConfirm && (
                      <>
                        <p className="text-[14px] font-bold text-ui-text">Excluir esta OS?</p>
                        <p className="text-[12px] text-gray-500">Esta ação é irreversível.</p>
                        <div className="flex gap-2">
                          <button onClick={() => setExcluirConfirm(false)} className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold bg-surface-600 text-ui-text border border-ui-border">Cancelar</button>
                          <button onClick={handleExcluir} className="flex-1 py-2.5 rounded-lg text-[12px] font-bold" style={{ backgroundColor: 'rgba(232,48,74,0.15)', color: '#e8304a', border: '1px solid rgba(232,48,74,0.30)' }}>Excluir</button>
                        </div>
                      </>
                    )}
                    {cancelarConfirm && (
                      <>
                        <p className="text-[14px] font-bold text-ui-text">Cancelar esta OS?</p>
                        <p className="text-[12px] text-gray-500">A OS será marcada como cancelada e sairá do fluxo do pátio.</p>
                        <div className="flex gap-2">
                          <button onClick={() => setCancelarConfirm(false)} className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold bg-surface-600 text-ui-text border border-ui-border">Voltar</button>
                          <button onClick={handleCancelar} className="flex-1 py-2.5 rounded-lg text-[12px] font-bold" style={{ backgroundColor: 'rgba(232,48,74,0.15)', color: '#e8304a', border: '1px solid rgba(232,48,74,0.30)' }}>Confirmar</button>
                        </div>
                      </>
                    )}
                    {pagamentoConfirm && (
                      <>
                        <p className="text-[14px] font-bold text-ui-text">Registrar pagamento recebido</p>
                        <p className="text-[12px] text-gray-500">Confirme a forma de pagamento que o cliente realmente usou.</p>
                        <select
                          value={formaPagamentoRecebida}
                          onChange={e => setFormaPagamentoRecebida(e.target.value)}
                          className={inputCls}
                        >
                          {FORMAS_PAGAMENTO.map(f => <option className="bg-surface-700 text-ui-text" key={f}>{f}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => setPagamentoConfirm(false)} className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold bg-surface-600 text-ui-text border border-ui-border">Cancelar</button>
                          <button onClick={handleRegistrarPagamento} className="flex-1 py-2.5 rounded-lg text-[12px] font-bold" style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.30)' }}>Confirmar</button>
                        </div>
                      </>
                    )}
                    {closeConfirm && (
                      <>
                        <p className="text-[14px] font-bold text-ui-text">Deseja salvar as alterações?</p>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => { persist(); setCloseConfirm(false); onClose() }}
                            className="py-2.5 rounded-lg text-[12px] font-bold"
                            style={{ backgroundColor: '#34d399', color: '#0a0c12' }}
                          >
                            Salvar e fechar
                          </button>
                          <button
                            onClick={() => { setCloseConfirm(false); onClose() }}
                            className="py-2.5 rounded-lg text-[12px] font-semibold bg-surface-600 text-ui-text border border-ui-border"
                          >
                            Descartar
                          </button>
                          <button
                            onClick={() => setCloseConfirm(false)}
                            className="py-2 rounded-lg text-[12px] text-gray-500 hover:text-ui-text"
                          >
                            Continuar editando
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── Header ── */}
              <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--wrap-border)' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[17px] font-bold text-ui-text font-display">OS #{os.numero}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ backgroundColor: STATUS_COLOR[os.status] ?? 'rgba(255,255,255,0.08)', color: STATUS_TEXT[os.status] ?? '#f0f0f4' }}
                  >
                    {STATUS_LABEL[os.status]}
                  </span>
                  {atrasada && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">ATRASADO</span>
                  )}
                  {os.status === 'concluido' && os.statusPagamento === 'a_receber' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">A RECEBER</span>
                  )}
                </div>
                <button onClick={attemptClose} title="Fechar (só fecha com X)" className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.07)] transition-colors" style={{ color: 'var(--wrap-muted)' }}>
                  <X size={16} />
                </button>
              </div>

              {/* ── Barra de resumo ── */}
              <div className="flex items-center justify-between gap-4 px-5 py-3 shrink-0 bg-surface-700" style={{ borderBottom: '1px solid var(--wrap-border)' }}>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ui-text truncate">
                    {cliente?.nome ?? '—'}
                    {veiculo && <> · {veiculo.marca} {veiculo.modelo} {veiculo.ano} · {veiculo.cor}{veiculo.placa && <> · <span className="font-mono">{veiculo.placa}</span></>}</>}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {os.servicos.map(s => s.nome).join(', ')} · Aberta em {fmtDate(os.dataCriacao)}
                  </p>
                </div>
                <span className="text-[17px] font-bold text-ui-text shrink-0">{fmt(valorTotal)}</span>
              </div>

              {/* ── Corpo scrollável ── */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

                {/* a) Operacional */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-gray-500">Operacional</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] mb-1.5 text-gray-500">Responsável</label>
                      <select value={form.instaladorId} onChange={e => setForm(p => ({ ...p, instaladorId: e.target.value }))} className={inputCls}>
                        <option className="bg-surface-700 text-ui-text" value="">Não definido</option>
                        {instaladores.filter(i => i.ativo).map(i => (
                          <option className="bg-surface-700 text-ui-text" key={i.id} value={i.id}>{i.nome.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] mb-1.5 text-gray-500">Forma de Pagamento</label>
                      <select value={form.formaPagamento} onChange={e => setForm(p => ({ ...p, formaPagamento: e.target.value }))} className={inputCls}>
                        <option className="bg-surface-700 text-ui-text" value="">Não definida</option>
                        {FORMAS_PAGAMENTO.map(f => <option className="bg-surface-700 text-ui-text" key={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-[11px] mb-1.5 text-gray-500">Descrição do serviço / observações</label>
                    <textarea
                      value={form.observacoes}
                      onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                      rows={3}
                      placeholder="Notas sobre o serviço…"
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </section>

                {/* b) Materiais */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Materiais Utilizados</p>
                    {custoMateriais > 0 && (
                      <span className="text-[11px] font-semibold" style={{ color: '#ff6b35' }}>Custo: {fmt(custoMateriais)}</span>
                    )}
                  </div>
                  <MaterialSelector materiais={materiais} onChange={setMateriais} produtos={produtos} />
                </section>

                {/* c) Serviços editáveis */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-gray-500">Serviços</p>
                  <div className="space-y-1.5">
                    {servicosForm.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-surface-600 border border-ui-border">
                        <span className="text-[13px] text-ui-text truncate">{s.nome}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[12px] text-gray-500">R$</span>
                          <input
                            type="number" min={0} step={10}
                            value={s.preco || ''}
                            onChange={e => updateValorServico(i, parseFloat(e.target.value) || 0)}
                            className="w-24 bg-surface-700 border border-ui-border rounded-lg px-2 py-1 text-[13px] text-right text-ui-text focus:border-accent/50 outline-none"
                          />
                          <button onClick={() => removeServico(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {servicosDisponiveis.length > 0 && (
                      <select
                        value={novoServicoId}
                        onChange={e => addServico(e.target.value)}
                        className={`${inputCls} mt-1`}
                      >
                        <option className="bg-surface-700 text-ui-text" value="">+ Adicionar serviço...</option>
                        {servicosDisponiveis.map(s => (
                          <option className="bg-surface-700 text-ui-text" key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                      </select>
                    )}

                    <div className="flex items-center justify-between px-3.5 py-2.5 mt-1 border-t border-ui-border">
                      <span className="text-[12px] font-medium text-gray-500">Total</span>
                      <span className="text-[16px] font-bold text-ui-text">{fmt(valorTotal)}</span>
                    </div>
                  </div>
                </section>

                {/* d) Informações adicionais */}
                {(os.dataSaidaPrevista || os.comissao > 0) && (
                  <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {os.dataSaidaPrevista && (
                      <div className="p-3 bg-surface-700 rounded-xl border border-ui-border">
                        <p className="text-[11px] text-gray-600 mb-1">Entrega prevista</p>
                        <p className="text-sm font-semibold text-ui-text">{fmtDate(os.dataSaidaPrevista)}</p>
                      </div>
                    )}
                    {os.comissao > 0 && (
                      <div className="p-3 bg-surface-700 rounded-xl border border-ui-border">
                        <p className="text-[11px] text-gray-600 mb-1">Comissão</p>
                        <p className="text-sm font-semibold text-ui-text">{fmt(os.comissao)}</p>
                      </div>
                    )}
                  </section>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="px-5 py-4 shrink-0 space-y-2" style={{ borderTop: '1px solid var(--wrap-border)' }}>
                {os.status !== 'concluido' && os.status !== 'cancelado' && (
                  <>
                    {os.status === 'em_andamento' ? (
                      <button
                        onClick={handleConcluir}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-bold transition-opacity hover:opacity-90 active:scale-[0.98]"
                        style={{ backgroundColor: '#34d399', color: '#0a0c12' }}
                      >
                        <CheckCircle2 size={15} />
                        Concluir
                      </button>
                    ) : nextAction && (
                      <button
                        onClick={() => mudarStatusOS(os.id, nextAction.proximo)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-bold transition-opacity hover:opacity-90 active:scale-[0.98]"
                        style={{ backgroundColor: '#34d399', color: '#0a0c12' }}
                      >
                        <nextAction.icon size={15} />
                        {nextAction.label}
                      </button>
                    )}
                  </>
                )}

                {os.status === 'concluido' && os.statusPagamento === 'a_receber' && (
                  <button
                    onClick={() => setPagamentoConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-semibold transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
                  >
                    Registrar pagamento
                  </button>
                )}

                {os.status === 'concluido' && (
                  <button
                    onClick={() => setVoltarConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-semibold transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'rgba(232,48,74,0.10)', color: '#e8304a', border: '1px solid rgba(232,48,74,0.25)' }}
                  >
                    <RotateCcw size={13} />
                    Voltar OS ao pátio
                  </button>
                )}

                {os.status !== 'concluido' && os.status !== 'cancelado' && (
                  <button
                    onClick={() => setCancelarConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-semibold transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'rgba(232,48,74,0.10)', color: '#e8304a', border: '1px solid rgba(232,48,74,0.25)' }}
                  >
                    Cancelar OS
                  </button>
                )}

                <div className={`grid gap-2 ${onExcluir ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <button onClick={handleSalvar} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-colors bg-surface-600 text-ui-text border border-ui-border hover:bg-surface-500">
                    <Save size={13} /> Salvar
                  </button>
                  <button onClick={() => window.print()} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-colors bg-surface-600 text-ui-text border border-ui-border hover:bg-surface-500">
                    <Printer size={13} /> Imprimir
                  </button>
                  <button onClick={attemptClose} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-colors bg-surface-600 text-ui-text border border-ui-border hover:bg-surface-500">
                    Fechar
                  </button>
                  {onExcluir && (
                    <button onClick={() => setExcluirConfirm(true)} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-colors" style={{ backgroundColor: 'rgba(232,48,74,0.10)', color: '#e8304a', border: '1px solid rgba(232,48,74,0.25)' }}>
                      <Trash2 size={13} /> Excluir OS
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
