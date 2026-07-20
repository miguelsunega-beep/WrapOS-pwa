import { useState } from 'react'

/**
 * Como useState, mas espelha o valor em sessionStorage a cada mudança e restaura
 * automaticamente ao montar. Existe porque páginas são desmontadas pelo React Router
 * a cada troca de rota (App.tsx troca o <Outlet/> inteiro) — um modal/formulário com
 * estado só em useState local perde tudo ao navegar para outra tela e voltar, e o
 * mesmo acontece se o navegador/PWA recarregar a página em segundo plano no mobile.
 * sessionStorage (não localStorage) é proposital: o rascunho sobrevive à navegação e
 * a esse reload em segundo plano, mas some ao fechar a aba — não fica "assombrando"
 * o usuário com um formulário preenchido dias depois.
 */
export function useDraftState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key)
      if (raw !== null) return JSON.parse(raw) as T
    } catch {
      // rascunho corrompido/ilegível — ignora e cai no valor inicial
    }
    return initial instanceof Function ? initial() : initial
  })

  const update = (next: T | ((prev: T) => T)) => {
    setValue(prev => {
      const resolved = next instanceof Function ? (next as (p: T) => T)(prev) : next
      try { sessionStorage.setItem(key, JSON.stringify(resolved)) } catch {
        // sessionStorage indisponível (modo privado, quota) — segue só em memória
      }
      return resolved
    })
  }

  const clearDraft = () => {
    try { sessionStorage.removeItem(key) } catch { /* ignore */ }
  }

  return [value, update, clearDraft] as const
}
