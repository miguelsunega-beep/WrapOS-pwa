import { useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider } from './context/ThemeContext'
import { AppProvider } from './context/AppContext'
import { MainLayout }      from './layouts/MainLayout'
import { SelecionarPerfil } from './pages/SelecionarPerfil'

// Lazy Loading das páginas pesadas (Code Splitting)
const OrdemServico  = lazy(() => import('./pages/OrdemServico').then(m => ({ default: m.OrdemServico })))
const Agendamento   = lazy(() => import('./pages/Agendamento').then(m => ({ default: m.Agendamento })))
const Clientes      = lazy(() => import('./pages/Clientes').then(m => ({ default: m.Clientes })))
const Financeiro    = lazy(() => import('./pages/Financeiro').then(m => ({ default: m.Financeiro })))
const Estoque       = lazy(() => import('./pages/Estoque').then(m => ({ default: m.Estoque })))
const Equipe        = lazy(() => import('./pages/Equipe').then(m => ({ default: m.Equipe })))
const Configuracoes = lazy(() => import('./pages/Configuracoes').then(m => ({ default: m.Configuracoes })))
const Patio         = lazy(() => import('./pages/Patio').then(m => ({ default: m.Patio })))

export default function App() {
  const [perfilAtivo, setPerfilAtivo] = useState<string | null>(null)

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
      {!perfilAtivo ? (
        <SelecionarPerfil onSelect={setPerfilAtivo} />
      ) : (
        <AppProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="flex h-screen items-center justify-center text-ui-text font-medium text-sm">Carregando módulo...</div>}>
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index               element={<Navigate to="/patio" replace />} />
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
      )}
    </ThemeProvider>
  )
}
