import { ReactNode } from 'react'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (value: unknown, row: T) => ReactNode
  width?: string
  align?: 'left' | 'right' | 'center'
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  emptyMessage?: string
}

export function Table<T>({ columns, data, keyExtractor, onRowClick, emptyMessage = 'Nenhum registro encontrado.' }: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-ui-border">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-${col.align ?? 'left'}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ui-border">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-gray-600 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-surface-600/50' : 'hover:bg-surface-600/30'}`}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`py-3.5 px-4 text-sm text-gray-300 text-${col.align ?? 'left'}`}
                  >
                    {col.render
                      ? col.render((row as Record<string, unknown>)[String(col.key)], row)
                      : String((row as Record<string, unknown>)[String(col.key)] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
