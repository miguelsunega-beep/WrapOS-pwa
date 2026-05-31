import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { format, parse, isValid } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import 'react-day-picker/dist/style.css'

interface DateFieldProps {
  value: string
  onChange: (iso: string) => void
  min?: string
  placeholder?: string
}

const toDate = (iso: string): Date | undefined => {
  if (!iso) return undefined
  const d = parse(iso, 'yyyy-MM-dd', new Date())
  return isValid(d) ? d : undefined
}

export function DateField({ value, onChange, min, placeholder = 'Selecione a data' }: DateFieldProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const selected = toDate(value)
  const minDate = min ? toDate(min) : undefined
  const label = selected ? format(selected, 'dd/MM/yyyy') : placeholder

  const POP_HEIGHT = 340
  const POP_WIDTH = 300

  const reposition = () => {
    const btn = btnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const openUp = spaceBelow < POP_HEIGHT && r.top > spaceBelow
    const top = openUp ? r.top - POP_HEIGHT - 6 : r.bottom + 6
    let left = r.left
    if (left + POP_WIDTH > window.innerWidth - 8) left = window.innerWidth - POP_WIDTH - 8
    if (left < 8) left = 8
    setCoords({ top, left, width: r.width })
  }

  useLayoutEffect(() => {
    if (open) reposition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (popRef.current && !popRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
        setOpen(false)
      }
    }
    const onScrollResize = () => reposition()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onScrollResize)
    window.addEventListener('scroll', onScrollResize, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onScrollResize)
      window.removeEventListener('scroll', onScrollResize, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-left transition-colors hover:border-accent/40 focus:border-accent/50 outline-none"
        style={{ color: selected ? 'var(--wrap-text, #f0f0f4)' : '#5a6070' }}
      >
        <span>{label}</span>
        <CalendarIcon size={14} style={{ color: '#5a6070' }} />
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          className="rounded-xl shadow-2xl p-2 wrapos-daypicker"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 9999,
            background: 'var(--wrap-surface)',
            border: '1px solid var(--wrap-border2)',
          }}
        >
          <DayPicker
            mode="single"
            locale={ptBR}
            selected={selected}
            defaultMonth={selected ?? new Date()}
            disabled={minDate ? { before: minDate } : undefined}
            onSelect={(d) => {
              if (d) { onChange(format(d, 'yyyy-MM-dd')); setOpen(false) }
            }}
          />
        </div>,
        document.body,
      )}
    </>
  )
}
