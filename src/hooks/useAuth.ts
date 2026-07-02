import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Usuario {
  id: string
  authUserId: string
  nome: string
  email: string
  role: string
  lojaId: string
}

interface AuthResult {
  error: string | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function fetchUsuario(authUser: User) {
      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .eq('authUserId', authUser.id)
        .maybeSingle()

      if (mounted) setUsuario(data ?? null)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUsuario(session.user).finally(() => mounted && setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      if (session?.user) {
        setLoading(true)
        fetchUsuario(session.user).finally(() => mounted && setLoading(false))
      } else {
        setUsuario(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signUp(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    sessionStorage.removeItem('wrapos_perfil_ativo')
    window.location.href = '/'
  }

  return { user, usuario, loading, signIn, signUp, signOut }
}
