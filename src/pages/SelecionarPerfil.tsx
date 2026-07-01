import { useState } from 'react'
import { Film, Plus, Trash2, X, ChevronRight, LogOut } from 'lucide-react'
import { useSelecionarPerfil } from '../hooks/useSelecionarPerfil'
import { useAuth } from '../hooks/useAuth'

export function SelecionarPerfil({ onSelect }: { onSelect: (id: string) => void }) {
  const {
    perfis,
    nomeLoja,   setNomeLoja,
    cidade,     setCidade,
    comExemplo, setComExemplo,
    erroNome,   setErroNome,
    selecionarPerfil,
    criarPerfil,
    deletarPerfil,
    getStats,
    initials,
  } = useSelecionarPerfil({ onSelect })

  const { user, signOut } = useAuth()

  const [showForm,    setShowForm]    = useState(false)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  const inputCls = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors'

  return (
    <div className="relative min-h-screen bg-surface-900 flex flex-col items-center justify-center p-6">
      <button
        onClick={signOut}
        className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
      >
        <LogOut size={13} />
        Sair
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shrink-0">
          <Film size={20} className="text-white" />
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-bold text-white tracking-tight">Wrap</span>
          <span className="text-2xl font-bold text-accent tracking-tight">OS</span>
        </div>
      </div>

      <h1 className="text-xl font-bold text-white mt-6 mb-1">Selecionar Perfil</h1>
      <p className="text-gray-500 text-sm mb-1">Escolha um perfil para continuar</p>
      {user?.email && (
        <p className="text-gray-500 text-sm mb-8">Logado como {user.email}</p>
      )}

      <div className="w-full max-w-xl">
        {/* Profile grid */}
        {perfis.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            {perfis.map(p => {
              const stats      = getStats(p.id)
              const isDeleting = deletandoId === p.id
              return (
                <div
                  key={p.id}
                  className="bg-surface-800 border border-ui-border rounded-xl p-4 relative group"
                >
                  {isDeleting ? (
                    <div className="space-y-3">
                      <p className="text-sm text-white font-medium">Excluir "{p.nome}"?</p>
                      <p className="text-xs text-gray-500">
                        Todos os dados deste perfil serão apagados permanentemente.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeletandoId(null)}
                          className="flex-1 text-xs py-1.5 rounded-lg border border-ui-border text-gray-400 hover:text-white transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => { deletarPerfil(p.id); setDeletandoId(null) }}
                          className="flex-1 text-xs py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); setDeletandoId(p.id) }}
                        className="absolute top-3 right-3 p-1 rounded opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 hover:bg-surface-700 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>

                      <div
                        className="cursor-pointer"
                        onClick={() => selecionarPerfil(p.id)}
                      >
                        <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center mb-3">
                          <span className="text-accent text-sm font-bold">{initials(p.nome)}</span>
                        </div>
                        <p className="text-sm font-semibold text-white mb-0.5 pr-6">{p.nome}</p>
                        {p.cidade && (
                          <p className="text-xs text-gray-500 mb-2">{p.cidade}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 text-[11px] text-gray-600">
                          <span>{stats.osCount} OS</span>
                          <span>{stats.clientesCount} clientes</span>
                        </div>
                        <p className="text-[11px] text-gray-700 mt-0.5">
                          Criado em{' '}
                          {new Date(p.criadoEm + 'T12:00:00').toLocaleDateString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                          })}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-ui-border">
                        <button
                          onClick={() => selecionarPerfil(p.id)}
                          className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-accent transition-colors"
                        >
                          <span>Entrar</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* New profile form or button */}
        {showForm ? (
          <div className="bg-surface-800 border border-ui-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Novo Perfil</h2>
              <button
                onClick={() => { setShowForm(false); setErroNome(false) }}
                className="text-gray-600 hover:text-white transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Nome da Loja <span className="text-accent">*</span>
              </label>
              <input
                autoFocus
                value={nomeLoja}
                onChange={e => { setNomeLoja(e.target.value); setErroNome(false) }}
                onKeyDown={e => e.key === 'Enter' && criarPerfil()}
                placeholder="Ex: WrapOS Studio"
                className={`${inputCls} ${erroNome ? 'border-red-500/50' : ''}`}
              />
              {erroNome && (
                <p className="text-xs text-red-400 mt-1">Informe o nome da loja.</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Cidade</label>
              <input
                value={cidade}
                onChange={e => setCidade(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && criarPerfil()}
                placeholder="Ex: São Paulo"
                className={inputCls}
              />
            </div>

            <div className="flex items-center justify-between py-2.5 border-t border-ui-border">
              <p className="text-sm text-gray-300">Começar com dados de exemplo</p>
              <button
                onClick={() => setComExemplo(p => !p)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  comExemplo ? 'bg-accent' : 'bg-surface-600 border border-ui-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    comExemplo ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowForm(false); setErroNome(false) }}
                className="flex-1 py-2 text-sm text-gray-500 border border-ui-border rounded-lg hover:text-white hover:border-gray-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={criarPerfil}
                className="flex-1 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                Criar Perfil
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setShowForm(true); setNomeLoja(''); setCidade(''); setComExemplo(true) }}
            className="w-full py-4 border border-dashed border-ui-border rounded-xl text-sm text-gray-500 hover:border-accent/40 hover:text-gray-300 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={15} />
            Novo Perfil
          </button>
        )}
      </div>
    </div>
  )
}
