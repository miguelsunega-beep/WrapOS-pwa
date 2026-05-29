import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, User, Car, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

interface SearchResult {
  id:    string
  label: string
  sub:   string
  group: 'Clientes' | 'Veículos' | 'Ordens'
  to:    string
}

const STATUS_LABEL: Record<string, string> = {
  em_andamento:         'Em andamento',
  aguardando_material:  'Aguard. material',
  aguardando_aprovacao: 'Aguard. aprovação',
  concluido:            'Concluído',
  cancelado:            'Cancelado',
}

const GROUP_ICON = {
  Clientes: User,
  Veículos: Car,
  Ordens:   ClipboardList,
} as const

export function SearchSpotlight({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clientes, veiculos, ordens } = useApp()
  const navigate  = useNavigate()
  const [query, setQuery] = useState('')
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out: SearchResult[] = []

    clientes.forEach(c => {
      if (
        c.nome.toLowerCase().includes(q) ||
        c.telefone.includes(q) ||
        c.email.toLowerCase().includes(q)
      ) {
        out.push({ id: c.id, label: c.nome, sub: c.telefone || c.email, group: 'Clientes', to: '/clientes' })
      }
    })

    veiculos.forEach(v => {
      if (
        v.placa.toLowerCase().includes(q) ||
        v.modelo.toLowerCase().includes(q) ||
        v.marca.toLowerCase().includes(q)
      ) {
        const cliente = clientes.find(c => c.id === v.clienteId)
        out.push({
          id:    v.id,
          label: `${v.marca} ${v.modelo}`,
          sub:   `${v.placa} · ${cliente?.nome ?? '—'}`,
          group: 'Veículos',
          to:    '/clientes',
        })
      }
    })

    ordens.forEach(o => {
      if (String(o.numero).includes(q) || o.status.includes(q)) {
        const cliente = clientes.find(c => c.id === o.clienteId)
        out.push({
          id:    o.id,
          label: `OS #${o.numero}`,
          sub:   `${cliente?.nome ?? '—'} · ${STATUS_LABEL[o.status] ?? o.status}`,
          group: 'Ordens',
          to:    '/ordens',
        })
      }
    })

    return out.slice(0, 12)
  }, [query, clientes, veiculos, ordens])

  const groups = useMemo(() => {
    const map: Partial<Record<SearchResult['group'], SearchResult[]>> = {}
    results.forEach(r => (map[r.group] ??= []).push(r))
    return Object.entries(map) as [SearchResult['group'], SearchResult[]][]
  }, [results])

  const handleSelect = (r: SearchResult) => {
    navigate(r.to)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4"
          style={{ paddingTop: '15vh' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative z-10 w-full max-w-xl"
            initial={{ scale: 0.97, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              background:    'var(--wrap-surface2)',
              border:        '1px solid var(--wrap-border2)',
              borderRadius:  16,
              boxShadow:     '0 24px 64px rgba(0,0,0,0.6)',
            }}
          >
            {/* Search input row */}
            <div
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: results.length > 0 || query ? '1px solid var(--wrap-border)' : 'none' }}
            >
              <Search size={16} style={{ color: 'var(--wrap-muted)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar cliente, placa, OS…"
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{ color: 'var(--wrap-text)' }}
              />
              {query ? (
                <button onClick={() => setQuery('')} style={{ color: 'var(--wrap-muted)' }}>
                  <X size={14} />
                </button>
              ) : (
                <kbd
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--wrap-border2)', color: 'var(--wrap-muted)' }}
                >
                  ESC
                </kbd>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="max-h-[420px] overflow-y-auto py-2">
                {groups.map(([group, items]) => {
                  const Icon = GROUP_ICON[group]
                  return (
                    <div key={group}>
                      <p
                        className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--wrap-muted)' }}
                      >
                        {group}
                      </p>
                      {items.map(r => (
                        <button
                          key={r.id}
                          onClick={() => handleSelect(r)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{ borderRadius: 0 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--wrap-surface)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgb(var(--wrap-accent-rgb) / 0.12)' }}
                          >
                            <Icon size={13} style={{ color: 'var(--wrap-accent)' }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium truncate" style={{ color: 'var(--wrap-text)' }}>
                              {r.label}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: 'var(--wrap-muted)' }}>
                              {r.sub}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty state */}
            {query && results.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px]" style={{ color: 'var(--wrap-muted)' }}>
                  Nenhum resultado para "{query}"
                </p>
              </div>
            )}

            {!query && (
              <div className="px-4 py-5 text-center">
                <p className="text-[12px]" style={{ color: 'var(--wrap-muted)' }}>
                  Digite para buscar clientes, placas ou ordens de serviço
                </p>
              </div>
            )}

            {/* Footer hint */}
            <div
              className="flex items-center justify-end gap-3 px-4 py-2 rounded-b-2xl"
              style={{ borderTop: '1px solid var(--wrap-border)' }}
            >
              <span className="text-[10px]" style={{ color: 'var(--wrap-muted)' }}>
                ↵ navegar · ESC fechar
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
