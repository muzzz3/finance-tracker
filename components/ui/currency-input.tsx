'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  raw?: boolean
  showCents?: boolean
}

function formatDisplay(raw: string, showCents: boolean, focused: boolean): string {
  if (!raw) return ''
  const [intPart, decPart] = raw.split('.')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (showCents && !focused) {
    const cents = (decPart ?? '').slice(0, 2).padEnd(2, '0')
    return `${formatted}.${cents}`
  }
  return decPart !== undefined ? `${formatted}.${decPart.slice(0, 2)}` : formatted
}

function parseInput(display: string): string {
  const stripped = display.replace(/,/g, '')
  if (stripped && !/^\d*\.?\d*$/.test(stripped)) return display.replace(/,/g, '').slice(0, -1)
  const parts = stripped.split('.')
  if (parts[1]?.length > 2) return `${parts[0]}.${parts[1].slice(0, 2)}`
  return stripped
}

export function CurrencyInput({ value, onChange, raw, showCents, className, onFocus, onBlur, ...props }: CurrencyInputProps) {
  const [focused, setFocused] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(parseInput(e.target.value))
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(true)
    onFocus?.(e)
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(false)
    onBlur?.(e)
  }

  const displayValue = formatDisplay(value, showCents ?? false, focused)

  if (raw) {
    return (
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={className}
        {...props}
      />
    )
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      {...props}
    />
  )
}
