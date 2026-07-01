import { useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Film, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

type Mode = 'signIn' | 'signUp'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [signUpDone, setSignUpDone] = useState(false)

  const inputCls = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2.5 text-sm text-ui-text placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = mode === 'signIn'
      ? await signIn(email, password)
      : await signUp(email, password)

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    if (mode === 'signUp') {
      setSignUpDone(true)
    }
  }

  function toggleMode() {
    setMode(m => (m === 'signIn' ? 'signUp' : 'signIn'))
    setError(null)
    setSignUpDone(false)
  }

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center p-6">
      {/* Logo */}
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
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === 'signIn' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === 'signIn' ? 12 : -12 }}
            transition={{ duration: 0.18 }}
          >
            <h1 className="text-lg font-semibold text-ui-text mb-1">
              {mode === 'signIn' ? 'Entrar' : 'Criar conta'}
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {mode === 'signIn'
                ? 'Acesse sua conta WrapOS'
                : 'Crie sua conta para começar'}
            </p>

            {signUpDone ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Conta criada. Verifique seu email para confirmar o cadastro antes de entrar.
                </p>
                <button
                  onClick={toggleMode}
                  className="w-full py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-all"
                >
                  Voltar para login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Senha</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {mode === 'signIn' ? 'Entrar' : 'Criar conta'}
                </button>
              </form>
            )}

            <div className="mt-5 pt-4 border-t border-ui-border text-center">
              <button
                onClick={toggleMode}
                className="text-xs text-gray-500 hover:text-accent transition-colors"
              >
                {mode === 'signIn'
                  ? 'Não tem conta? Criar conta'
                  : 'Já tem conta? Entrar'}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
