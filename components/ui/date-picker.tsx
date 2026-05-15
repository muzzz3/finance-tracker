'use client'

import { useState, useRef, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => value ? parseISO(value) : new Date())
  const ref = useRef<HTMLDivElement>(null)

  const selected = value ? parseISO(value) : null
  const today = new Date()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Sync view month when value changes externally
  useEffect(() => {
    if (value) setViewDate(parseISO(value))
  }, [value])

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate)),
    end: endOfWeek(endOfMonth(viewDate)),
  })

  function handleSelect(day: Date) {
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors hover:bg-white/8"
      >
        <span className={selected ? 'text-white' : 'text-slate-600'}>
          {selected ? format(selected, 'MMM d, yyyy') : 'Select date'}
        </span>
        <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
      </button>

      {open && (
        <div
          className="absolute left-0 mt-1.5 w-64 rounded-xl border border-white/10 shadow-2xl p-3"
          style={{ backgroundColor: '#1a2235', zIndex: 9999 }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(subMonths(viewDate, 1))}
              className="p-1.5 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-white">
              {format(viewDate, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              className="p-1.5 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d, i) => (
              <div key={i} className="text-center text-xs text-slate-600 py-1 font-medium">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((day, i) => {
              const isSelected = selected ? isSameDay(day, selected) : false
              const isThisMonth = isSameMonth(day, viewDate)
              const isToday = isSameDay(day, today)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={[
                    'text-center text-xs py-1.5 rounded-lg transition-colors font-medium',
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : isToday && isThisMonth
                      ? 'text-blue-400 hover:bg-white/8'
                      : isThisMonth
                      ? 'text-slate-300 hover:bg-white/8'
                      : 'text-slate-700 hover:bg-white/4',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t border-white/6 flex justify-end">
            <button
              type="button"
              onClick={() => handleSelect(today)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
