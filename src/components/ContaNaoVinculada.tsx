import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function ContaNaoVinculada() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-surface-800 border border-ui-border rounded-xl p-6 sm:p-7 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-amber-500/10 rounded-xl flex items-center justify-center">
          <AlertTriangle size={22} className="text-amber-400" />
        </div>

        <h1 className="text-lg font-semibold text-ui-text mb-1">
          Conta ainda não vinculada
        </h1>
        <p className="text-gray-500 text-sm mb-1">
          Sua conta ainda não está vinculada a uma loja.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Peça para o administrador finalizar seu cadastro.
        </p>

        {user?.email && (
          <p className="text-xs text-gray-600 mb-6 break-all">{user.email}</p>
        )}

        <button
          onClick={signOut}
          className="w-full py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-all"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
