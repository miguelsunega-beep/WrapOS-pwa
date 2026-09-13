import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
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

  /**
   * `metadata` vira `raw_user_meta_data` em auth.users — é o que a trigger
   * `handle_novo_usuario()` (migration 023) lê pra provisionar `lojas`/
   * `usuarios` automaticamente (chaves `nome_loja`/`nome_usuario`, usadas
   * pela tela de Cadastro). `session` no retorno diz se a confirmação de
   * email está desabilitada no projeto: vem preenchida quando o Supabase já
   * loga o usuário no próprio signUp, `null` quando ele precisa confirmar o
   * email antes — Cadastro.tsx decide a mensagem pós-cadastro com isso, sem
   * precisar saber esse toggle de antemão.
   */
  async function signUp(
    email: string,
    password: string,
    metadata?: Record<string, string>,
  ): Promise<AuthResult & { session: Session | null }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      ...(metadata ? { options: { data: metadata } } : {}),
    })
    return { error: error?.message ?? null, session: data?.session ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    sessionStorage.removeItem('wrapos_perfil_ativo')
    window.location.href = '/'
  }

  return { user, usuario, loading, signIn, signUp, signOut }
}
