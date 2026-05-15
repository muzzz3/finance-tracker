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
import Link from 'next/link'

interface MonthlyIncome {
  earnings: number
  k401: number
  roth: number
  stocks: number
}

export default function DashboardPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomeData, setIncomeData] = useState<MonthlyIncome>({ earnings: 0, k401: 0, roth: 0, stocks: 0 })
  const [subMonthly, setSubMonthly] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

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
      supabase.from('subscriptions').select('amount,billing_cycle').eq('active', true),
    ])

    setCategories(cats ?? [])
    setTransactions(txs ?? [])
    setIncomeData({
      earnings: income?.earnings ?? 0,
      k401: income?.k401 ?? 0,
      roth: income?.roth ?? 0,
      stocks: income?.stocks ?? 0,
    })
    setSubMonthly((subs ?? []).reduce((sum, s) =>
      sum + (s.billing_cycle === 'yearly' ? s.amount / 12 : s.amount), 0))
    setLoading(false)
  }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  const { earnings, k401, roth, stocks } = incomeData
  const grouped = groupTransactionsByCategory(transactions, categories)
  const foodParent = categories.find(c => c.name === 'Food' && c.type === 'expense')
  const foodChildren = categories.filter(c => c.parent_id === foodParent?.id)
  const expenseTopLevel = categories.filter(c => c.type === 'expense' && !c.parent_id)
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
      if (cat.id === foodParent?.id) {
        const total = foodChildren.reduce((s, c) => s + (grouped.get(c.id)?.total ?? 0), 0)
        return { name: 'Food', value: total, color: cat.color ?? '#f97316' }
      }
      return { name: cat.name, value: grouped.get(cat.id)?.total ?? 0, color: cat.color ?? '#888' }
    }),
    ...(subMonthly > 0 ? [{ name: 'Subscriptions', value: subMonthly, color: '#38bdf8' }] : []),
  ]

  const allocationDonutData = [
    ...expenseTopLevel.map(cat => {
      if (cat.id === foodParent?.id) {
        const total = foodChildren.reduce((s, c) => s + (grouped.get(c.id)?.total ?? 0), 0)
        return { name: 'Food', value: total, color: cat.color ?? '#f97316' }
      }
      return { name: cat.name, value: grouped.get(cat.id)?.total ?? 0, color: cat.color ?? '#888' }
    }),
    ...(k401 > 0 ? [{ name: '401k', value: k401, color: '#a78bfa' }] : []),
    ...(roth > 0 ? [{ name: 'Roth IRA', value: roth, color: '#8b5cf6' }] : []),
    ...(stocks > 0 ? [{ name: 'Stocks', value: stocks, color: '#60a5fa' }] : []),
    ...(paycheckSavings > 0 ? [{ name: 'Paycheck Savings', value: paycheckSavings, color: '#34d399' }] : []),
  ]

  const recentTxs = transactions.slice(0, 6)

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
                <p className={`text-2xl font-bold ${color}`}>{formatCurrency(value)}</p>
              </div>
            ))}
          </div>

          {/* Charts + categories */}
          <div className="grid grid-cols-3 gap-5">
            {/* Expense breakdown donut */}
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white mb-1">Expense Breakdown</p>
              <p className="text-xs text-slate-500 mb-3">Where your spending goes</p>
              <DonutChart data={expenseDonutData} centerLabel="Total" centerValue={formatCurrency(totalExpenses)} />
              <div className="mt-3 space-y-2">
                {expenseDonutData.filter(d => d.value > 0).map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-slate-400">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {txExpenses > 0 ? Math.round((d.value / txExpenses) * 100) : 0}%
                      </span>
                      <span className="text-xs font-semibold text-white">{formatCurrency(d.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Income allocation donut */}
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white mb-1">Income Allocation</p>
              <p className="text-xs text-slate-500 mb-3">Where your paycheck goes</p>
              <DonutChart data={allocationDonutData} centerLabel="Income" centerValue={formatCurrency(earnings)} />
              <div className="mt-3 space-y-2">
                {allocationDonutData.filter(d => d.value > 0).map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-slate-400 truncate max-w-24">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {earnings > 0 ? Math.round((d.value / earnings) * 100) : 0}%
                      </span>
                      <span className="text-xs font-semibold text-white">{formatCurrency(d.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Expense category list */}
              <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/6">
                  <p className="text-sm font-semibold text-white">Expenses</p>
                </div>
                {foodParent && (
                  <div className="px-5 py-3 border-b border-white/6">
                    <div className="flex justify-between mb-2">
                      <Link href={`/categories/${foodParent.id}`} className="text-sm text-slate-300 hover:text-blue-400 transition-colors">Food</Link>
                      <span className="text-sm font-semibold text-white">
                        {formatCurrency(foodChildren.reduce((s, c) => s + (grouped.get(c.id)?.total ?? 0), 0))}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {foodChildren.map(c => (
                        <div key={c.id} className="bg-white/4 rounded-xl p-2.5">
                          <p className="text-xs text-slate-500">{c.name}</p>
                          <p className="text-sm font-bold text-white mt-0.5">{formatCurrency(grouped.get(c.id)?.total ?? 0)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {expenseTopLevel.filter(c => c.id !== foodParent?.id).map(cat => {
                  const total = grouped.get(cat.id)?.total ?? 0
                  const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
                  return (
                    <div key={cat.id} className="px-5 py-2.5 border-b border-white/6 last:border-0">
                      <div className="flex justify-between mb-1">
                        <Link href={`/categories/${cat.id}`} className="text-xs text-slate-300 hover:text-blue-400 transition-colors">{cat.name}</Link>
                        <span className="text-xs font-semibold text-white">{formatCurrency(total)}</span>
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
                    <span className={`text-xs font-bold ${color}`}>{formatCurrency(value)}</span>
                  </div>
                ))}
                <div className="px-5 py-2.5 flex justify-between">
                  <span className="text-xs text-slate-500">Paycheck Savings</span>
                  <span className={`text-xs font-bold ${paycheckSavings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
                      <span className="text-xs font-bold text-white shrink-0 ml-2">{formatCurrency(tx.amount)}</span>
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
