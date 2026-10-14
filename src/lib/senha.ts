// Espelha a política de senha do Supabase Auth em produção ("Letters and digits":
// só A-Z/a-z contam como letra, igual ao GoTrue).
export const SENHA_MIN_LENGTH = 8
export const SENHA_REGRA_TEXTO = `Mínimo ${SENHA_MIN_LENGTH} caracteres, com letras e números`

export function validarSenha(senha: string): string | null {
  if (senha.length < SENHA_MIN_LENGTH) {
    return `A senha precisa ter pelo menos ${SENHA_MIN_LENGTH} caracteres.`
  }
  if (!/[A-Za-z]/.test(senha) || !/[0-9]/.test(senha)) {
    return 'A senha precisa ter letras e números (ex: wrap2026).'
  }
  return null
}

export function traduzirErroSenha(mensagem: string): string | null {
  if (/at least \d+ characters/i.test(mensagem)) {
    return `A senha precisa ter pelo menos ${SENHA_MIN_LENGTH} caracteres.`
  }
  if (/at least one character of each/i.test(mensagem)) {
    return 'A senha precisa ter letras e números (ex: wrap2026).'
  }
  if (/known to be weak|easy to guess|pwned/i.test(mensagem)) {
    return 'Essa senha é muito comum e fácil de adivinhar. Escolha outra.'
  }
  if (/different from the old password/i.test(mensagem)) {
    return 'A nova senha precisa ser diferente da senha atual.'
  }
  if (/weak/i.test(mensagem) && /password/i.test(mensagem)) {
    return `Senha fraca. ${SENHA_REGRA_TEXTO}.`
  }
  return null
}
