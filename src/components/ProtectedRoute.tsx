import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth, type Usuario } from '../hooks/useAuth'
import { LoginPage } from './LoginPage'
import { ContaNaoVinculada } from './ContaNaoVinculada'

export function ProtectedRoute({ children }: { children: (usuario: Usuario) => ReactNode }) {
  const { user, usuario, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (!usuario) {
    return <ContaNaoVinculada />
  }

  return <>{children(usuario)}</>
}
