import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { LoginPage } from './LoginPage'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

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

  return <>{children}</>
}
