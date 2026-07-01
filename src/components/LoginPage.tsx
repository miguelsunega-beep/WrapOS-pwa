import { useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Film, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [showReset, setShowReset] = useState(false)
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetDone, setResetDone] = useState(false)

  const inputCls = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2.5 text-sm text-ui-text placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await signIn(email, password)

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    }
  }

  function toggleReset() {
    setShowReset(s => !s)
    setError(null)
    setResetError(null)
    setResetDone(false)
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault()
    setResetError(null)
    setResetSubmitting(true)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email)

    setResetSubmitting(false)

    if (err) {
      setResetError(err.message)
      return
    }

    setResetDone(true)
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
            key={showReset ? 'reset' : 'signIn'}
            initial={{ opacity: 0, x: showReset ? 12 : -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: showReset ? -12 : 12 }}
            transition={{ duration: 0.18 }}
          >
            <h1 className="text-lg font-semibold text-ui-text mb-1">
              {showReset ? 'Recuperar senha' : 'Entrar'}
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {showReset
                ? 'Informe seu email para receber o link de redefinição'
                : 'Acesse sua conta WrapOS'}
            </p>

            {showReset ? (
              resetDone ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Se o email informado estiver cadastrado, você receberá um link para redefinir sua senha.
                  </p>
                  <button
                    onClick={toggleReset}
                    className="w-full py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-all"
                  >
                    Voltar para login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
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

                  {resetError && (
                    <p className="text-xs text-red-400">{resetError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetSubmitting && <Loader2 size={14} className="animate-spin" />}
                    Enviar link de redefinição
                  </button>
                </form>
              )
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
                  Entrar
                </button>
              </form>
            )}

            <div className="mt-5 pt-4 border-t border-ui-border text-center">
              <button
                onClick={toggleReset}
                className="text-xs text-gray-500 hover:text-accent transition-colors"
              >
                {showReset ? 'Já tem a senha? Entrar' : 'Esqueci minha senha'}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
