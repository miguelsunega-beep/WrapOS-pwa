import { useState, useEffect } from 'react'

interface PlacaData {
  marca:  string
  modelo: string
  ano:    number
  cor:    string
}

export interface PlacaResult {
  loading: boolean
  apiOk:   boolean
  data:    PlacaData | null
}

interface BrasilApiVeiculo {
  marca?:     string
  modelo?:    string
  ano?:       number
  anoModelo?: number
  cor?:       string
}

export function usePlacaLookup(placa: string): PlacaResult {
  const [loading, setLoading] = useState(false)
  const [apiOk,   setApiOk]   = useState(false)
  const [data,    setData]    = useState<PlacaData | null>(null)

  const limpa = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase()

  useEffect(() => {
    if (limpa.length !== 7) {
      setApiOk(false)
      setData(null)
      return
    }
    setLoading(true)
    setApiOk(false)
    const ctrl = new AbortController()
    fetch(`https://brasilapi.com.br/api/veiculos/v1/${limpa}`, { signal: ctrl.signal })
      .then(r => r.ok ? (r.json() as Promise<BrasilApiVeiculo>) : Promise.reject())
      .then(d => {
        setData({
          marca:  d.marca  ?? '',
          modelo: d.modelo ?? '',
          ano:    d.anoModelo ?? d.ano ?? new Date().getFullYear(),
          cor:    d.cor    ?? '',
        })
        setApiOk(true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [limpa])

  return { loading, apiOk, data }
}
