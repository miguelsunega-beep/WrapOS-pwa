import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider } from './context/ThemeContext'
import { AppProvider } from './context/AppContext'
import { MainLayout }      from './layouts/MainLayout'
import { SelecionarPerfil } from './pages/SelecionarPerfil'
import { OrdemServico }    from './pages/OrdemServico'
import { Agendamento }     from './pages/Agendamento'
import { Clientes }        from './pages/Clientes'
import { Financeiro }      from './pages/Financeiro'
import { Estoque }         from './pages/Estoque'
import { Equipe }          from './pages/Equipe'
import { Configuracoes }   from './pages/Configuracoes'
import { Patio }           from './pages/Patio'

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
          </BrowserRouter>
        </AppProvider>
      )}
    </ThemeProvider>
  )
}
