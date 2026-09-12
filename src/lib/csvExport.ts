/**
 * Exportação CSV genérica (Financeiro, Clientes) — pt-BR/Excel.
 *
 * Separador ';' em vez de ',': valores em R$ usam vírgula como separador
 * decimal no Brasil (ex: "1234,56"), o que quebraria o parse de colunas
 * num CSV separado por vírgula. BOM UTF-8 no início do arquivo evita
 * acentuação quebrada ao abrir no Excel em pt-BR.
 */

const SEPARADOR = ';'
const BOM = '﻿'

function escapeCsvField(value: string): string {
  if (value.includes(SEPARADOR) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const linhas = [headers, ...rows].map(cols => cols.map(escapeCsvField).join(SEPARADOR))
  return BOM + linhas.join('\r\n')
}

/** Formata número como decimal pt-BR (vírgula), sem separador de milhar nem símbolo de moeda. */
export function formatCsvValor(v: number): string {
  return v.toFixed(2).replace('.', ',')
}

/** Remove acentos e caracteres não seguros pra nome de arquivo, preservando legibilidade. */
const DIACRITICOS = new RegExp('[̀-ͯ]', 'g')

export function slugifyForFilename(text: string): string {
  return text
    .normalize('NFD').replace(DIACRITICOS, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
