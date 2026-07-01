const PREFIXO = 'wrapos_'

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function exportarBackup(): void {
  const dados: Record<string, string> = {}

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(PREFIXO)) continue
    const valor = localStorage.getItem(key)
    if (valor !== null) dados[key] = valor
  }

  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `wrapos-backup-${hojeISO()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export function lerArquivoBackup(arquivo: File): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      try {
        const texto = reader.result as string
        const dados = JSON.parse(texto)

        if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
          reject(new Error('Arquivo de backup inválido.'))
          return
        }

        resolve(dados as Record<string, string>)
      } catch {
        reject(new Error('Não foi possível ler o arquivo. Verifique se é um backup válido do WrapOS.'))
      }
    }

    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'))
    reader.readAsText(arquivo)
  })
}

export function restaurarBackup(dados: Record<string, string>): void {
  for (const [key, valor] of Object.entries(dados)) {
    if (!key.startsWith(PREFIXO)) continue
    localStorage.setItem(key, valor)
  }
}

export async function importarBackup(arquivo: File): Promise<void> {
  const dados = await lerArquivoBackup(arquivo)
  restaurarBackup(dados)
}
