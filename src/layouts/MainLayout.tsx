import { useState, useEffect, useRef, CSSProperties } from 'react'
import { hexToRgb } from '../utils/colors'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, Calendar, Users,
  DollarSign, Package, UserCheck, Settings,
  LogOut, Bell, Sun, Moon, ChevronLeft, ChevronRight, Car,
  Search, Zap, AlertCircle,
} from 'lucide-react'
import { useApp }   from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { CheckinRapido }    from '../components/CheckinRapido'
import { SearchSpotlight }  from '../components/SearchSpotlight'

// ── Nav structure ────────────────────────────────────────────────

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  badgeKey?: 'estoque' | 'avisos'
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'OPERAÇÃO',
    items: [
      { to: '/patio', label: 'Pátio', icon: Car, end: true },
    ],
  },
  {
    label: 'GESTÃO',
    items: [
      { to: '/ordens',      label: 'Ordens de Serviço', icon: ClipboardList                    },
      { to: '/agendamento', label: 'Agendamento',        icon: Calendar                         },
      { to: '/clientes',    label: 'Clientes',           icon: Users                            },
      { to: '/financeiro',  label: 'Financeiro',         icon: DollarSign                       },
      { to: '/estoque',     label: 'Estoque',            icon: Package, badgeKey: 'estoque'     },
    ],
  },
  {
    label: 'NEGÓCIO',
    items: [
      { to: '/equipe', label: 'Equipe', icon: UserCheck },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { to: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
]

const ROUTE_LABELS: Record<string, string> = {
  '/patio':         'Pátio',
  '/ordens':        'Ordens de Serviço',
  '/agendamento':   'Agendamento',
  '/clientes':      'Clientes',
  '/financeiro':    'Financeiro',
  '/estoque':       'Estoque',
  '/equipe':        'Equipe',
  '/configuracoes': 'Configurações',
}

const handleLogout = () => {
  sessionStorage.removeItem('wrapos_perfil_ativo')
  window.location.href = '/'
}

// ── Styles ───────────────────────────────────────────────────────

const sidebarBg: CSSProperties     = { background: 'var(--wrap-surface)', borderRight: '1px solid var(--wrap-border)' }
const topbarStyle: CSSProperties   = { background: 'var(--wrap-surface)', borderBottom: '1px solid var(--wrap-border)', height: 52 }
const rootStyle: CSSProperties     = { background: 'var(--wrap-bg)', color: 'var(--wrap-text)' }
const mutedText: CSSProperties     = { color: 'var(--wrap-muted)' }
const wrapText: CSSProperties      = { color: 'var(--wrap-text)' }
const accentText: CSSProperties    = { color: 'var(--wrap-accent)' }
function activeItemStyle(): CSSProperties {
  return {
    backgroundColor: 'rgb(var(--wrap-accent-rgb) / 0.12)',
    borderLeftColor: 'var(--wrap-accent)',
    color: 'var(--wrap-accent)',
  }
}
function inactiveItemStyle(): CSSProperties {
  return { borderLeftColor: 'transparent' }
}

// ── Component ────────────────────────────────────────────────────

export function MainLayout() {
  const { configuracoes, produtos, garantias } = useApp()
  const { theme, toggleTheme } = useTheme()
  const location  = useLocation()
  const navigate  = useNavigate()

  const [collapsed,     setCollapsed]     = useState(() =>
    localStorage.getItem('wrapos_sidebar_collapsed') === 'true',
  )
  const [checkinOpen,   setCheckinOpen]   = useState(false)
  const [bellOpen,      setBellOpen]      = useState(false)
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // ── Inject dynamic accent color ──────────────────────────────
  useEffect(() => {
    document.documentElement.style.setProperty('--wrap-accent', configuracoes.corPrimaria)
    document.documentElement.style.setProperty('--wrap-accent-rgb', hexToRgb(configuracoes.corPrimaria))
  }, [configuracoes.corPrimaria])

  // ── Ctrl+K / Cmd+K → spotlight ───────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSpotlightOpen(o => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // ── Close bell on outside click ───────────────────────────────
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // ── Alerts ────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10)
  const em30Str  = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })()

  const estoqueCritico  = produtos.filter(p => p.quantidade <= p.minimo)
  const garantiasAlerta = garantias.filter(
    g => g.status === 'ativa' && g.dataFim >= todayStr && g.dataFim <= em30Str,
  )

  type AlertItem = { id: string; text: string; to: string }
  const allAlerts: AlertItem[] = [
    ...estoqueCritico.map(p  => ({ id: p.id,  text: `${p.nome} — estoque crítico`,     to: '/estoque'  })),
    ...garantiasAlerta.map(g => ({ id: g.id,  text: `Garantia vencendo em 30 dias`,    to: '/garantia' })),
  ]
  const totalAlertas = allAlerts.length

  const navBadges: Record<string, number> = {}
  if (estoqueCritico.length  > 0) navBadges['/estoque'] = estoqueCritico.length

  // ── Sidebar helpers ───────────────────────────────────────────
  const avatar = configuracoes.nomeLoja
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('wrapos_sidebar_collapsed', String(next))
      return next
    })
  }

  const pageLabel = ROUTE_LABELS[location.pathname] ?? 'WrapOS'

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={rootStyle}>

      {/* ══════════════════════ SIDEBAR ══════════════════════ */}
      <aside
        style={{ ...sidebarBg, width: collapsed ? 56 : 220 }}
        className="flex flex-col shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden"
      >
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          style={{ borderBottom: '1px solid var(--wrap-border)', minHeight: 52 }}
          className="flex items-center gap-2.5 px-3 hover:bg-[var(--wrap-surface2)] transition-colors w-full text-left shrink-0"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgb(var(--wrap-accent-rgb) / 0.15)' }}
          >
            <Car size={14} style={accentText} />
          </div>
          {!collapsed && (
            <span className="flex items-baseline gap-0 font-display font-bold text-[17px] tracking-tight whitespace-nowrap">
              <span style={wrapText}>Wrap</span>
              <span style={accentText}>OS</span>
            </span>
          )}
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
              {group.label && !collapsed && (
                <p
                  className="px-3 py-1 text-[10px] font-semibold tracking-widest uppercase"
                  style={mutedText}
                >
                  {group.label}
                </p>
              )}
              {group.label && collapsed && <div className="my-1.5 mx-2.5 h-px" style={{ background: 'var(--wrap-border)' }} />}

              <div className="space-y-0.5 px-1.5">
                {group.items.map(item => {
                  const badge = item.badgeKey ? (navBadges[item.to] ?? 0) : 0
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={!!item.end}
                      title={collapsed ? item.label : undefined}
                      style={({ isActive }) =>
                        isActive ? activeItemStyle() : inactiveItemStyle()
                      }
                      className={({ isActive }) =>
                        [
                          'flex items-center py-1.5 text-[13px] font-medium transition-colors border-l-2 rounded-r-lg',
                          collapsed ? 'justify-center px-0 w-full' : 'gap-2.5 px-2.5',
                          isActive
                            ? ''
                            : 'hover:bg-[var(--wrap-surface2)] hover:text-[var(--wrap-text)] text-[var(--wrap-muted)]',
                        ].join(' ')
                      }
                    >
                      <item.icon size={15} className="shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="truncate flex-1">{item.label}</span>
                          {badge > 0 && (
                            <span className="ml-auto min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                              {badge}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && badge > 0 && (
                        <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-red-500" />
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--wrap-border)' }}>
          {!collapsed ? (
            <div className="p-3 flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                style={{ background: 'rgb(var(--wrap-accent-rgb) / 0.18)', color: 'var(--wrap-accent)' }}
              >
                {avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold truncate" style={wrapText}>{configuracoes.nomeLoja}</p>
                <p className="text-[10px] truncate" style={mutedText}>{configuracoes.cidade}</p>
              </div>
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                className="p-1 rounded hover:bg-[var(--wrap-surface2)] transition-colors shrink-0"
                style={mutedText}
              >
                {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
              </button>
              <button
                onClick={handleLogout}
                title="Trocar perfil"
                className="p-1 rounded hover:bg-[var(--wrap-surface2)] transition-colors shrink-0"
                style={mutedText}
              >
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <div className="py-2 flex flex-col items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: 'rgb(var(--wrap-accent-rgb) / 0.18)', color: 'var(--wrap-accent)' }}
              >
                {avatar}
              </div>
              <button
                onClick={handleLogout}
                title="Trocar perfil"
                className="p-1 rounded hover:bg-[var(--wrap-surface2)] transition-colors"
                style={mutedText}
              >
                <LogOut size={12} />
              </button>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={toggleCollapsed}
            className="w-full flex items-center justify-center py-2 hover:bg-[var(--wrap-surface2)] transition-colors"
            style={{ ...mutedText, borderTop: '1px solid var(--wrap-border)' }}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>
      </aside>

      {/* ══════════════════ MAIN COLUMN ══════════════════════ */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* ─────────── TOPBAR ─────────── */}
        <header
          style={topbarStyle}
          className="flex items-center gap-4 px-5 shrink-0"
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-medium" style={mutedText}>WrapOS</span>
            <span style={mutedText} className="text-[10px]">/</span>
            <span className="text-[13px] font-semibold truncate" style={wrapText}>{pageLabel}</span>
          </div>

          {/* Search → opens spotlight */}
          <button
            className="flex-1 max-w-xs mx-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-colors text-left"
            style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)', color: 'var(--wrap-muted)' }}
            onClick={() => setSpotlightOpen(true)}
          >
            <Search size={12} />
            <span>Buscar cliente, placa, OS…</span>
            <kbd className="ml-auto text-[10px] px-1 rounded" style={{ background: 'var(--wrap-border2)', color: 'var(--wrap-muted)' }}>⌘K</kbd>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Check-in Rápido */}
            <button
              onClick={() => setCheckinOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--wrap-accent)' }}
            >
              <Zap size={13} />
              Check-in
            </button>

            {/* Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(b => !b)}
                className="relative p-2 rounded-lg hover:bg-[var(--wrap-surface2)] transition-colors"
                style={mutedText}
                title="Alertas"
              >
                <Bell size={16} />
                {totalAlertas > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>

              {/* Bell dropdown */}
              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.14 }}
                    style={{ background: 'var(--wrap-surface)', border: '1px solid var(--wrap-border2)' }}
                    className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--wrap-border)' }}>
                      <p className="text-[11px] font-semibold" style={wrapText}>Alertas do sistema</p>
                    </div>
                    {allAlerts.length === 0 ? (
                      <div className="px-4 py-4 text-center">
                        <p className="text-xs" style={mutedText}>Nenhum alerta ativo</p>
                      </div>
                    ) : (
                      <div>
                        {allAlerts.slice(0, 5).map(a => (
                          <button
                            key={a.id}
                            onClick={() => { navigate(a.to); setBellOpen(false) }}
                            className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left hover:bg-[var(--wrap-surface2)] transition-colors"
                            style={{ borderBottom: '1px solid var(--wrap-border)' }}
                          >
                            <AlertCircle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-[12px]" style={wrapText}>{a.text}</p>
                          </button>
                        ))}
                        {allAlerts.length > 5 && (
                          <button
                            onClick={() => { navigate('/'); setBellOpen(false) }}
                            className="w-full px-4 py-2 text-center text-[11px] hover:bg-[var(--wrap-surface2)] transition-colors"
                            style={accentText}
                          >
                            Ver todos os {allAlerts.length} alertas →
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--wrap-surface2)] transition-colors"
              style={mutedText}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* ─────────── PAGE CONTENT ─────────── */}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            className="flex-1 overflow-y-auto bg-surface-900"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Check-in Rápido global */}
      <CheckinRapido open={checkinOpen} onClose={() => setCheckinOpen(false)} />

      {/* Search Spotlight global */}
      <SearchSpotlight open={spotlightOpen} onClose={() => setSpotlightOpen(false)} />
    </div>
  )
}
