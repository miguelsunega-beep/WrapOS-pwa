import { useState, FormEvent } from 'react'
import { Film, Loader2, CheckCircle2, MailCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const SENHA_MIN_LENGTH = 6

type Status = 'formulario' | 'verifique_email' | 'sucesso'

/**
 * Cadastro self-serve: cliente cria a própria loja+conta sem ninguém do lado
 * WrapOS ver ou definir a senha. `nome_loja`/`nome_usuario` vão como metadata
 * pro `supabase.auth.signUp()` — a trigger `handle_novo_usuario()` (migration
 * 023) lê esse metadata e provisiona `lojas`+`usuarios` (role OWNER)
 * automaticamente. Sem lógica de plano/trial/cobrança aqui de propósito —
 * escopo de um prompt futuro, quando billing existir.
 */
export function Cadastro() {
  const { signUp } = useAuth()
  const [nomeLoja, setNomeLoja] = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<Status>('formulario')

  const inputCls = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2.5 text-sm text-ui-text placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors'

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
    const { error: err, session } = await signUp(email, senha, {
      nome_loja: nomeLoja.trim(),
      nome_usuario: nomeUsuario.trim(),
    })
    setSubmitting(false)

    if (err) {
      setError(
        /already registered|already exists|user already/i.test(err)
          ? 'Este email já está cadastrado. Faça login ou recupere sua senha.'
          : 'Não foi possível criar sua conta. Tente novamente em instantes.'
      )
      return
    }

    if (session) {
      // Confirmação de email desabilitada no projeto: signUp já deixou o
      // usuário logado. Manda pra "/" — ProtectedRoute já acha a linha de
      // usuarios (criada pela trigger na mesma transação) e libera o app.
      setStatus('sucesso')
      setTimeout(() => { window.location.href = '/' }, 2000)
    } else {
      setStatus('verifique_email')
    }
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
        {status === 'verifique_email' && (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-accent/10 rounded-xl flex items-center justify-center">
              <MailCheck size={22} className="text-accent" />
            </div>
            <h1 className="text-lg font-semibold text-ui-text mb-1">Confira seu email</h1>
            <p className="text-gray-500 text-sm mb-6">
              Enviamos um link de confirmação para <span className="text-ui-text">{email}</span>. Confirme o email e depois faça login normalmente.
            </p>
            <a
              href="/"
              className="block w-full py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-all"
            >
              Voltar para login
            </a>
          </div>
        )}

        {status === 'sucesso' && (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={22} className="text-emerald-400" />
            </div>
            <h1 className="text-lg font-semibold text-ui-text mb-1">Conta criada!</h1>
            <p className="text-gray-500 text-sm">Entrando na sua loja...</p>
          </div>
        )}

        {status === 'formulario' && (
          <>
            <h1 className="text-lg font-semibold text-ui-text mb-1">Criar conta</h1>
            <p className="text-gray-500 text-sm mb-6">Crie sua loja no WrapOS</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Nome da loja</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={nomeLoja}
                  onChange={e => setNomeLoja(e.target.value)}
                  placeholder="Ex: Wrap Premium Envelopamentos"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Seu nome</label>
                <input
                  type="text"
                  required
                  value={nomeUsuario}
                  onChange={e => setNomeUsuario(e.target.value)}
                  placeholder="Seu nome completo"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                <input
                  type="email"
                  required
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
                  minLength={SENHA_MIN_LENGTH}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Confirmar senha</label>
                <input
                  type="password"
                  required
                  minLength={SENHA_MIN_LENGTH}
                  value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  className={inputCls}
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Criar conta
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-ui-border text-center">
              <a href="/" className="text-xs text-gray-500 hover:text-accent transition-colors">
                Já tem conta? Entrar
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
