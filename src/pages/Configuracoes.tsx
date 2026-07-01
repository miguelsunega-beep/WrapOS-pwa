import { useState } from 'react'
import { Settings, Store, Bell, Tag, Plus, Pencil, Trash2, Download, Upload, DatabaseBackup } from 'lucide-react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { ActionButton } from '../components/ActionButton'
import { Modal } from '../components/Modal'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import type { Servico } from '../types'

export function Configuracoes() {
  const {
    loja,        setLoja,       handleSalvarLoja,
    op,          setOp,         handleSalvarOp,
    toggles,
    servicos,
    servForm,    setServForm,
    servEditId,
    categorias,
    prepararEditarServico,
    resetServico,
    salvarServico,
    deletarServicoById,
    fileInputRef,
    confirmarImportOpen,
    handleExportarBackup,
    abrirSeletorImportar,
    handleArquivoSelecionado,
    cancelarImportarBackup,
    confirmarImportarBackup,
  } = useConfiguracoes()

  const [servModalOpen, setServModalOpen] = useState(false)
  const [servDeletarId, setServDeletarId] = useState<string | null>(null)

  const abrirEditarServico = (s: Servico) => {
    prepararEditarServico(s)
    setServModalOpen(true)
  }

  const handleSalvarServico = () => {
    if (salvarServico()) setServModalOpen(false)
  }

  const handleDeletarServico = () => {
    if (!servDeletarId) return
    deletarServicoById(servDeletarId)
    setServDeletarId(null)
  }

  const inputCls = 'mt-1 w-full bg-surface-600 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text focus:border-accent/50 focus:outline-none transition-colors'
  const labelCls = 'text-[11px] text-gray-600 font-medium uppercase tracking-wider'

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings size={20} className="text-accent" />
        <div>
          <h1 className="text-xl font-bold text-ui-text">Configurações</h1>
          <p className="text-gray-500 text-xs mt-0.5">Preferências e configurações do sistema</p>
        </div>
      </div>

      {/* Dados da Loja */}
      <Card>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
            <Store size={15} className="text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ui-text">Dados da Loja</h2>
            <p className="text-[11px] text-gray-600">Nome, cidade, contato e informações gerais</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nome da Loja</label>
            <input
              type="text"
              value={loja.nomeLoja}
              onChange={e => setLoja(p => ({ ...p, nomeLoja: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Cidade</label>
            <input
              type="text"
              value={loja.cidade}
              onChange={e => setLoja(p => ({ ...p, cidade: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input
              type="text"
              value={loja.telefone}
              onChange={e => setLoja(p => ({ ...p, telefone: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>E-mail</label>
            <input
              type="email"
              value={loja.email}
              onChange={e => setLoja(p => ({ ...p, email: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={handleSalvarLoja}>Salvar Alterações</Button>
        </div>
      </Card>

      {/* Operacional */}
      <Card>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
            <Settings size={15} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ui-text">Operacional</h2>
            <p className="text-[11px] text-gray-600">Capacidade da loja e configurações de comissão</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Comissão Padrão (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={op.comissaoPadrao}
              onChange={e => setOp(p => ({ ...p, comissaoPadrao: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Cor Primária</label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                value={op.corPrimaria}
                onChange={e => setOp(p => ({ ...p, corPrimaria: e.target.value }))}
                className="w-10 h-9 rounded-lg border border-ui-border cursor-pointer bg-transparent p-0.5"
              />
              <span className="text-sm text-gray-400 font-mono">{op.corPrimaria}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={handleSalvarOp}>Salvar</Button>
        </div>
      </Card>

      {/* Notificações e Preferências */}
      <Card>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
            <Bell size={15} className="text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ui-text">Notificações e Preferências</h2>
            <p className="text-[11px] text-gray-600">Alertas automáticos e preferências do sistema</p>
          </div>
        </div>
        <div className="space-y-3">
          {toggles.map(item => {
            const Icon = item.icon
            return (
              <div key={item.titulo} className="flex items-center justify-between py-2.5 border-b border-ui-border last:border-0">
                <div className="flex items-center gap-2.5">
                  <Icon size={14} className="text-gray-500" />
                  <p className="text-sm text-gray-300">{item.titulo}</p>
                </div>
                <button
                  onClick={item.toggle}
                  className={`relative w-10 h-5 rounded-full transition-colors ${item.ativo ? 'bg-accent' : 'bg-surface-600 border border-ui-border'}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${item.ativo ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Backup */}
      <Card>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
            <DatabaseBackup size={15} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ui-text">Backup</h2>
            <p className="text-[11px] text-gray-600">Exporte ou restaure os dados deste navegador enquanto a migração para a nuvem não é concluída</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={handleExportarBackup}>
            <Download size={13} /> Exportar backup agora
          </Button>
          <Button size="sm" variant="secondary" onClick={abrirSeletorImportar}>
            <Upload size={13} /> Importar backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={e => {
              handleArquivoSelecionado(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
        </div>
      </Card>

      {/* Serviços e Precificação */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-ui-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Tag size={15} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ui-text">Serviços e Precificação</h2>
              <p className="text-[11px] text-gray-600">Catálogo de serviços com preços e tempos estimados</p>
            </div>
          </div>
          <Button size="sm" onClick={() => { resetServico(); setServModalOpen(true) }}>
            <Plus size={13} /> Adicionar
          </Button>
        </div>
        {servicos.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-600 text-sm">Nenhum serviço cadastrado.</div>
        ) : (
          <div>
            {Object.entries(categorias).map(([cat, list]) => (
              <div key={cat}>
                <div className="px-5 py-2 bg-surface-700/40 border-b border-ui-border">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{cat}</span>
                </div>
                {list.map(s => (
                  <div key={s.id} className="group px-5 py-3 flex items-center gap-3 hover:bg-surface-600/30 border-b border-ui-border last:border-0 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ui-text truncate">{s.nome}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => abrirEditarServico(s)} className="p-1.5 rounded-lg hover:bg-surface-500 text-gray-500 hover:text-ui-text transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setServDeletarId(s.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal Serviço */}
      <Modal
        isOpen={servModalOpen}
        onClose={() => { setServModalOpen(false); resetServico() }}
        title={servEditId ? 'Editar Serviço' : 'Novo Serviço'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nome do Serviço <span className="text-accent">*</span></label>
            <input
              value={servForm.nome}
              onChange={e => setServForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="Ex: PPF Full Body"
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={() => { setServModalOpen(false); resetServico() }}>Cancelar</Button>
            <ActionButton onClick={handleSalvarServico}>{servEditId ? 'Salvar' : 'Adicionar Serviço'}</ActionButton>
          </div>
        </div>
      </Modal>

      {/* Modal Excluir Serviço */}
      <Modal isOpen={!!servDeletarId} onClose={() => setServDeletarId(null)} title="Excluir Serviço" size="sm">
        <p className="text-sm text-gray-400 mb-5">Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setServDeletarId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDeletarServico}><Trash2 size={14} /> Excluir</Button>
        </div>
      </Modal>

      {/* Modal Confirmar Importação de Backup */}
      <Modal isOpen={confirmarImportOpen} onClose={cancelarImportarBackup} title="Importar Backup" size="sm">
        <p className="text-sm text-gray-400 mb-5">Isso vai substituir os dados atuais deste navegador. Continuar?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={cancelarImportarBackup}>Cancelar</Button>
          <Button variant="danger" onClick={confirmarImportarBackup}><Upload size={14} /> Substituir dados</Button>
        </div>
      </Modal>
    </div>
  )
}
