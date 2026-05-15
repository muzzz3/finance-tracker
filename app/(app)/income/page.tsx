'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/finance'

type FieldKey = 'earnings' | 'k401' | 'roth' | 'stocks'

interface Field {
  key: FieldKey
  label: string
  color: string
}

const FIELDS: Field[] = [
  { key: 'earnings', label: 'Earnings',     color: 'text-emerald-400' },
  { key: 'k401',     label: '401k',         color: 'text-purple-400' },
  { key: 'roth',     label: 'Roth IRA',     color: 'text-violet-400' },
  { key: 'stocks',   label: 'Stock Program', color: 'text-blue-400' },
]

export default function IncomePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [values, setValues] = useState<Record<FieldKey, string>>({
    earnings: '', k401: '', roth: '', stocks: '',
  })
  const [addInputs, setAddInputs] = useState<Record<FieldKey, string>>({
    earnings: '', k401: '', roth: '', stocks: '',
  })

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}-01`
    const [{ data: userData }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('monthly_income').select('*').eq('month', monthStr).maybeSingle(),
    ])
    setUserId(userData.user?.id ?? null)
    setValues({
      earnings: data?.earnings != null ? String(data.earnings) : '',
      k401:     data?.k401     != null ? String(data.k401)     : '',
      roth:     data?.roth     != null ? String(data.roth)     : '',
      stocks:   data?.stocks   != null ? String(data.stocks)   : '',
    })
    setAddInputs({ earnings: '', k401: '', roth: '', stocks: '' })
  }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  function navigateMonth(dir: -1 | 1) {
    let m = month + dir, y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setMonth(m); setYear(y)
  }

  async function saveValues(next: Record<FieldKey, string>) {
    if (!userId) return
    setSaving(true)
    const monthStr = `${year}-${String(month).padStart(2, '0')}-01`
    await supabase.from('monthly_income').upsert({
      user_id: userId,
      month: monthStr,
      earnings: parseFloat(next.earnings) || 0,
      k401:     parseFloat(next.k401)     || 0,
      roth:     parseFloat(next.roth)     || 0,
      stocks:   parseFloat(next.stocks)   || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,month' })
    setSaving(false)
  }

  function handleChange(key: FieldKey, val: string) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  function handleBlur() {
    saveValues(values)
  }

  function handleAdd(key: FieldKey, e: React.FormEvent) {
    e.preventDefault()
    const toAdd = parseFloat(addInputs[key]) || 0
    if (!toAdd) return
    const current = parseFloat(values[key]) || 0
    const next = { ...values, [key]: String(current + toAdd) }
    setValues(next)
    setAddInputs(prev => ({ ...prev, [key]: '' }))
    saveValues(next)
  }

  const totalInvestments = (parseFloat(values.k401) || 0) + (parseFloat(values.roth) || 0) + (parseFloat(values.stocks) || 0)
  const totalEarnings = parseFloat(values.earnings) || 0

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Income</h1>
        <div className="flex items-center gap-1 bg-[#111827] border border-white/8 rounded-xl px-1 py-1">
          <button onClick={() => navigateMonth(-1)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold px-3 min-w-32 text-center text-white">
            {format(new Date(year, month - 1), 'MMMM yyyy')}
          </span>
          <button onClick={() => navigateMonth(1)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map(({ key, label, color }) => (
          <div key={key} className="bg-[#111827] border border-white/8 rounded-2xl px-5 py-5 flex flex-col gap-4">
            {/* Total */}
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">{label}</p>
              <div className="flex items-center gap-1">
                <span className="text-slate-600 text-xl font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={values[key]}
                  onChange={e => handleChange(key, e.target.value)}
                  onBlur={handleBlur}
                  className={`flex-1 bg-transparent text-2xl font-bold focus:outline-none w-full ${color} placeholder-slate-700`}
                />
              </div>
            </div>

            {/* Quick add */}
            <form
              onSubmit={e => handleAdd(key, e)}
              className="flex items-center gap-2 pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-xs text-slate-600">+$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Add amount"
                value={addInputs[key]}
                onChange={e => setAddInputs(prev => ({ ...prev, [key]: e.target.value }))}
                className="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-700 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 w-6 h-6 rounded-md bg-white/8 hover:bg-white/12 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ))}
      </div>

      {/* Summary */}
      {totalEarnings > 0 && (
        <div className="bg-[#111827] border border-white/8 rounded-2xl px-5 py-4 space-y-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Summary</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Earnings</span>
              <span className="text-sm font-semibold text-white">{formatCurrency(totalEarnings)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Total investments</span>
              <span className="text-sm font-semibold text-slate-300">− {formatCurrency(totalInvestments)}</span>
            </div>
            <div className="h-px bg-white/6" />
            <div className="flex justify-between">
              <span className="text-sm text-slate-300 font-medium">Take-home (before expenses)</span>
              <span className="text-sm font-bold text-emerald-400">{formatCurrency(totalEarnings - totalInvestments)}</span>
            </div>
          </div>
        </div>
      )}

      {saving && <p className="text-xs text-slate-600 text-right">Saving...</p>}
    </div>
  )
}
