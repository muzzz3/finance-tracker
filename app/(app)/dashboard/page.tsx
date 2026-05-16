'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, getDaysInMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { groupTransactionsByCategory, formatCurrency } from '@/lib/finance'
import type { Category, Transaction } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'
import { DonutChart } from '@/components/charts/donut-chart'
import { usePrivacyMode } from '@/lib/privacy-mode'
import Link from 'next/link'

interface MonthlyIncome {
  earnings: number
  k401: number
  roth: number
  stocks: number
}

type SortOrder = 'name' | 'asc' | 'desc'

function SortButtons({ value, onChange }: { value: SortOrder; onChange: (v: SortOrder) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {(['name', 'asc', 'desc'] as SortOrder[]).map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-1.5 py-0.5 rounded text-xs transition-colors ${value === o ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-400'}`}
        >
          {o === 'name' ? 'A–Z' : o === 'asc' ? '↑' : '↓'}
        </button>
      ))}
    </div>
  )
}

function sortItems<T extends { name: string; value: number }>(items: T[], order: SortOrder): T[] {
  if (order === 'name') return [...items].sort((a, b) => a.name.localeCompare(b.name))
  if (order === 'asc') return [...items].sort((a, b) => a.value - b.value)
  return [...items].sort((a, b) => b.value - a.value)
}

export default function DashboardPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomeData, setIncomeData] = useState<MonthlyIncome>({ earnings: 0, k401: 0, roth: 0, stocks: 0 })
  const [activeSubs, setActiveSubs] = useState<Array<{ amount: number; billing_cycle: string; category_id: string | null }>>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expenseSort, setExpenseSort] = useState<SortOrder>('desc')
  const [allocationSort, setAllocationSort] = useState<SortOrder>('desc')
  const [expenseListSort, setExpenseListSort] = useState<SortOrder>('desc')
  const { privacyMode } = usePrivacyMode()
  const blur = privacyMode ? 'blur select-none transition-all duration-200' : 'transition-all duration-200'

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = getDaysInMonth(new Date(year, month - 1))
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
    const monthStr = startDate

    const [{ data: cats }, { data: txs }, { data: income }, { data: subs }] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('transactions').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
      supabase.from('monthly_income').select('*').eq('month', monthStr).maybeSingle(),
      supabase.from('subscriptions').select('amount,billing_cycle,category_id').eq('active', true),
    ])

    setCategories(cats ?? [])
    setTransactions(txs ?? [])
    setIncomeData({
      earnings: income?.earnings ?? 0,
      k401: income?.k401 ?? 0,
      roth: income?.roth ?? 0,
      stocks: income?.stocks ?? 0,
    })
    setActiveSubs(subs ?? [])
    setLoading(false)
  }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  const { earnings, k401, roth, stocks } = incomeData
  const grouped = groupTransactionsByCategory(transactions, categories)
  const foodParent = categories.find(c => c.name === 'Food' && c.type === 'expense')
  const foodChildren = categories.filter(c => c.parent_id === foodParent?.id)
  const expenseTopLevel = categories.filter(c => c.type === 'expense' && !c.parent_id)

  const subMonthlyOf = (s: { amount: number; billing_cycle: string }) =>
    s.billing_cycle === 'yearly' ? s.amount / 12 : s.amount
  const subMonthly = activeSubs.reduce((sum, s) => sum + subMonthlyOf(s), 0)
  const subsByCategory = activeSubs.reduce((acc, s) => {
    if (s.category_id) acc.set(s.category_id, (acc.get(s.category_id) ?? 0) + subMonthlyOf(s))
    return acc
  }, new Map<string, number>())
  const uncategorizedSubMonthly = activeSubs.filter(s => !s.category_id).reduce((sum, s) => sum + subMonthlyOf(s), 0)

  const txExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = txExpenses + subMonthly
  const paycheckSavings = earnings - totalExpenses - k401 - roth - stocks

  function navigateMonth(dir: -1 | 1) {
    let m = month + dir, y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setMonth(m); setYear(y)
  }

  const expenseDonutData = [
    ...expenseTopLevel.map(cat => {
      const subAmount = subsByCategory.get(cat.id) ?? 0
      if (cat.id === foodParent?.id) {
        const total = foodChildren.reduce((s, c) => s + (grouped.get(c.id)?.total ?? 0), 0)
        return { name: 'Food', value: total + subAmount, color: cat.color ?? '#f97316' }
      }
      return { name: cat.name, value: (grouped.get(cat.id)?.total ?? 0) + subAmount, color: cat.color ?? '#888' }
    }),
    ...(uncategorizedSubMonthly > 0 ? [{ name: 'Subscriptions', value: uncategorizedSubMonthly, color: '#38bdf8' }] : []),
  ]

  const allocationDonutData = [
    ...expenseTopLevel.map(cat => {
      const subAmount = subsByCategory.get(cat.id) ?? 0
      if (cat.id === foodParent?.id) {
        const total = foodChildren.reduce((s, c) => s + (grouped.get(c.id)?.total ?? 0), 0)
        return { name: 'Food', value: total + subAmount, color: cat.color ?? '#f97316' }
      }
      return { name: cat.name, value: (grouped.get(cat.id)?.total ?? 0) + subAmount, color: cat.color ?? '#888' }
    }),
    ...(uncategorizedSubMonthly > 0 ? [{ name: 'Subscriptions', value: uncategorizedSubMonthly, color: '#38bdf8' }] : []),
    ...(k401 > 0 ? [{ name: '401k', value: k401, color: '#a78bfa' }] : []),
    ...(roth > 0 ? [{ name: 'Roth IRA', value: roth, color: '#8b5cf6' }] : []),
    ...(stocks > 0 ? [{ name: 'Stocks', value: stocks, color: '#60a5fa' }] : []),
    ...(paycheckSavings > 0 ? [{ name: 'Paycheck Savings', value: paycheckSavings, color: '#34d399' }] : []),
  ]

  const recentTxs = transactions.slice(0, 6)

  const sortedExpenseList = (() => {
    const items = expenseTopLevel.filter(c => c.id !== foodParent?.id).map(cat => ({
      cat,
      total: (grouped.get(cat.id)?.total ?? 0) + (subsByCategory.get(cat.id) ?? 0),
    }))
    if (expenseListSort === 'name') return [...items].sort((a, b) => a.cat.name.localeCompare(b.cat.name))
    if (expenseListSort === 'asc') return [...items].sort((a, b) => a.total - b.total)
    return [...items].sort((a, b) => b.total - a.total)
  })()

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
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
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white border-0">
            <Plus className="w-3.5 h-3.5" /> Add Transaction
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">Loading...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Income', value: earnings, color: 'text-emerald-400' },
              { label: 'Expenses', value: totalExpenses, color: 'text-red-400' },
              { label: 'Paycheck Savings', value: paycheckSavings, color: paycheckSavings >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: '401k & Roth IRA', value: k401 + roth, color: 'text-purple-400' },
              { label: 'Stock Program', value: stocks, color: 'text-blue-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#111827] border border-white/8 rounded-2xl px-5 py-4">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color} ${blur}`}>{formatCurrency(value)}</p>
              </div>
            ))}
          </div>

          {/* Charts + categories */}
          <div className="grid grid-cols-3 gap-5">
            {/* Expense breakdown donut */}
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-white">Expense Breakdown</p>
                <SortButtons value={expenseSort} onChange={setExpenseSort} />
              </div>
              <p className="text-xs text-slate-500 mb-3">Where your spending goes</p>
              <DonutChart data={expenseDonutData} centerLabel="Total" centerValue={privacyMode ? '•••' : formatCurrency(totalExpenses)} />
              <div className="mt-3 space-y-2">
                {sortItems(expenseDonutData.filter(d => d.value > 0), expenseSort).map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-slate-400">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs text-slate-500 ${blur}`}>
                        {txExpenses > 0 ? Math.round((d.value / txExpenses) * 100) : 0}%
                      </span>
                      <span className={`text-xs font-semibold text-white ${blur}`}>{formatCurrency(d.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Income allocation donut */}
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-white">Income Allocation</p>
                <SortButtons value={allocationSort} onChange={setAllocationSort} />
              </div>
              <p className="text-xs text-slate-500 mb-3">Where your paycheck goes</p>
              <DonutChart data={allocationDonutData} centerLabel="Income" centerValue={privacyMode ? '•••' : formatCurrency(earnings)} />
              <div className="mt-3 space-y-2">
                {sortItems(allocationDonutData.filter(d => d.value > 0), allocationSort).map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-slate-400 truncate max-w-24">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs text-slate-500 ${blur}`}>
                        {earnings > 0 ? Math.round((d.value / earnings) * 100) : 0}%
                      </span>
                      <span className={`text-xs font-semibold text-white ${blur}`}>{formatCurrency(d.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Expense category list */}
              <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Expenses</p>
                  <SortButtons value={expenseListSort} onChange={setExpenseListSort} />
                </div>
                {foodParent && (
                  <div className="px-5 py-3 border-b border-white/6">
                    <div className="flex justify-between mb-2">
                      <Link href={`/categories/${foodParent.id}`} className="text-sm text-slate-300 hover:text-blue-400 transition-colors">Food</Link>
                      <span className={`text-sm font-semibold text-white ${blur}`}>
                        {formatCurrency(foodChildren.reduce((s, c) => s + (grouped.get(c.id)?.total ?? 0), 0))}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {foodChildren.map(c => (
                        <div key={c.id} className="bg-white/4 rounded-xl p-2.5">
                          <p className="text-xs text-slate-500">{c.name}</p>
                          <p className={`text-sm font-bold text-white mt-0.5 ${blur}`}>{formatCurrency(grouped.get(c.id)?.total ?? 0)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {sortedExpenseList.map(({ cat, total }) => {
                  const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
                  return (
                    <div key={cat.id} className="px-5 py-2.5 border-b border-white/6 last:border-0">
                      <div className="flex justify-between mb-1">
                        <Link href={`/categories/${cat.id}`} className="text-xs text-slate-300 hover:text-blue-400 transition-colors">{cat.name}</Link>
                        <span className={`text-xs font-semibold text-white ${blur}`}>{formatCurrency(total)}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color ?? '#4f87ff' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Savings breakdown */}
              <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/6">
                  <p className="text-sm font-semibold text-white">Savings</p>
                </div>
                {[
                  { label: '401k', value: k401, color: 'text-purple-400' },
                  { label: 'Roth IRA', value: roth, color: 'text-violet-400' },
                  { label: 'Stock Program', value: stocks, color: 'text-blue-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="px-5 py-2.5 border-b border-white/6 flex justify-between">
                    <span className="text-xs text-slate-300">{label}</span>
                    <span className={`text-xs font-bold ${color} ${blur}`}>{formatCurrency(value)}</span>
                  </div>
                ))}
                <div className="px-5 py-2.5 flex justify-between">
                  <span className="text-xs text-slate-500">Paycheck Savings</span>
                  <span className={`text-xs font-bold ${paycheckSavings >= 0 ? 'text-emerald-400' : 'text-red-400'} ${blur}`}>
                    {formatCurrency(paycheckSavings)}
                  </span>
                </div>
              </div>

              {/* Recent transactions */}
              <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/6 flex justify-between items-center">
                  <p className="text-sm font-semibold text-white">Recent</p>
                  <Link href="/transactions" className="text-xs text-blue-400 hover:underline">View all</Link>
                </div>
                {recentTxs.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-slate-500">No transactions this month.</p>
                ) : recentTxs.map((tx, i) => {
                  const cat = categories.find(c => c.id === tx.category_id)
                  return (
                    <div key={tx.id} className={`px-5 py-2.5 flex justify-between hover:bg-white/2 transition-colors ${i < recentTxs.length - 1 ? 'border-b border-white/6' : ''}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? '#475569' }} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-300 truncate">{tx.description || cat?.name || 'Transaction'}</p>
                          <p className="text-xs text-slate-600">{format(new Date(tx.date + 'T00:00:00'), 'MMM d')}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold text-white shrink-0 ml-2 ${blur}`}>{formatCurrency(tx.amount)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <AddTransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} categories={categories} onSuccess={fetchData} />
    </div>
  )
}
