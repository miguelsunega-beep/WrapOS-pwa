import { useState } from 'react'
import { toast } from 'sonner'
import {
  Package, AlertTriangle, Plus, Pencil, PackagePlus, PackageMinus, Trash2,
  Search, DollarSign, Users,
} from 'lucide-react'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ActionButton } from '../components/ActionButton'
import { Modal } from '../components/Modal'
import { useApp } from '../context/AppContext'
import type { Produto } from '../types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const CATEGORIAS = ['PPF', 'Envelopamento', 'Cerâmica', 'Acessórios', 'Ferramentas', 'Outros']
const UNIDADES   = ['rolo', 'unidade', 'frasco', 'caixa', 'litro', 'metro']

interface ProdutoForm {
  nome: string; sku: string; categoria: string; fornecedor: string
  quantidade: string; minimo: string; unidade: string; valorUnitario: string
  metragemRolo: string; valorRolo: string
}

const CATEGORIAS_ROLO = ['PPF', 'Envelopamento']

const initForm = (p?: Produto): ProdutoForm => ({
  nome:          p?.nome          ?? '',
  sku:           p?.sku           ?? '',
  categoria:     p?.categoria     ?? CATEGORIAS[0],
  fornecedor:    p?.fornecedor    ?? '',
  quantidade:    p ? String(p.quantidade)    : '0',
  minimo:        p ? String(p.minimo)        : '0',
  unidade:       p?.unidade       ?? UNIDADES[0],
  valorUnitario: p ? String(p.valorUnitario) : '',
  metragemRolo:  p && CATEGORIAS_ROLO.includes(p.categoria) ? String(p.quantidade) : '',
  valorRolo:     '',
})

export function Estoque() {
  const { produtos, adicionarProduto, editarProduto, deletarProduto, registrarEntradaEstoque, baixarEstoque } = useApp()

  // ── Search ─────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const filtrados = produtos.filter(p => {
    const q = search.toLowerCase()
    return !q || p.nome.toLowerCase().includes(q)
      || p.categoria.toLowerCase().includes(q)
      || p.fornecedor.toLowerCase().includes(q)
  })

  // ── KPIs ───────────────────────────────────────────────────────
  const criticos = produtos.filter(p => p.quantidade <= p.minimo).length
  const valorTotal = produtos.reduce((s, p) => s + p.quantidade * p.valorUnitario, 0)
  const fornecedoresUnicos = new Set(produtos.map(p => p.fornecedor)).size

  // ── Produto modal (novo / editar) ──────────────────────────────
  const [produtoModal, setProdutoModal] = useState<'novo' | 'editar' | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<ProdutoForm>(initForm())

  const abrirNovo = () => {
    setForm(initForm())
    setEditandoId(null)
    setProdutoModal('novo')
  }

  const abrirEditar = (p: Produto) => {
    setForm(initForm(p))
    setEditandoId(p.id)
    setProdutoModal('editar')
  }

  const fecharProdutoModal = () => {
    setProdutoModal(null)
    setEditandoId(null)
  }

  const handleSalvarProduto = () => {
    if (!form.nome.trim()) { toast.error('Informe o nome do produto.'); return }

    const isRolo = CATEGORIAS_ROLO.includes(form.categoria)
    let valorUnitario: number
    let quantidade: number

    if (isRolo) {
      const metragem = parseFloat(form.metragemRolo)
      const valorRolo = parseFloat(form.valorRolo)
      if (!metragem || metragem <= 0) { toast.error('Informe a metragem total do rolo.'); return }
      if (!valorRolo || valorRolo <= 0) { toast.error('Informe o valor pago pelo rolo.'); return }
      valorUnitario = valorRolo / metragem
      quantidade = metragem
    } else {
      const valor = parseFloat(form.valorUnitario)
      if (!valor || valor <= 0) { toast.error('Informe o valor unitário.'); return }
      valorUnitario = valor
      quantidade = Math.max(0, parseFloat(form.quantidade) || 0)
    }

    const dados: Omit<Produto, 'id'> = {
      nome:          form.nome.trim(),
      sku:           form.sku.trim(),
      categoria:     form.categoria,
      fornecedor:    form.fornecedor.trim(),
      quantidade,
      minimo:        isRolo ? 0 : Math.max(0, parseFloat(form.minimo) || 0),
      unidade:       isRolo ? 'metro' : form.unidade,
      valorUnitario,
    }

    if (produtoModal === 'novo') {
      adicionarProduto(dados)
      toast.success('Produto cadastrado com sucesso!')
    } else if (editandoId) {
      editarProduto(editandoId, dados)
      toast.success('Produto atualizado com sucesso!')
    }
    fecharProdutoModal()
  }

  // ── Baixa de estoque modal ────────────────────────────────────
  const [baixaProduto, setBaixaProduto] = useState<Produto | null>(null)
  const [baixaQtd,     setBaixaQtd]     = useState('1')
  const [baixaMotivo,  setBaixaMotivo]  = useState('')

  const abrirBaixa = (p: Produto) => {
    setBaixaProduto(p)
    setBaixaQtd('1')
    setBaixaMotivo('')
  }

  const handleBaixa = () => {
    if (!baixaProduto) return
    const qtd = parseInt(baixaQtd)
    if (!qtd || qtd <= 0) { toast.error('Informe uma quantidade válida.'); return }
    if (qtd > baixaProduto.quantidade) { toast.error('Quantidade maior que o estoque disponível.'); return }
    baixarEstoque(baixaProduto.id, qtd, baixaMotivo.trim() || undefined)
    toast.success(`-${qtd} ${baixaProduto.unidade}(s) baixados do estoque.`)
    setBaixaProduto(null)
  }

  // ── Delete confirm ────────────────────────────────────────────
  const [deletarId, setDeletarId] = useState<string | null>(null)
  const handleDeletar = () => {
    if (!deletarId) return
    deletarProduto(deletarId)
    setDeletarId(null)
    toast.success('Produto excluído do estoque.')
  }

  // ── Entrada de estoque modal ───────────────────────────────────
  const [entradaProduto, setEntradaProduto] = useState<Produto | null>(null)
  const [entradaQtd, setEntradaQtd] = useState('1')

  const abrirEntrada = (p: Produto) => {
    setEntradaProduto(p)
    setEntradaQtd('1')
  }

  const handleRegistrarEntrada = () => {
    if (!entradaProduto) return
    const qtd = parseInt(entradaQtd)
    if (!qtd || qtd <= 0) { toast.error('Informe uma quantidade válida.'); return }
    registrarEntradaEstoque(entradaProduto.id, qtd)
    toast.success(`+${qtd} ${entradaProduto.unidade}(s) adicionado(s) ao estoque.`)
    setEntradaProduto(null)
  }

  const inputCls = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5'

  return (
    <div className="px-6 py-5 space-y-5 md:p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ui-text">Estoque</h1>
          <p className="text-gray-500 text-xs mt-0.5">Controle de materiais e insumos</p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus size={15} />
          Novo Produto
        </Button>
      </div>

      {/* KPIs com Carrossel Mobile */}
      <div className="flex overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-4 gap-3 snap-x [&::-webkit-scrollbar]:hidden">
        {[
          { label: 'Total de Itens',   value: String(produtos.length),   color: 'text-ui-text',     icon: Package,      bg: 'bg-surface-600'      },
          { label: 'Estoque Crítico',  value: String(criticos),          color: 'text-accent',      icon: AlertTriangle,bg: 'bg-accent/10'        },
          { label: 'Valor em Estoque', value: fmt(valorTotal),           color: 'text-emerald-400', icon: DollarSign,   bg: 'bg-emerald-500/10'   },
          { label: 'Fornecedores',     value: String(fornecedoresUnicos), color: 'text-blue-400',    icon: Users,        bg: 'bg-blue-500/10'      },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="min-w-[220px] md:min-w-0 shrink-0 snap-start">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{item.label}</p>
                    <p className={`text-2xl font-bold mt-1.5 ${item.color}`}>{item.value}</p>
                  </div>
                  <div className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon size={17} className={item.color} />
                  </div>
                </div>
              </Card>
            </div>
          )
        })}
      </div>

      {/* Critical alert */}
      {criticos > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-400">
            <span className="font-semibold">{criticos} {criticos === 1 ? 'item' : 'itens'}</span>{' '}
            com estoque abaixo do mínimo — faça um pedido de reposição.
          </p>
        </div>
      )}

      {/* Tabela Desktop / Cards Mobile */}
      <Card padding={false}>
        <div className="px-4 md:px-5 py-4 border-b border-ui-border flex flex-col md:flex-row md:items-center gap-3">
          <h2 className="text-sm font-semibold text-ui-text shrink-0">Produtos em Estoque</h2>
          <div className="relative flex-1 w-full md:max-w-xs md:ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, categoria..."
              className="w-full bg-surface-700 border border-ui-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        </div>

        {/* Visão Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ui-border">
                {['Produto', 'Categoria', 'Fornecedor', 'Qtd.', 'Mín.', 'Unidade', 'Valor Unit.', 'Status', ''].map((h) => (
                  <th key={h} className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-600 text-sm">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : filtrados.map((produto) => {
                const critico = produto.quantidade <= produto.minimo
                return (
                  <tr key={produto.id} className="group hover:bg-surface-600/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${critico ? 'bg-accent/10' : 'bg-surface-600'}`}>
                          <Package size={14} className={critico ? 'text-accent' : 'text-gray-500'} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ui-text leading-tight">{produto.nome}</p>
                          {produto.sku && <p className="text-[10px] text-gray-600 mt-0.5">{produto.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-sm text-gray-400">{produto.categoria}</td>
                    <td className="py-3.5 px-4 text-sm text-gray-500">{produto.fornecedor}</td>
                    <td className={`py-3.5 px-4 text-sm font-bold ${critico ? 'text-accent' : 'text-ui-text'}`}>
                      {produto.quantidade}
                    </td>
                    <td className="py-3.5 px-4 text-sm text-gray-500">{produto.minimo}</td>
                    <td className="py-3.5 px-4 text-sm text-gray-500">{produto.unidade}</td>
                    <td className="py-3.5 px-4 text-sm font-semibold text-ui-text">{fmt(produto.valorUnitario)}</td>
                    <td className="py-3.5 px-4">
                      <Badge label={critico ? 'Crítico' : 'Normal'} variant={critico ? 'danger' : 'success'} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => abrirEditar(produto)} className="p-1.5 rounded-lg hover:bg-surface-500 text-gray-500 hover:text-ui-text transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => abrirEntrada(produto)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 transition-colors"><PackagePlus size={13} /></button>
                        <button onClick={() => abrirBaixa(produto)} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-gray-500 hover:text-amber-400 transition-colors"><PackageMinus size={13} /></button>
                        <button onClick={() => setDeletarId(produto.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Visão Mobile */}
        <div className="md:hidden flex flex-col gap-6 p-4">
          {filtrados.length === 0 ? (
            <div className="py-10 text-center text-gray-600 text-sm">Nenhum produto encontrado.</div>
          ) : filtrados.map((produto) => {
            const critico = produto.quantidade <= produto.minimo
            return (
              <div
                key={produto.id}
                className="p-4 flex flex-col gap-3 rounded-xl border border-ui-border shadow-sm hover:bg-surface-600/40 transition-colors"
              >
                <div className="flex justify-between items-start w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${critico ? 'bg-accent/10' : 'bg-surface-600'}`}>
                      <Package size={18} className={critico ? 'text-accent' : 'text-gray-500'} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ui-text truncate">{produto.nome}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{produto.categoria} · {produto.fornecedor}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div className="bg-surface-700 rounded-lg p-2 text-center border border-ui-border">
                    <p className="text-[9px] text-gray-500 uppercase">Estoque</p>
                    <p className={`text-sm font-bold mt-0.5 ${critico ? 'text-accent' : 'text-ui-text'}`}>{produto.quantidade}</p>
                  </div>
                  <div className="bg-surface-700 rounded-lg p-2 text-center border border-ui-border">
                    <p className="text-[9px] text-gray-500 uppercase">Mínimo</p>
                    <p className="text-sm font-bold text-gray-400 mt-0.5">{produto.minimo} {produto.unidade}</p>
                  </div>
                  <div className="bg-surface-700 rounded-lg p-2 text-center border border-ui-border">
                    <p className="text-[9px] text-gray-500 uppercase">Valor Un.</p>
                    <p className="text-sm font-bold text-ui-text mt-0.5">{fmt(produto.valorUnitario)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-ui-border/50">
                  <button onClick={() => abrirEditar(produto)} className="flex-1 py-2 rounded-lg bg-surface-600 text-gray-300 text-xs font-medium flex justify-center items-center gap-1.5"><Pencil size={13}/> Editar</button>
                  <button onClick={() => abrirEntrada(produto)} className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium flex justify-center items-center gap-1.5"><PackagePlus size={13}/> Entrar</button>
                  <button onClick={() => abrirBaixa(produto)} className="flex-1 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium flex justify-center items-center gap-1.5"><PackageMinus size={13}/> Baixar</button>
                  <button onClick={() => setDeletarId(produto.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 flex justify-center items-center shrink-0"><Trash2 size={15}/></button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Modal Novo / Editar Produto */}
      <Modal
        isOpen={produtoModal !== null}
        onClose={fecharProdutoModal}
        title={produtoModal === 'novo' ? 'Novo Produto' : 'Editar Produto'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Nome + SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nome <span className="text-accent">*</span></label>
              <input
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Filme PPF Xpel Ultimate"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>SKU</label>
              <input
                value={form.sku}
                onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
                placeholder="Ex: XPEL-ULT-60"
                className={inputCls}
              />
            </div>
          </div>

          {/* Categoria + Fornecedor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Categoria</label>
              <select
                value={form.categoria}
                onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                className={inputCls}
              >
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fornecedor</label>
              <input
                value={form.fornecedor}
                onChange={e => setForm(p => ({ ...p, fornecedor: e.target.value }))}
                placeholder="Ex: Xpel Brasil"
                className={inputCls}
              />
            </div>
          </div>

          {/* Rolo fields for PPF / Envelopamento */}
          {CATEGORIAS_ROLO.includes(form.categoria) ? (
            <div className="space-y-3">
              <div
                className="px-3.5 py-2.5 rounded-xl text-xs text-gray-500"
                style={{ backgroundColor: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)' }}
              >
                Para filmes vendidos por metro, informe a metragem e o custo total do rolo. O custo por metro é calculado automaticamente.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Metragem total do rolo (m) <span className="text-accent">*</span></label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.metragemRolo}
                    onChange={e => setForm(p => ({ ...p, metragemRolo: e.target.value }))}
                    placeholder="Ex: 30"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Valor pago pelo rolo (R$) <span className="text-accent">*</span></label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.valorRolo}
                    onChange={e => setForm(p => ({ ...p, valorRolo: e.target.value }))}
                    placeholder="Ex: 3000"
                    className={inputCls}
                  />
                </div>
              </div>
              {parseFloat(form.metragemRolo) > 0 && parseFloat(form.valorRolo) > 0 && (
                <div
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
                  style={{ backgroundColor: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)' }}
                >
                  <span className="text-xs text-gray-500">Custo por metro calculado</span>
                  <span className="text-sm font-bold" style={{ color: '#34d399' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      parseFloat(form.valorRolo) / parseFloat(form.metragemRolo)
                    )}/m
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Quantidade + Mínimo + Unidade */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Qtd. Inicial</label>
                  <input
                    type="number"
                    min={0}
                    value={form.quantidade}
                    onChange={e => setForm(p => ({ ...p, quantidade: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Estoque Mínimo</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minimo}
                    onChange={e => setForm(p => ({ ...p, minimo: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Unidade</label>
                  <select
                    value={form.unidade}
                    onChange={e => setForm(p => ({ ...p, unidade: e.target.value }))}
                    className={inputCls}
                  >
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Valor Unitário */}
              <div>
                <label className={labelCls}>Valor Unitário (R$) <span className="text-accent">*</span></label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.valorUnitario}
                  onChange={e => setForm(p => ({ ...p, valorUnitario: e.target.value }))}
                  placeholder="0,00"
                  className={inputCls}
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={fecharProdutoModal}>Cancelar</Button>
            <ActionButton onClick={handleSalvarProduto}>
              {produtoModal === 'novo' ? 'Cadastrar Produto' : 'Salvar Alterações'}
            </ActionButton>
          </div>
        </div>
      </Modal>

      {/* Modal Entrada de Estoque */}
      <Modal
        isOpen={entradaProduto !== null}
        onClose={() => setEntradaProduto(null)}
        title="Entrada de Estoque"
        size="sm"
      >
        {entradaProduto && (
          <div className="space-y-4">
            <div className="bg-surface-700 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
                <Package size={15} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-ui-text">{entradaProduto.nome}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Estoque atual: <span className="text-ui-text font-semibold">{entradaProduto.quantidade}</span> {entradaProduto.unidade}(s)
                </p>
              </div>
            </div>

            <div>
              <label className={labelCls}>Quantidade a Adicionar <span className="text-accent">*</span></label>
              <input
                type="number"
                min={1}
                value={entradaQtd}
                onChange={e => setEntradaQtd(e.target.value)}
                className={inputCls}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
              <Button variant="secondary" onClick={() => setEntradaProduto(null)}>Cancelar</Button>
              <Button onClick={handleRegistrarEntrada}>Registrar Entrada</Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Modal Baixa de Estoque */}
      <Modal
        isOpen={baixaProduto !== null}
        onClose={() => setBaixaProduto(null)}
        title="Baixa de Estoque"
        size="sm"
      >
        {baixaProduto && (
          <div className="space-y-4">
            <div className="bg-surface-700 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
                <Package size={15} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-ui-text">{baixaProduto.nome}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Estoque atual: <span className="text-ui-text font-semibold">{baixaProduto.quantidade}</span> {baixaProduto.unidade}(s)
                </p>
              </div>
            </div>
            <div>
              <label className={labelCls}>Quantidade a Baixar <span className="text-accent">*</span></label>
              <input
                type="number"
                min={1}
                max={baixaProduto.quantidade}
                value={baixaQtd}
                onChange={e => setBaixaQtd(e.target.value)}
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls}>Motivo</label>
              <input
                value={baixaMotivo}
                onChange={e => setBaixaMotivo(e.target.value)}
                placeholder="Ex: Uso em OS #1087, perda, vencimento..."
                className={inputCls}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
              <Button variant="secondary" onClick={() => setBaixaProduto(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleBaixa}>Registrar Baixa</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Excluir Produto */}
      <Modal isOpen={!!deletarId} onClose={() => setDeletarId(null)} title="Excluir Produto" size="sm">
        <p className="text-sm text-gray-400 mb-5">
          Tem certeza que deseja excluir este produto? Essa ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeletarId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDeletar}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
