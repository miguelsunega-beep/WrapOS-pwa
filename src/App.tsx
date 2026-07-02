import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider } from './context/ThemeContext'
import { AppProvider } from './context/AppContext'
import { MainLayout }      from './layouts/MainLayout'
import { MigrarPerfilAntigo } from './pages/MigrarPerfilAntigo'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useMigrarPerfilAntigo } from './hooks/useMigrarPerfilAntigo'
import type { Usuario } from './hooks/useAuth'

// Lazy Loading das páginas pesadas (Code Splitting)
const OrdemServico  = lazy(() => import('./pages/OrdemServico').then(m => ({ default: m.OrdemServico })))
const Agendamento   = lazy(() => import('./pages/Agendamento').then(m => ({ default: m.Agendamento })))
const Clientes      = lazy(() => import('./pages/Clientes').then(m => ({ default: m.Clientes })))
const Financeiro    = lazy(() => import('./pages/Financeiro').then(m => ({ default: m.Financeiro })))
const Estoque       = lazy(() => import('./pages/Estoque').then(m => ({ default: m.Estoque })))
const Equipe        = lazy(() => import('./pages/Equipe').then(m => ({ default: m.Equipe })))
const Configuracoes = lazy(() => import('./pages/Configuracoes').then(m => ({ default: m.Configuracoes })))
const Patio         = lazy(() => import('./pages/Patio').then(m => ({ default: m.Patio })))
const Home          = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })))

/**
 * usuario.lojaId é o identificador que hoje faz o papel do antigo
 * "perfilId": usePersistedState (AppContext.tsx) continua lendo
 * sessionStorage['wrapos_perfil_ativo'] normalmente, só que agora essa
 * chave é preenchida com a loja do usuário logado em vez de um id
 * escolhido na extinta tela SelecionarPerfil.
 */
function AppAutenticado({ usuario }: { usuario: Usuario }) {
  if (sessionStorage.getItem('wrapos_perfil_ativo') !== usuario.lojaId) {
    sessionStorage.setItem('wrapos_perfil_ativo', usuario.lojaId)
  }

  const { precisaEscolher, perfisAntigos, migrar, ignorar, getStats, initials } =
    useMigrarPerfilAntigo(usuario.lojaId)

  if (precisaEscolher) {
    return (
      <MigrarPerfilAntigo
        perfisAntigos={perfisAntigos}
        migrar={migrar}
        ignorar={ignorar}
        getStats={getStats}
        initials={initials}
      />
    )
  }

  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-ui-text font-medium text-sm">Carregando módulo...</div>}>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index               element={<Home />} />
              <Route path="patio"        element={<Patio />}         />
              <Route path="ordens"       element={<OrdemServico />}  />
              <Route path="agendamento"  element={<Agendamento />}   />
              <Route path="clientes"     element={<Clientes />}      />
              <Route path="financeiro"   element={<Financeiro />}    />
              <Route path="estoque"      element={<Estoque />}       />
              <Route path="equipe"       element={<Equipe />}        />
              <Route path="configuracoes" element={<Configuracoes />}/>
              {/* Legacy redirects */}
              <Route path="operacional"  element={<Navigate to="/patio"         replace />} />
              <Route path="relatorios"   element={<Navigate to="/financeiro"    replace />} />
              <Route path="garantia"     element={<Navigate to="/clientes"      replace />} />
              <Route path="precificacao" element={<Navigate to="/configuracoes" replace />} />
              <Route path="metas"        element={<Navigate to="/equipe"        replace />} />
              <Route path="avisos"       element={<Navigate to="/patio"         replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--surface-700)',
            border: '1px solid var(--ui-border)',
            color: 'var(--ui-text)',
            fontSize: '13px',
          },
        }}
      />
      <ProtectedRoute>
        {usuario => <AppAutenticado usuario={usuario} />}
      </ProtectedRoute>
    </ThemeProvider>
  )
}
