import { useState } from 'react'

export interface PerfilAntigo {
  id: string
  nome: string
  cidade: string
  criadoEm: string
}

const PERFIS_KEY = 'wrapos_perfis'

/** Mesma lista de sufixos de entidade usadas por usePersistedState em AppContext.tsx. */
const ENTIDADES = [
  'clientes', 'veiculos', 'ordens', 'agendamentos', 'instaladores',
  'lancamentos', 'produtos', 'garantias', 'meta', 'configuracoes', 'servicos',
] as const

function lerPerfisAntigos(): PerfilAntigo[] {
  try { return JSON.parse(localStorage.getItem(PERFIS_KEY) ?? '[]') } catch { return [] }
}

function flagKey(lojaId: string) {
  return `wrapos_migracao_feita_${lojaId}`
}

export function getStats(perfilId: string) {
  try {
    const ordens   = JSON.parse(localStorage.getItem(`wrapos_perfil_${perfilId}_ordens`)   ?? '[]') as unknown[]
    const clientes = JSON.parse(localStorage.getItem(`wrapos_perfil_${perfilId}_clientes`) ?? '[]') as unknown[]
    return { osCount: ordens.length, clientesCount: clientes.length }
  } catch {
    return { osCount: 0, clientesCount: 0 }
  }
}

export function initials(nome: string) {
  return nome.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

/**
 * Detecta perfis da antiga tela "Selecionar Perfil" (pré-login) salvos no
 * navegador e oferece, uma única vez por loja, vincular esses dados ao
 * usuario.lojaId atual. A flag de "já resolvido" é escopada por lojaId
 * (não global) para funcionar corretamente se o mesmo navegador algum dia
 * logar com outra loja.
 */
export function useMigrarPerfilAntigo(lojaId: string) {
  const [perfisAntigos] = useState<PerfilAntigo[]>(lerPerfisAntigos)
  const [resolvido, setResolvido] = useState(
    () => perfisAntigos.length === 0 || localStorage.getItem(flagKey(lojaId)) === '1',
  )

  const precisaEscolher = !resolvido

  function migrar(perfilAntigoId: string) {
    ENTIDADES.forEach(sufixo => {
      const valor = localStorage.getItem(`wrapos_perfil_${perfilAntigoId}_${sufixo}`)
      if (valor !== null) {
        localStorage.setItem(`wrapos_perfil_${lojaId}_${sufixo}`, valor)
      }
    })
    localStorage.setItem(flagKey(lojaId), '1')
    setResolvido(true)
  }

  function ignorar() {
    localStorage.setItem(flagKey(lojaId), '1')
    setResolvido(true)
  }

  return { precisaEscolher, perfisAntigos, migrar, ignorar, getStats, initials }
}
