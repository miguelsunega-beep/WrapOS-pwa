import { useEffect, useState } from 'react'

export interface FipeMarca {
  id:   string
  nome: string
}

export interface FipeModelo {
  id:   string
  nome: string
}

// A API real retorna `code`/`name` (não `id`/`name` como documentado) —
// confirmado testando manualmente contra /cars/brands e /cars/brands/{id}/models.
interface FipeApiItem {
  code: string | number
  name: string
}

interface CacheEntry<T> {
  timestamp: number
  data:      T
}

const BASE_URL = 'https://fipe.parallelum.com.br/api/v2'
const TTL_MS = 30 * 24 * 60 * 60 * 1000

const CHAVE_MARCAS = 'wrapos_fipe_marcas'
const chaveModelos = (brandId: string) => `wrapos_fipe_modelos_${brandId}`

function lerCache<T>(chave: string, ignorarTtl = false): T | null {
  try {
    const raw = localStorage.getItem(chave)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (!ignorarTtl && Date.now() - entry.timestamp > TTL_MS) return null
    return entry.data
  } catch {
    return null
  }
}

function salvarCache<T>(chave: string, data: T) {
  try {
    localStorage.setItem(chave, JSON.stringify({ timestamp: Date.now(), data }))
  } catch {
    // localStorage indisponível/cheio — cache é otimização, não crítico
  }
}

function normalizar(itens: FipeApiItem[]): FipeMarca[] {
  return itens.map(i => ({ id: String(i.code), nome: i.name }))
}

/** Busca as marcas da FIPE, cacheadas em localStorage por 30 dias. */
export function useMarcas() {
  const [marcas, setMarcas] = useState<FipeMarca[]>(() => lerCache<FipeMarca[]>(CHAVE_MARCAS) ?? [])
  const [loading, setLoading] = useState(marcas.length === 0)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    const cache = lerCache<FipeMarca[]>(CHAVE_MARCAS)
    if (cache) {
      setMarcas(cache)
      setLoading(false)
      return
    }

    let cancelado = false
    setLoading(true)
    setErro(false)
    const ctrl = new AbortController()

    fetch(`${BASE_URL}/cars/brands`, { signal: ctrl.signal })
      .then(r => r.ok ? (r.json() as Promise<FipeApiItem[]>) : Promise.reject())
      .then(data => {
        if (cancelado) return
        const normalizado = normalizar(data)
        setMarcas(normalizado)
        salvarCache(CHAVE_MARCAS, normalizado)
      })
      .catch(() => {
        if (cancelado) return
        const stale = lerCache<FipeMarca[]>(CHAVE_MARCAS, true)
        if (stale) setMarcas(stale)
        else setErro(true)
      })
      .finally(() => { if (!cancelado) setLoading(false) })

    return () => { cancelado = true; ctrl.abort() }
  }, [])

  return { marcas, loading, erro }
}

/**
 * Busca os modelos de uma marca da FIPE, cacheados em localStorage por 30
 * dias (chave por brandId). `brandId` null limpa a lista (nenhuma marca
 * selecionada ainda).
 */
export function useModelosPorMarca(brandId: string | null) {
  const [modelos, setModelos] = useState<FipeModelo[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!brandId) {
      setModelos([])
      setErro(false)
      setLoading(false)
      return
    }

    const chave = chaveModelos(brandId)
    const cache = lerCache<FipeModelo[]>(chave)
    if (cache) {
      setModelos(cache)
      setLoading(false)
      setErro(false)
      return
    }

    let cancelado = false
    setLoading(true)
    setErro(false)
    const ctrl = new AbortController()

    fetch(`${BASE_URL}/cars/brands/${brandId}/models`, { signal: ctrl.signal })
      .then(r => r.ok ? (r.json() as Promise<FipeApiItem[]>) : Promise.reject())
      .then(data => {
        if (cancelado) return
        const normalizado = normalizar(data)
        setModelos(normalizado)
        salvarCache(chave, normalizado)
      })
      .catch(() => {
        if (cancelado) return
        const stale = lerCache<FipeModelo[]>(chave, true)
        if (stale) setModelos(stale)
        else {
          setModelos([])
          setErro(true)
        }
      })
      .finally(() => { if (!cancelado) setLoading(false) })

    return () => { cancelado = true; ctrl.abort() }
  }, [brandId])

  return { modelos, loading, erro }
}
