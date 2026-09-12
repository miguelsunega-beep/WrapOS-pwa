import { useEffect, useState, FormEvent } from 'react'
import { Film, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SENHA_MIN_LENGTH = 6
const TIMEOUT_AGUARDANDO_RECOVERY_MS = 6000

type Status = 'aguardando' | 'pronto' | 'invalido' | 'concluido'

/**
 * Só aceita `supabase.auth.updateUser({ password })` depois de observar o
 * evento PASSWORD_RECOVERY do próprio Supabase Auth — navegar direto para
 * esta rota sem vir do link do email nunca dispara o evento, então o
 * formulário nunca aparece (fica em 'aguardando' até o timeout).
 */
export function RedefinirSenha() {
  const [status, setStatus] = useState<Status>('aguardando')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('pronto')
      }
    })

    const timeout = setTimeout(() => {
      if (mounted) {
        setStatus(atual => (atual === 'aguardando' ? 'invalido' : atual))
      }
    }, TIMEOUT_AGUARDANDO_RECOVERY_MS)

    return () => {
      mounted = false
      clearTimeout(timeout)
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (senha.length < SENHA_MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${SENHA_MIN_LENGTH} caracteres`)
      return
    }
    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem')
      return
    }

    setSubmitting(true)
    const { error: err } = await supabase.auth.updateUser({ password: senha })
    setSubmitting(false)

    if (err) {
      setError(err.message)
      return
    }

    setStatus('concluido')
    setTimeout(async () => {
      await supabase.auth.signOut()
      window.location.href = '/'
    }, 2500)
  }

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shrink-0">
          <Film size={20} className="text-white" />
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-bold font-display text-ui-text tracking-tight">Wrap</span>
          <span className="text-2xl font-bold font-display text-accent tracking-tight">OS</span>
        </div>
      </div>

      <div className="w-full max-w-sm bg-surface-800 border border-ui-border rounded-xl p-6 sm:p-7">
        {status === 'aguardando' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 size={22} className="animate-spin text-accent" />
            <p className="text-sm text-gray-500">Validando o link de redefinição...</p>
          </div>
        )}

        {status === 'invalido' && (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <AlertTriangle size={22} className="text-amber-400" />
            </div>
            <h1 className="text-lg font-semibold text-ui-text mb-1">Link inválido ou expirado</h1>
            <p className="text-gray-500 text-sm mb-6">
              Solicite um novo link de redefinição de senha na tela de login.
            </p>
            <a
              href="/"
              className="block w-full py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-all"
            >
              Voltar para login
            </a>
          </div>
        )}

        {status === 'concluido' && (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={22} className="text-emerald-400" />
            </div>
            <h1 className="text-lg font-semibold text-ui-text mb-1">Senha atualizada</h1>
            <p className="text-gray-500 text-sm">Redirecionando para o login...</p>
          </div>
        )}

        {status === 'pronto' && (
          <>
            <h1 className="text-lg font-semibold text-ui-text mb-1">Definir nova senha</h1>
            <p className="text-gray-500 text-sm mb-6">Escolha uma nova senha para sua conta</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Nova senha</label>
                <input
                  type="password"
                  required
                  autoFocus
                  minLength={SENHA_MIN_LENGTH}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2.5 text-sm text-ui-text placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Confirmar nova senha</label>
                <input
                  type="password"
                  required
                  minLength={SENHA_MIN_LENGTH}
                  value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2.5 text-sm text-ui-text placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Salvar nova senha
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
