import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeCtx {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeCtx>({} as ThemeCtx)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('wrapos_theme') as Theme) ?? 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('wrapos_theme', theme)

    // Safari no iPhone pinta a área da barra de status/endereço com o
    // theme-color: acompanha a cor da barra do topo do tema atual.
    const surface = getComputedStyle(root).getPropertyValue('--wrap-surface').trim()
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', surface || (theme === 'dark' ? '#13161e' : '#ffffff'))
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
