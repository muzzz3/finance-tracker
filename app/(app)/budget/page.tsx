'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, getDaysInMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/finance'
import { useRealtimeRefresh } from '@/lib/use-realtime-refresh'
import { usePrivacyMode } from '@/lib/privacy-mode'
import { CurrencyInput } from '@/components/ui/currency-input'
import type { Category, Transaction, Budget } from '@/lib/types'

interface SubRow {
  amount: number
  billing_cycle: string
  category_id: string | null
}

type Mode = 'dollars' | 'percent'

const subMonthly = (s: SubRow) => (s.billing_cycle === 'yearly' ? s.amount / 12 : s.amount)

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export default function BudgetPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [subs, setSubs] = useState<SubRow[]>([])
  const [earnings, setEarnings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('dollars')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const { privacyMode } = usePrivacyMode()
  const blur = privacyMode ? 'blur select-none transition-all duration-200' : 'transition-all duration-200'

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = getDaysInMonth(new Date(year, month - 1))
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
    const monthStr = startDate

    const [{ data: userData }, { data: cats }, { data: txs }, { data: bgts }, { data: subRows }, { data: income }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('categories').select('*').eq('type', 'expense').order('name'),
      supabase.from('transactions').select('*').eq('type', 'expense').gte('date', startDate).lte('date', endDate),
      supabase.from('budgets').select('*'),
      supabase.from('subscriptions').select('amount,billing_cycle,category_id').eq('active', true),
      supabase.from('monthly_income').select('earnings').eq('month', monthStr).maybeSingle(),
    ])

    setUserId(userData.user?.id ?? null)
    setCategories(cats ?? [])
    setTransactions(txs ?? [])
    setBudgets(bgts ?? [])
    setSubs(subRows ?? [])
    setEarnings(income?.earnings ?? 0)
    setLoading(false)
  }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])
  useRealtimeRefresh('budgets', fetchData)
  useRealtimeRefresh('transactions', fetchData)

  function navigateMonth(dir: -1 | 1) {
    let m = month + dir, y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setMonth(m); setYear(y)
  }

  const categoryById = new Map(categories.map(c => [c.id, c]))
  const topLevel = categories.filter(c => !c.parent_id)
  const carCategory = categories.find(c => c.name === 'Car' && !c.parent_id)

  // A transaction/subscription's budget category is its category's parent,
  // or itself if top-level — except Parking, which has no budget row of its
  // own and folds into Car (see handoff doc).
  function budgetCategoryId(cat: Category): string {
    if (cat.parent_id) return cat.parent_id
    if (cat.name === 'Parking' && carCategory) return carCategory.id
    return cat.id
  }

  const spentByCategory = new Map<string, number>()
  for (const tx of transactions) {
    if (!tx.category_id) continue
    const cat = categoryById.get(tx.category_id)
    if (!cat) continue
    const key = budgetCategoryId(cat)
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + tx.amount)
  }
  for (const s of subs) {
    if (!s.category_id) continue
    const cat = categoryById.get(s.category_id)
    if (!cat) continue
    const key = budgetCategoryId(cat)
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + subMonthly(s))
  }

  const budgetByCategory = new Map(budgets.map(b => [b.category_id, b]))

  const budgetedRows = topLevel
    .filter(cat => cat.name !== 'Parking' && budgetByCategory.has(cat.id))
    .map(cat => {
      const budget = budgetByCategory.get(cat.id)!
      const spent = spentByCategory.get(cat.id) ?? 0
      const pctUsed = budget.monthly_amount > 0 ? (spent / budget.monthly_amount) * 100 : spent > 0 ? 100 : 0
      return { cat, budget, spent, pctUsed }
    })
    .sort((a, b) => a.cat.name.localeCompare(b.cat.name))

  const unbudgetedRows = topLevel
    .filter(cat => cat.name !== 'Parking' && !budgetByCategory.has(cat.id) && (spentByCategory.get(cat.id) ?? 0) > 0)
    .map(cat => ({ cat, spent: spentByCategory.get(cat.id) ?? 0 }))
    .sort((a, b) => b.spent - a.spent)

  const totalSpent = budgetedRows.reduce((s, r) => s + r.spent, 0)
  const totalBudgeted = budgetedRows.reduce((s, r) => s + r.budget.monthly_amount, 0)
  const totalLeft = totalBudgeted - totalSpent
  const totalPctOfEarnings = budgetedRows.reduce((s, r) => s + r.budget.pct_of_earnings, 0)
  const draw = earnings - totalBudgeted // negative = planned draw from savings

  function barColor(pctUsed: number, fallback: string): string {
    if (pctUsed > 100) return '#ef4444'
    if (pctUsed >= 80) return '#f59e0b'
    return fallback
  }

  function startEdit(budget: Budget) {
    setEditingId(budget.category_id)
    setEditValue(String(budget.monthly_amount))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function saveEdit(catId: string) {
    const amount = parseFloat(editValue)
    if (!userId || isNaN(amount) || amount < 0) { cancelEdit(); return }
    const pctOfEarnings = earnings > 0 ? (amount / earnings) * 100 : 0
    const existing = budgetByCategory.get(catId)
    if (existing) {
      const { data } = await supabase
        .from('budgets')
        .update({ monthly_amount: amount, pct_of_earnings: pctOfEarnings, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (data) setBudgets(prev => prev.map(b => b.id === existing.id ? data : b))
    } else {
      const { data } = await supabase
        .from('budgets')
        .insert({ user_id: userId, category_id: catId, monthly_amount: amount, pct_of_earnings: pctOfEarnings })
        .select()
        .single()
      if (data) setBudgets(prev => [...prev, data])
    }
    setEditingId(null)
    setEditValue('')
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Budget</h1>
        <div className="flex items-center gap-3">
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
          <div className="flex rounded-lg border border-white/10 overflow-hidden h-9">
            {(['dollars', 'percent'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 text-sm font-medium transition-colors ${mode === m ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                {m === 'dollars' ? '$' : '%'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">Loading...</div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-[#111827] border border-white/8 rounded-2xl px-5 py-4 grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Spent</p>
              <p className={`text-lg font-bold text-white ${blur}`}>
                {mode === 'dollars' ? formatCurrency(totalSpent) : formatPercent(earnings > 0 ? (totalSpent / earnings) * 100 : 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Budgeted</p>
              <p className={`text-lg font-bold text-slate-300 ${blur}`}>
                {mode === 'dollars' ? formatCurrency(totalBudgeted) : formatPercent(totalPctOfEarnings)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Left</p>
              <p className={`text-lg font-bold ${totalLeft >= 0 ? 'text-emerald-400' : 'text-red-400'} ${blur}`}>
                {mode === 'dollars'
                  ? formatCurrency(totalLeft)
                  : formatPercent(totalPctOfEarnings - (earnings > 0 ? (totalSpent / earnings) * 100 : 0))}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">% of Earnings</p>
              <p className={`text-lg font-bold text-slate-300 ${blur}`}>{formatPercent(totalPctOfEarnings)}</p>
            </div>
          </div>
          {earnings > 0 && draw < 0 && (
            <p className="text-xs text-slate-500 px-1">
              Budgeted draw from savings: <span className={blur}>{formatCurrency(Math.abs(draw))}</span>/mo
            </p>
          )}

          {/* Budgeted rows */}
          <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
            {budgetedRows.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No budgets set yet.</p>
            ) : budgetedRows.map(({ cat, budget, spent, pctUsed }, i) => {
              const left = budget.monthly_amount - spent
              const spentPct = earnings > 0 ? (spent / earnings) * 100 : 0
              const leftPct = budget.pct_of_earnings - spentPct
              const isEditing = editingId === cat.id
              return (
                <div key={cat.id} className={`px-5 py-3.5 ${i < budgetedRows.length - 1 ? 'border-b border-white/6' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color ?? '#64748b' }} />
                      <span className="text-sm font-medium text-slate-200">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${pctUsed > 100 ? 'text-red-400' : pctUsed >= 80 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {pctUsed.toFixed(0)}%
                      </span>
                      <span className={`text-xs ${left >= 0 ? 'text-slate-400' : 'text-red-400'} ${blur}`}>
                        {mode === 'dollars'
                          ? `${formatCurrency(left)} left`
                          : `${formatPercent(leftPct)} left`}
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">$</span>
                          <CurrencyInput
                            raw
                            autoFocus
                            showCents
                            value={editValue}
                            onChange={setEditValue}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(cat.id); if (e.key === 'Escape') cancelEdit() }}
                            className="w-20 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          />
                          <button onClick={() => saveEdit(cat.id)} className="text-emerald-400 hover:text-emerald-300">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelEdit} className="text-slate-500 hover:text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(budget)}
                          className={`text-sm font-semibold text-white hover:text-blue-400 transition-colors ${blur}`}
                        >
                          {mode === 'dollars'
                            ? `${formatCurrency(spent)} / ${formatCurrency(budget.monthly_amount)}`
                            : `${formatPercent(spentPct)} / ${formatPercent(budget.pct_of_earnings)}`}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(pctUsed, 100)}%`, backgroundColor: barColor(pctUsed, cat.color ?? '#4f87ff') }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Unbudgeted */}
          {unbudgetedRows.length > 0 && (
            <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/6">
                <p className="text-sm font-semibold text-slate-400">Unbudgeted</p>
              </div>
              {unbudgetedRows.map(({ cat, spent }, i) => (
                <div key={cat.id} className={`px-5 py-2.5 flex items-center justify-between ${i < unbudgetedRows.length - 1 ? 'border-b border-white/6' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color ?? '#64748b' }} />
                    <span className="text-sm text-slate-300">{cat.name}</span>
                  </div>
                  <span className={`text-sm font-semibold text-slate-300 ${blur}`}>{formatCurrency(spent)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
