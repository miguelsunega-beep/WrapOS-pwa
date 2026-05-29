import { useState, useEffect, useRef } from 'react'

export interface CepData {
  logradouro: string
  bairro:     string
  localidade: string
  uf:         string
}

export interface CepResult {
  loading: boolean
  data:    CepData | null
}

interface ViaCepResp {
  logradouro?: string
  bairro?:     string
  localidade?: string
  uf?:         string
  erro?:       boolean
}

export function useCepLookup(cep: string): CepResult {
  const [loading, setLoading] = useState(false)
  const [data,    setData]    = useState<CepData | null>(null)
  const prevDigits = useRef('')

  const digits = cep.replace(/\D/g, '')

  useEffect(() => {
    if (digits.length !== 8) {
      if (prevDigits.current.length === 8) setData(null)
      prevDigits.current = digits
      return
    }
    if (digits === prevDigits.current) return
    prevDigits.current = digits

    setLoading(true)
    const ctrl = new AbortController()
    fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: ctrl.signal })
      .then(r => r.ok ? (r.json() as Promise<ViaCepResp>) : Promise.reject())
      .then(d => {
        if (d.erro) throw new Error('invalid')
        setData({
          logradouro: d.logradouro ?? '',
          bairro:     d.bairro     ?? '',
          localidade: d.localidade ?? '',
          uf:         d.uf         ?? '',
        })
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [digits])

  return { loading, data }
}
