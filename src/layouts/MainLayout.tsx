import { useState, useEffect, CSSProperties } from 'react'
import { hexToRgb } from '../utils/colors'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, Calendar, Users,
  DollarSign, Package, UserCheck, Settings,
  LogOut, Bell, Sun, Moon, ChevronLeft, ChevronRight, Car,
  Search, Zap, AlertCircle, MoreVertical, Plus, Home,
} from 'lucide-react'
import { useApp }   from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { useAuth }  from '../hooks/useAuth'
import { CheckinRapido }    from '../components/CheckinRapido'
import { SearchSpotlight }  from '../components/SearchSpotlight'
import { todayLocal } from '../lib/dateUtils'

// ── breakpoint com 3 faixas: mobile / tablet / desktop ──────────
type Breakpoint = 'mobile' | 'tablet' | 'desktop'

function getBreakpoint(w: number): Breakpoint {
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(
    () => (typeof window !== 'undefined' ? getBreakpoint(window.innerWidth) : 'desktop'),
  )
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const onResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => setBp(getBreakpoint(window.innerWidth)), 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(timeoutId)
    }
  }, [])
  return bp
}

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
      { to: '/',      label: 'Início', icon: Home, end: true },
      { to: '/patio', label: 'Pátio',  icon: Car,  end: true },
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
  '/':              'Início',
  '/patio':         'Pátio',
  '/ordens':        'Ordens de Serviço',
  '/agendamento':   'Agendamento',
  '/clientes':      'Clientes',
  '/financeiro':    'Financeiro',
  '/estoque':       'Estoque',
  '/equipe':        'Equipe',
  '/configuracoes': 'Configurações',
}

// Bottom nav: 4 rotas + botão central de ação (Registrar Carro)
// Agenda foi movida para DRAWER_ITEMS para abrir espaço para Início
const BOTTOM_NAV_LEFT: NavItem[] = [
  { to: '/',      label: 'Início', icon: Home, end: true },
  { to: '/patio', label: 'Pátio',  icon: Car,  end: true },
]
const BOTTOM_NAV_RIGHT: NavItem[] = [
  { to: '/estoque',       label: 'Estoque', icon: Package,  badgeKey: 'estoque' },
  { to: '/configuracoes', label: 'Config',  icon: Settings              },
]

// Itens do menu "⋮" (features que não estão na bottom nav)
const DRAWER_ITEMS: NavItem[] = [
  { to: '/agendamento', label: 'Agendamento',       icon: Calendar      },
  { to: '/ordens',      label: 'Ordens de Serviço', icon: ClipboardList },
  { to: '/clientes',    label: 'Clientes',          icon: Users         },
  { to: '/financeiro',  label: 'Financeiro',        icon: DollarSign    },
  { to: '/equipe',      label: 'Equipe',            icon: UserCheck     },
]

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
  const { user, signOut } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()

  const breakpoint = useBreakpoint()
  const isMobile  = breakpoint === 'mobile'
  const isTablet  = breakpoint === 'tablet'

  const [collapsed,     setCollapsed]     = useState(() =>
    localStorage.getItem('wrapos_sidebar_collapsed') === 'true',
  )

  // tablet: sidebar sempre colapsada (desktop reduzido)
  const sidebarCollapsed = isTablet || collapsed
  const [checkinOpen,   setCheckinOpen]   = useState(false)
  const [bellOpen,      setBellOpen]      = useState(false)
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [drawerOpen,    setDrawerOpen]    = useState(false)

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

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  // ── Alerts ────────────────────────────────────────────────────
  const todayStr = todayLocal()
  const em30Str  = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toLocaleDateString('sv-SE')
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

      {/* ══════════════════════ SIDEBAR (desktop only) ══════════════════════ */}
      {/* Mudança 4: sidebar só no desktop */}
      {!isMobile && (
        <aside
          style={{ ...sidebarBg, width: sidebarCollapsed ? 56 : 220 }}
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
            {!sidebarCollapsed && (
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
                {group.label && !sidebarCollapsed && (
                  <p
                    className="px-3 py-1 text-[10px] font-semibold tracking-widest uppercase"
                    style={mutedText}
                  >
                    {group.label}
                  </p>
                )}
                {group.label && sidebarCollapsed && <div className="my-1.5 mx-2.5 h-px" style={{ background: 'var(--wrap-border)' }} />}

                <div className="space-y-0.5 px-1.5">
                  {group.items.map(item => {
                    const badge = item.badgeKey ? (navBadges[item.to] ?? 0) : 0
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={!!item.end}
                        title={sidebarCollapsed ? item.label : undefined}
                        style={({ isActive }) =>
                          isActive ? activeItemStyle() : inactiveItemStyle()
                        }
                        className={({ isActive }) =>
                          [
                            'flex items-center py-1.5 text-[13px] font-medium transition-colors border-l-2 rounded-r-lg',
                            sidebarCollapsed ? 'justify-center px-0 w-full' : 'gap-2.5 px-2.5',
                            isActive
                              ? ''
                              : 'hover:bg-[var(--wrap-surface2)] hover:text-[var(--wrap-text)] text-[var(--wrap-muted)]',
                          ].join(' ')
                        }
                      >
                        <item.icon size={15} className="shrink-0" />
                        {!sidebarCollapsed && (
                          <>
                            <span className="truncate flex-1">{item.label}</span>
                            {badge > 0 && (
                              <span className="ml-auto min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                                {badge}
                              </span>
                            )}
                          </>
                        )}
                        {sidebarCollapsed && badge > 0 && (
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
            {!sidebarCollapsed ? (
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
              </div>
            ) : (
              <div className="py-2 flex flex-col items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'rgb(var(--wrap-accent-rgb) / 0.18)', color: 'var(--wrap-accent)' }}
                >
                  {avatar}
                </div>
              </div>
            )}

            {/* Conta logada (Supabase Auth) */}
            <div
              className={`px-3 py-2 flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : ''}`}
              style={{ borderTop: '1px solid var(--wrap-border)' }}
            >
              {!sidebarCollapsed && (
                <p className="text-[10px] truncate flex-1" style={mutedText} title={user?.email ?? undefined}>
                  {user?.email}
                </p>
              )}
              <button
                onClick={signOut}
                title={sidebarCollapsed ? (user?.email ? `Sair (${user.email})` : 'Sair da conta') : 'Sair da conta'}
                className="p-1 rounded hover:bg-[var(--wrap-surface2)] transition-colors shrink-0"
                style={mutedText}
              >
                <LogOut size={12} />
              </button>
            </div>

            {/* Collapse toggle */}
            {!isTablet && (
              <button
                onClick={toggleCollapsed}
                className="w-full flex items-center justify-center py-2 hover:bg-[var(--wrap-surface2)] transition-colors"
                style={{ ...mutedText, borderTop: '1px solid var(--wrap-border)' }}
                title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
              </button>
            )}
          </div>
        </aside>
      )}

      {/* ══════════════════ MAIN COLUMN ══════════════════════ */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* ─────────── TOPBAR (desktop only) ─────────── */}
        {/* Mudança 5: topbar só no desktop */}
        {!isMobile && (
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
        )}

        {/* ─────────── TOPBAR MOBILE (só mobile) ─────────── */}
        {isMobile && (
          <header
            style={topbarStyle}
            className="flex items-center gap-2 px-3 shrink-0"
          >
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-lg hover:bg-[var(--wrap-surface2)] transition-colors"
              style={mutedText}
              title="Mais opções"
            >
              <MoreVertical size={20} />
            </button>
            <span className="flex items-baseline gap-0 font-display font-bold text-[16px] tracking-tight">
              <span style={wrapText}>Wrap</span>
              <span style={accentText}>OS</span>
            </span>
            <button
              onClick={() => setBellOpen(b => !b)}
              className="relative p-2 rounded-lg hover:bg-[var(--wrap-surface2)] transition-colors ml-auto"
              style={mutedText}
              title="Alertas"
            >
              <Bell size={18} />
              {totalAlertas > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          </header>
        )}

        {/* ─────────── PAGE CONTENT ─────────── */}
        {/* Mudança 7: pb-2 no mobile para respirar acima da bottom nav */}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            className={`flex-1 overflow-y-auto bg-surface-900 ${isMobile ? 'pb-2' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>

        {/* Bottom nav (mobile) com botão central de ação */}
        {isMobile && (
          <nav
            style={{ background: 'var(--wrap-surface)', borderTop: '1px solid var(--wrap-border)' }}
            className="flex items-stretch justify-around shrink-0 relative"
          >
            {BOTTOM_NAV_LEFT.map(item => {
              const badge = item.badgeKey ? (navBadges[item.to] ?? 0) : 0
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={!!item.end}
                  className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium"
                  style={({ isActive }) =>
                    isActive
                      ? { color: 'var(--wrap-accent)' }
                      : { color: 'var(--wrap-muted)' }
                  }
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                  {badge > 0 && (
                    <span className="absolute top-1 right-1/4 min-w-[15px] h-[15px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-1">
                      {badge}
                    </span>
                  )}
                </NavLink>
              )
            })}

            {/* Botão central: Registrar Carro (Check-in) */}
            <div className="flex-1 flex items-center justify-center">
              <button
                onClick={() => setCheckinOpen(true)}
                className="flex items-center justify-center rounded-full shadow-lg -translate-y-3 text-white transition-transform active:scale-95"
                style={{ background: 'var(--wrap-accent)', width: 52, height: 52 }}
                title="Registrar carro"
              >
                <Plus size={26} />
              </button>
            </div>

            {BOTTOM_NAV_RIGHT.map(item => {
              const badge = item.badgeKey ? (navBadges[item.to] ?? 0) : 0
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={!!item.end}
                  className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium"
                  style={({ isActive }) =>
                    isActive
                      ? { color: 'var(--wrap-accent)' }
                      : { color: 'var(--wrap-muted)' }
                  }
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                  {badge > 0 && (
                    <span className="absolute top-1 right-1/4 min-w-[15px] h-[15px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-1">
                      {badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>
        )}
      </div>

      {/* ─────────── DRAWER MOBILE (menu ⋮) ─────────── */}
      <AnimatePresence>
        {drawerOpen && isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
              style={sidebarBg}
              className="fixed left-0 top-0 bottom-0 z-50 w-[260px] flex flex-col"
            >
              <div
                className="flex items-center gap-2.5 px-4"
                style={{ borderBottom: '1px solid var(--wrap-border)', minHeight: 52 }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgb(var(--wrap-accent-rgb) / 0.15)' }}
                >
                  <Car size={14} style={accentText} />
                </div>
                <span className="flex items-baseline gap-0 font-display font-bold text-[17px] tracking-tight">
                  <span style={wrapText}>Wrap</span>
                  <span style={accentText}>OS</span>
                </span>
              </div>
              <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
                {DRAWER_ITEMS.map(item => {
                  const badge = item.badgeKey ? (navBadges[item.to] ?? 0) : 0
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={!!item.end}
                      style={({ isActive }) =>
                        isActive ? activeItemStyle() : inactiveItemStyle()
                      }
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-2.5 px-2.5 py-2.5 text-[14px] font-medium transition-colors border-l-2 rounded-r-lg',
                          isActive
                            ? ''
                            : 'hover:bg-[var(--wrap-surface2)] hover:text-[var(--wrap-text)] text-[var(--wrap-muted)]',
                        ].join(' ')
                      }
                    >
                      <item.icon size={17} className="shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span className="ml-auto min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </nav>
              <div style={{ borderTop: '1px solid var(--wrap-border)' }} className="p-3 flex items-center gap-2">
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
                  className="p-1 rounded hover:bg-[var(--wrap-surface2)] transition-colors shrink-0"
                  style={mutedText}
                  title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                >
                  {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                </button>
              </div>
              <div
                style={{ borderTop: '1px solid var(--wrap-border)' }}
                className="px-3 py-2 flex items-center gap-2"
              >
                <p className="text-[10px] truncate flex-1" style={mutedText} title={user?.email ?? undefined}>
                  {user?.email}
                </p>
                <button
                  onClick={signOut}
                  className="p-1 rounded hover:bg-[var(--wrap-surface2)] transition-colors shrink-0"
                  style={mutedText}
                  title="Sair da conta"
                >
                  <LogOut size={13} />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─────────── PAINEL DE ALERTAS (overlay único) ─────────── */}
      <AnimatePresence>
        {bellOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              style={{ background: 'var(--wrap-surface)', border: '1px solid var(--wrap-border2)' }}
              className="fixed z-50 right-3 top-14 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl shadow-2xl overflow-hidden"
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
          </>
        )}
      </AnimatePresence>

      {/* Check-in Rápido global */}
      <CheckinRapido open={checkinOpen} onClose={() => setCheckinOpen(false)} />

      {/* Search Spotlight global */}
      <SearchSpotlight open={spotlightOpen} onClose={() => setSpotlightOpen(false)} />
    </div>
  )
}
