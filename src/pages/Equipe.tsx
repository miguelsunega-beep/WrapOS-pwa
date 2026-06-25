import { useState } from 'react'
import {
  Plus, Pencil, Trash2,
  Users, Award, Target,
} from 'lucide-react'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { useEquipe } from '../hooks/useEquipe'

export function Equipe() {
  const {
    mesLabel,
    diasRestantes,
    ESPECIALIDADES,
    kpisEquipe,
    instaladoresComStats,
    form,    setForm,
    toggleEsp,
    prepararNovo,
    prepararEditar,
    salvarInstalador,
    toggleAtivo,
    deletarInstaladorById,
    metaCards,
    ranking,
    maxFaturado,
    metaForm, setMetaForm,
    resetMetaForm,
    salvarMeta,
  } = useEquipe()

  const [aba,          setAba]          = useState<'equipe' | 'metas'>('equipe')
  const [modal,        setModal]        = useState<'novo' | 'editar' | null>(null)
  const [deletarId,    setDeletarId]    = useState<string | null>(null)
  const [editMetaOpen, setEditMetaOpen] = useState(false)

  const abrirNovo = () => { prepararNovo(); setModal('novo') }

  const handleSalvar = () => {
    if (salvarInstalador()) setModal(null)
  }

  const handleDeletar = () => {
    if (!deletarId) return
    deletarInstaladorById(deletarId)
    setDeletarId(null)
  }

  const abrirEditMeta   = () => { resetMetaForm(); setEditMetaOpen(true) }
  const handleSalvarMeta = () => { salvarMeta(); setEditMetaOpen(false) }

  const inputCls = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5'

  return (
    <div className="p-6 space-y-5" style={{ backgroundColor: 'var(--wrap-bg)', minHeight: '100%' }}>

      {/* Header + tabs */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ui-text font-display">Equipe</h1>
          <div className="flex items-center gap-1 mt-3">
            {(['equipe', 'metas'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setAba(tab)}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                style={aba === tab
                  ? { backgroundColor: 'rgb(var(--wrap-accent-rgb) / 0.12)', color: 'var(--wrap-accent)', border: '1px solid rgb(var(--wrap-accent-rgb) / 0.30)' }
                  : { color: 'var(--wrap-muted)', border: '1px solid transparent' }
                }
              >
                {tab === 'equipe' ? 'Equipe' : 'Metas'}
              </button>
            ))}
          </div>
        </div>
        {aba === 'equipe' && (
          <Button onClick={abrirNovo}><Plus size={15} /> Novo Instalador</Button>
        )}
        {aba === 'metas' && (
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--wrap-muted)' }}>
              <Target size={14} className="inline mr-1" style={{ color: 'var(--wrap-accent)' }} />
              {diasRestantes} dias restantes
            </span>
            <Button onClick={abrirEditMeta}><Pencil size={14} /> Editar Metas</Button>
          </div>
        )}
      </div>

      {/* ── ABA: EQUIPE ── */}
      {aba === 'equipe' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {kpisEquipe.map(item => {
              const Icon = item.icon
              return (
                <Card key={item.label}>
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
              )
            })}
          </div>

          {/* Team cards */}
          {instaladoresComStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ backgroundColor: 'var(--wrap-surface)', border: '1px solid var(--wrap-border)' }}>
              <Users size={36} style={{ color: 'var(--wrap-muted)', opacity: 0.4 }} className="mb-3" />
              <p className="text-[14px] font-medium text-ui-text mb-1">Nenhum instalador cadastrado</p>
              <p className="text-[12px] mb-4" style={{ color: 'var(--wrap-muted)' }}>Adicione instaladores para gerenciar sua equipe</p>
              <Button onClick={abrirNovo}><Plus size={14} /> Adicionar Instalador</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {instaladoresComStats.map(inst => (
                <Card key={inst.id} className="group relative">
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { prepararEditar(inst); setModal('editar') }} className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-600 hover:text-ui-text transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => setDeletarId(inst.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full bg-surface-500 flex items-center justify-center text-sm font-bold text-gray-300 shrink-0">{inst.iniciais}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ui-text">{inst.nome}</p>
                      <p className="text-xs text-gray-500">Instalador</p>
                    </div>
                    <button onClick={() => toggleAtivo(inst.id, inst.ativo)} title={inst.ativo ? 'Desativar' : 'Ativar'} className="shrink-0">
                      <Badge label={inst.ativo ? 'Ativo' : 'Inativo'} variant={inst.ativo ? 'success' : 'default'} />
                    </button>
                  </div>
                  {inst.especialidades.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {inst.especialidades.map(esp => (
                        <span key={esp} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface-600 text-gray-400 border border-ui-border">{esp}</span>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-ui-border">
                    <div><p className="text-[10px] text-gray-600 uppercase tracking-wider">Comissão</p><p className="text-sm font-bold text-amber-400 mt-0.5">{inst.comissaoPadrao}%</p></div>
                    <div><p className="text-[10px] text-gray-600 uppercase tracking-wider">OS no Mês</p><p className="text-sm font-bold text-ui-text mt-0.5">{inst.osMesCount}</p></div>
                    <div><p className="text-[10px] text-gray-600 uppercase tracking-wider">Faturado</p><p className="text-sm font-bold text-emerald-400 mt-0.5">{inst.faturadoMesStr}</p></div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── ABA: METAS ── */}
      {aba === 'metas' && (
        <>
          <p className="text-[12px] capitalize" style={{ color: 'var(--wrap-muted)' }}>Acompanhamento de metas — {mesLabel}</p>

          {/* Meta cards */}
          <div className="grid grid-cols-2 gap-4">
            {metaCards.map(m => (
              <Card key={m.titulo}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-400">{m.titulo}</p>
                  <span className={`text-xs font-bold ${m.pct >= 100 ? 'text-emerald-400' : m.pct >= 70 ? 'text-amber-400' : 'text-accent'}`}>{m.pct}%</span>
                </div>
                <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full bg-gradient-to-r ${m.cor} transition-all duration-700`} style={{ width: `${Math.min(m.pct, 100)}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>{m.display(m.atual)}</span>
                  <span>meta: {m.display(m.meta)}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Ranking */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-ui-border flex items-center gap-2">
              <Award size={15} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-ui-text">Ranking de Técnicos — {mesLabel}</h2>
            </div>
            <div className="divide-y divide-ui-border">
              {ranking.map(tec => (
                <div key={tec.id} className="px-5 py-4 flex items-center gap-4">
                  <span className="text-xl w-8 shrink-0">{tec.posicao}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ui-text">{tec.nome}</p>
                    <p className="text-xs text-gray-500">{tec.osMes} OS concluídas no mês</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ui-text">{tec.faturadoStr}</p>
                    <p className="text-[11px] text-gray-600">faturados</p>
                  </div>
                  <div className="w-24">
                    <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent to-pink-600 rounded-full" style={{ width: `${(tec.faturado / maxFaturado) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ── Modal instalador ── */}
      <Modal isOpen={modal !== null} onClose={() => setModal(null)} title={modal === 'novo' ? 'Novo Instalador' : 'Editar Instalador'} size="md">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nome <span className="text-accent">*</span></label>
            <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: João Silva" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Especialidades</label>
            <div className="flex flex-wrap gap-2">
              {ESPECIALIDADES.map(esp => (
                <button key={esp} onClick={() => toggleEsp(esp)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                    form.especialidades.includes(esp) ? 'bg-accent/15 border-accent/40 text-accent' : 'border-ui-border text-gray-500 hover:text-gray-300 hover:border-gray-500'
                  }`}
                >{esp}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Comissão Padrão (%)</label>
              <input type="number" min={0} max={100} step={0.5} value={form.comissaoPadrao} onChange={e => setForm(p => ({ ...p, comissaoPadrao: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <button onClick={() => setForm(p => ({ ...p, ativo: !p.ativo }))}
                className={`w-full py-2 rounded-lg text-sm font-medium border transition-all ${form.ativo ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-ui-border text-gray-500 hover:text-gray-300'}`}
              >{form.ativo ? '● Ativo' : '○ Inativo'}</button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={handleSalvar}>{modal === 'novo' ? 'Cadastrar' : 'Salvar Alterações'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deletarId} onClose={() => setDeletarId(null)} title="Excluir Instalador" size="sm">
        <p className="text-sm text-gray-400 mb-5">Tem certeza que deseja excluir este instalador? Essa ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeletarId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDeletar}>Excluir</Button>
        </div>
      </Modal>

      {/* ── Modal editar metas ── */}
      <Modal isOpen={editMetaOpen} onClose={() => setEditMetaOpen(false)} title="Editar Metas" size="sm">
        <div className="space-y-4">
          {[
            { label: 'Meta de Faturamento (R$)', key: 'faturamento'   as const, type: 'number' },
            { label: 'Meta de Número de OS',     key: 'numeroOS'      as const, type: 'number' },
            { label: 'Meta de Ticket Médio (R$)', key: 'ticketMedio'  as const, type: 'number' },
            { label: 'Meta de Novos Clientes',   key: 'novosClientes' as const, type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label className={labelCls}>{f.label}</label>
              <input type={f.type} min={0} value={metaForm[f.key]} onChange={e => setMetaForm(p => ({ ...p, [f.key]: e.target.value }))} className={inputCls} />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={() => setEditMetaOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarMeta}>Salvar Metas</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
