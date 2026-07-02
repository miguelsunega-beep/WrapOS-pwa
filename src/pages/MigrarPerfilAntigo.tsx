import { Film, ChevronRight } from 'lucide-react'
import type { PerfilAntigo } from '../hooks/useMigrarPerfilAntigo'

interface MigrarPerfilAntigoProps {
  perfisAntigos: PerfilAntigo[]
  migrar: (perfilAntigoId: string) => void
  ignorar: () => void
  getStats: (perfilId: string) => { osCount: number; clientesCount: number }
  initials: (nome: string) => string
}

export function MigrarPerfilAntigo({ perfisAntigos, migrar, ignorar, getStats, initials }: MigrarPerfilAntigoProps) {
  return (
    <div className="relative min-h-screen bg-surface-900 flex flex-col items-center justify-center p-6">
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

      <h1 className="text-xl font-bold text-white mt-6 mb-1">Dados de um perfil anterior</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-md text-center">
        Detectamos dados salvos neste navegador de antes do login. Deseja vincular algum
        desses dados à sua loja atual?
      </p>

      <div className="w-full max-w-xl">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {perfisAntigos.map(p => {
            const stats = getStats(p.id)
            return (
              <button
                key={p.id}
                onClick={() => migrar(p.id)}
                className="text-left bg-surface-800 border border-ui-border rounded-xl p-4 hover:border-accent/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center mb-3">
                  <span className="text-accent text-sm font-bold">{initials(p.nome)}</span>
                </div>
                <p className="text-sm font-semibold text-white mb-0.5">{p.nome}</p>
                {p.cidade && (
                  <p className="text-xs text-gray-500 mb-2">{p.cidade}</p>
                )}
                <div className="flex flex-wrap gap-x-3 text-[11px] text-gray-600">
                  <span>{stats.osCount} OS</span>
                  <span>{stats.clientesCount} clientes</span>
                </div>
                <div className="mt-3 pt-3 border-t border-ui-border">
                  <span className="w-full flex items-center justify-between text-xs text-gray-500">
                    Vincular esses dados
                    <ChevronRight size={13} />
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={ignorar}
          className="w-full py-3 border border-dashed border-ui-border rounded-xl text-sm text-gray-500 hover:border-accent/40 hover:text-gray-300 transition-all"
        >
          Começar do zero
        </button>
      </div>
    </div>
  )
}
