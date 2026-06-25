import { useState } from 'react'
import {
  Package, AlertTriangle, Plus, Pencil, PackagePlus, PackageMinus, Trash2,
  Search,
} from 'lucide-react'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ActionButton } from '../components/ActionButton'
import { Modal } from '../components/Modal'
import type { Produto } from '../types'
import { useEstoque } from '../hooks/useEstoque'

export function Estoque() {
  const {
    search, setSearch,
    filtrados,
    kpisEstoque,
    criticosCount,
    CATEGORIAS,
    UNIDADES,
    form, setForm,
    isRolo,
    custoPorMetroStr,
    prepararNovo,
    prepararEditar,
    salvarProduto,
    registrarEntrada,
    registrarBaixa,
    deletarProdutoById,
  } = useEstoque()

  const [produtoModal, setProdutoModal] = useState<'novo' | 'editar' | null>(null)

  const [baixaProduto, setBaixaProduto] = useState<Produto | null>(null)
  const [baixaQtd,     setBaixaQtd]     = useState('1')
  const [baixaMotivo,  setBaixaMotivo]  = useState('')

  const [entradaProduto, setEntradaProduto] = useState<Produto | null>(null)
  const [entradaQtd,     setEntradaQtd]     = useState('1')

  const [deletarId, setDeletarId] = useState<string | null>(null)

  const abrirBaixa = (p: Produto) => {
    setBaixaProduto(p)
    setBaixaQtd('1')
    setBaixaMotivo('')
  }

  const abrirEntrada = (p: Produto) => {
    setEntradaProduto(p)
    setEntradaQtd('1')
  }

  const handleSalvarProduto = () => {
    if (salvarProduto()) setProdutoModal(null)
  }

  const handleRegistrarEntrada = () => {
    if (!entradaProduto) return
    if (registrarEntrada(entradaProduto, entradaQtd)) setEntradaProduto(null)
  }

  const handleBaixa = () => {
    if (!baixaProduto) return
    if (registrarBaixa(baixaProduto, baixaQtd, baixaMotivo)) setBaixaProduto(null)
  }

  const handleDeletar = () => {
    if (!deletarId) return
    deletarProdutoById(deletarId)
    setDeletarId(null)
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
        <Button onClick={() => { prepararNovo(); setProdutoModal('novo') }}>
          <Plus size={15} />
          Novo Produto
        </Button>
      </div>

      {/* KPIs com Carrossel Mobile */}
      <div className="flex overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-4 gap-3 snap-x [&::-webkit-scrollbar]:hidden">
        {kpisEstoque.map((item) => {
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
      {criticosCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-400">
            <span className="font-semibold">{criticosCount} {criticosCount === 1 ? 'item' : 'itens'}</span>{' '}
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
              ) : filtrados.map((produto) => (
                <tr key={produto.id} className="group hover:bg-surface-600/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${produto.critico ? 'bg-accent/10' : 'bg-surface-600'}`}>
                        <Package size={14} className={produto.critico ? 'text-accent' : 'text-gray-500'} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ui-text leading-tight">{produto.nome}</p>
                        {produto.sku && <p className="text-[10px] text-gray-600 mt-0.5">{produto.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-sm text-gray-400">{produto.categoria}</td>
                  <td className="py-3.5 px-4 text-sm text-gray-500">{produto.fornecedor}</td>
                  <td className={`py-3.5 px-4 text-sm font-bold ${produto.critico ? 'text-accent' : 'text-ui-text'}`}>
                    {produto.quantidade}
                  </td>
                  <td className="py-3.5 px-4 text-sm text-gray-500">{produto.minimo}</td>
                  <td className="py-3.5 px-4 text-sm text-gray-500">{produto.unidade}</td>
                  <td className="py-3.5 px-4 text-sm font-semibold text-ui-text">{produto.valorUnitarioStr}</td>
                  <td className="py-3.5 px-4">
                    <Badge label={produto.critico ? 'Crítico' : 'Normal'} variant={produto.critico ? 'danger' : 'success'} />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { prepararEditar(produto); setProdutoModal('editar') }} className="p-1.5 rounded-lg hover:bg-surface-500 text-gray-500 hover:text-ui-text transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => abrirEntrada(produto)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 transition-colors"><PackagePlus size={13} /></button>
                      <button onClick={() => abrirBaixa(produto)} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-gray-500 hover:text-amber-400 transition-colors"><PackageMinus size={13} /></button>
                      <button onClick={() => setDeletarId(produto.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Visão Mobile */}
        <div className="md:hidden flex flex-col gap-6 p-4">
          {filtrados.length === 0 ? (
            <div className="py-10 text-center text-gray-600 text-sm">Nenhum produto encontrado.</div>
          ) : filtrados.map((produto) => (
            <div
              key={produto.id}
              className="p-4 flex flex-col gap-3 rounded-xl border border-ui-border shadow-sm hover:bg-surface-600/40 transition-colors"
            >
              <div className="flex justify-between items-start w-full">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${produto.critico ? 'bg-accent/10' : 'bg-surface-600'}`}>
                    <Package size={18} className={produto.critico ? 'text-accent' : 'text-gray-500'} />
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
                  <p className={`text-sm font-bold mt-0.5 ${produto.critico ? 'text-accent' : 'text-ui-text'}`}>{produto.quantidade}</p>
                </div>
                <div className="bg-surface-700 rounded-lg p-2 text-center border border-ui-border">
                  <p className="text-[9px] text-gray-500 uppercase">Mínimo</p>
                  <p className="text-sm font-bold text-gray-400 mt-0.5">{produto.minimo} {produto.unidade}</p>
                </div>
                <div className="bg-surface-700 rounded-lg p-2 text-center border border-ui-border">
                  <p className="text-[9px] text-gray-500 uppercase">Valor Un.</p>
                  <p className="text-sm font-bold text-ui-text mt-0.5">{produto.valorUnitarioStr}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-ui-border/50">
                <button onClick={() => { prepararEditar(produto); setProdutoModal('editar') }} className="flex-1 py-2 rounded-lg bg-surface-600 text-gray-300 text-xs font-medium flex justify-center items-center gap-1.5"><Pencil size={13}/> Editar</button>
                <button onClick={() => abrirEntrada(produto)} className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium flex justify-center items-center gap-1.5"><PackagePlus size={13}/> Entrar</button>
                <button onClick={() => abrirBaixa(produto)} className="flex-1 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium flex justify-center items-center gap-1.5"><PackageMinus size={13}/> Baixar</button>
                <button onClick={() => setDeletarId(produto.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 flex justify-center items-center shrink-0"><Trash2 size={15}/></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal Novo / Editar Produto */}
      <Modal
        isOpen={produtoModal !== null}
        onClose={() => setProdutoModal(null)}
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
          {isRolo ? (
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
              {custoPorMetroStr && (
                <div
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
                  style={{ backgroundColor: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)' }}
                >
                  <span className="text-xs text-gray-500">Custo por metro calculado</span>
                  <span className="text-sm font-bold" style={{ color: '#34d399' }}>
                    {custoPorMetroStr}
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
            <Button variant="secondary" onClick={() => setProdutoModal(null)}>Cancelar</Button>
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
