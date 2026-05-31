import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Printer, CheckCircle2, Save, Plus, Package, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { OrdemServico, Cliente, Veiculo, Instalador } from '../types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

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

const FORMAS_PAGAMENTO = [
  'PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito',
  'Transferência', 'Boleto', 'Débito automático',
]

interface OSDrawerProps {
  os:                  OrdemServico | null
  cliente:             Cliente | null
  veiculo:             Veiculo | null
  instaladores:        Instalador[]
  numeroBoxes:         number
  onClose:             () => void
  onConfirmarConcluir: (osId: string) => void
}

interface MaterialEntry {
  produtoId: string
  metros: number
}

export function OSDrawer({
  os, cliente, veiculo, instaladores, numeroBoxes: _numeroBoxes, onClose, onConfirmarConcluir,
}: OSDrawerProps) {
  const { editarOS, produtos, lancamentos, deletarLancamento } = useApp()

  const [form, setForm] = useState({
    instaladorId:   '',
    box:            0,
    observacoes:    '',
    formaPagamento: '',
  })

  const [materiais, setMateriais] = useState<MaterialEntry[]>([])
  const [voltarConfirm, setVoltarConfirm] = useState(false)

  useEffect(() => {
    if (os) {
      setForm({
        instaladorId:   os.instaladorId,
        box:            os.box,
        observacoes:    os.observacoes,
        formaPagamento: os.formaPagamento,
      })
      setMateriais(
        os.materiaisUsados?.map(m => ({ produtoId: m.produtoId, metros: m.quantidade })) ?? []
      )
      setVoltarConfirm(false)
    }
  }, [os?.id])

  const handleSalvar = () => {
    if (!os) return
    editarOS(os.id, {
      instaladorId:   form.instaladorId,
      box:            form.box,
      observacoes:    form.observacoes,
      formaPagamento: form.formaPagamento,
      materiaisUsados: materiais
        .filter(m => m.metros > 0 && m.produtoId)
        .map(m => ({ produtoId: m.produtoId, quantidade: m.metros })),
    })
  }

  const handleVoltar = () => {
    if (!os) return
    const lanc = lancamentos.find(l => l.osId === os.id && l.tipo === 'entrada')
    if (lanc) deletarLancamento(lanc.id)
    editarOS(os.id, { status: 'em_andamento' })
    setVoltarConfirm(false)
    onClose()
  }

  const produtosRolo = produtos.filter(p =>
    p.categoria === 'PPF' || p.categoria === 'Envelopamento'
  )

  const addMaterial = () =>
    setMateriais(prev => [...prev, { produtoId: produtosRolo[0]?.id ?? '', metros: 0 }])

  const updateMaterial = (i: number, field: keyof MaterialEntry, value: string | number) =>
    setMateriais(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))

  const removeMaterial = (i: number) =>
    setMateriais(prev => prev.filter((_, idx) => idx !== i))

  const custoMateriais = materiais.reduce((sum, m) => {
    const p = produtos.find(p => p.id === m.produtoId)
    return sum + (p ? p.valorUnitario * m.metros : 0)
  }, 0)

  const inputCls =
    'w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-colors bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] text-[#f0f0f4] placeholder-[#3a4050]'

  return (
    <AnimatePresence>
      {os && (
        <>
          {/* Backdrop — does NOT close on click */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.50)' }}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            className="fixed top-0 right-0 h-full z-50 flex flex-col"
            style={{
              width: 440,
              backgroundColor: 'var(--wrap-surface)',
              borderLeft: '1px solid var(--wrap-border2)',
              boxShadow: '-12px 0 40px rgba(0,0,0,0.45)',
            }}
          >
            {/* Inline confirm overlay for "Voltar ao pátio" */}
            {voltarConfirm && (
              <div className="absolute inset-0 z-10 bg-black/70 flex items-center justify-center p-8">
                <div
                  className="rounded-xl p-5 space-y-4 w-full"
                  style={{ backgroundColor: 'var(--wrap-surface)', border: '1px solid var(--wrap-border2)' }}
                >
                  <p className="text-[14px] font-bold text-white">Voltar OS ao pátio?</p>
                  <p className="text-[12px]" style={{ color: '#5a6070' }}>
                    O lançamento financeiro vinculado será removido e a OS retornará ao status "Em Andamento".
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setVoltarConfirm(false)}
                      className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#f0f0f4', border: '1px solid rgba(255,255,255,0.10)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleVoltar}
                      className="flex-1 py-2.5 rounded-lg text-[12px] font-bold"
                      style={{ backgroundColor: 'rgba(232,48,74,0.15)', color: '#e8304a', border: '1px solid rgba(232,48,74,0.30)' }}
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--wrap-border)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-[17px] font-bold text-white font-display">
                  OS #{os.numero}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{
                    backgroundColor: STATUS_COLOR[os.status] ?? 'rgba(255,255,255,0.08)',
                    color: STATUS_TEXT[os.status] ?? '#f0f0f4',
                  }}
                >
                  {STATUS_LABEL[os.status]}
                </span>
              </div>
              <button
                onClick={onClose}
                title="Fechar (só fecha com X)"
                className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.07)] transition-colors"
                style={{ color: '#5a6070' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Body (scrollable) ── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* Veículo & Cliente */}
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#5a6070' }}>
                  Veículo &amp; Cliente
                </p>
                <div
                  className="p-4 rounded-xl space-y-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                >
                  <p className="text-[14px] font-semibold text-white">{cliente?.nome ?? '—'}</p>
                  {cliente?.telefone && (
                    <p className="text-[12px]" style={{ color: '#5a6070' }}>{cliente.telefone}</p>
                  )}
                  {veiculo && (
                    <p className="text-[12px]" style={{ color: '#7a8898' }}>
                      {veiculo.marca} {veiculo.modelo} {veiculo.ano}
                      {veiculo.cor ? ` · ${veiculo.cor}` : ''}
                      {veiculo.placa ? ` · ` : ''}
                      {veiculo.placa && <span className="font-mono">{veiculo.placa}</span>}
                    </p>
                  )}
                  <p className="text-[11px]" style={{ color: '#3a4050' }}>
                    Aberta em {fmtDate(os.dataCriacao)}
                  </p>
                </div>
              </section>

              {/* Serviços */}
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#5a6070' }}>
                  Serviços
                </p>
                <div className="space-y-1.5">
                  {os.servicos.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-lg"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      <span className="text-[13px] text-white">{s.nome}</span>
                      <span className="text-[13px] font-semibold" style={{ color: '#34d399' }}>
                        {fmt(s.preco)}
                      </span>
                    </div>
                  ))}
                  <div
                    className="flex items-center justify-between px-3.5 py-2.5 mt-1"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <span className="text-[12px] font-medium" style={{ color: '#5a6070' }}>Total</span>
                    <span
                      className="text-[16px] font-bold text-white"
                      style={{ color: custoMateriais > os.valorTotal ? '#e8304a' : undefined }}
                    >{fmt(os.valorTotal)}</span>
                  </div>
                </div>
              </section>

              {/* Materiais utilizados */}
              {produtosRolo.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#5a6070' }}>
                      Materiais Utilizados
                    </p>
                    {custoMateriais > 0 && (
                      <span className="text-[11px] font-semibold" style={{ color: '#ff6b35' }}>
                        Custo: {fmt(custoMateriais)}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {materiais.map((m, i) => {
                      const prod = produtos.find(p => p.id === m.produtoId)
                      const custo = prod ? prod.valorUnitario * m.metros : 0
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          <Package size={13} style={{ color: '#5a6070' }} className="shrink-0" />
                          <select
                            value={m.produtoId}
                            onChange={e => updateMaterial(i, 'produtoId', e.target.value)}
                            className="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-[#f0f0f4]"
                          >
                            {produtosRolo.map(p => (
                              <option key={p.id} value={p.id} style={{ backgroundColor: '#13161e' }}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={m.metros || ''}
                              onChange={e => updateMaterial(i, 'metros', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-14 bg-transparent outline-none text-[12px] text-[#f0f0f4] text-right"
                            />
                            <span className="text-[11px]" style={{ color: '#5a6070' }}>m</span>
                          </div>
                          {custo > 0 && (
                            <span className="text-[11px] font-semibold shrink-0" style={{ color: '#ff6b35' }}>
                              {fmt(custo)}
                            </span>
                          )}
                          <button
                            onClick={() => removeMaterial(i)}
                            className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )
                    })}
                    <button
                      onClick={addMaterial}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-colors hover:text-white"
                      style={{
                        border: '1px dashed rgba(255,255,255,0.12)',
                        color: '#5a6070',
                      }}
                    >
                      <Plus size={12} />
                      Adicionar material
                    </button>
                  </div>
                </section>
              )}

              {/* Operacional — form */}
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#5a6070' }}>
                  Operacional
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[11px] mb-1.5" style={{ color: '#5a6070' }}>Responsável</label>
                      <select
                        value={form.instaladorId}
                        onChange={e => setForm(p => ({ ...p, instaladorId: e.target.value }))}
                        className={inputCls}
                      >
                        <option value="">Não definido</option>
                        {instaladores.filter(i => i.ativo).map(i => (
                          <option key={i.id} value={i.id}>{i.nome.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] mb-1.5" style={{ color: '#5a6070' }}>
                      Forma de Pagamento
                    </label>
                    <select
                      value={form.formaPagamento}
                      onChange={e => setForm(p => ({ ...p, formaPagamento: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">Não definida</option>
                      {FORMAS_PAGAMENTO.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] mb-1.5" style={{ color: '#5a6070' }}>
                      Descrição do serviço
                    </label>
                    <textarea
                      value={form.observacoes}
                      onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                      rows={3}
                      placeholder="Notas sobre o serviço…"
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* ── Footer actions ── */}
            <div
              className="px-5 py-4 shrink-0 space-y-2"
              style={{ borderTop: '1px solid var(--wrap-border)' }}
            >
              {/* Voltar ao pátio — only for concluded OS */}
              {os.status === 'concluido' && (
                <button
                  onClick={() => setVoltarConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-semibold transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: 'rgba(232,48,74,0.10)',
                    color: '#e8304a',
                    border: '1px solid rgba(232,48,74,0.25)',
                  }}
                >
                  <RotateCcw size={13} />
                  Voltar OS ao pátio
                </button>
              )}

              {/* Concluir — only for active OS */}
              {os.status !== 'concluido' && os.status !== 'cancelado' && (
                <button
                  onClick={() => onConfirmarConcluir(os.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-opacity hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: '#34d399', color: '#0a0c12' }}
                >
                  <CheckCircle2 size={15} />
                  Concluir OS #{os.numero}
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSalvar}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-colors hover:bg-[rgba(255,255,255,0.09)]"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: '#f0f0f4',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <Save size={13} />
                  Salvar
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-colors hover:bg-[rgba(255,255,255,0.09)]"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: '#f0f0f4',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <Printer size={13} />
                  Imprimir
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
