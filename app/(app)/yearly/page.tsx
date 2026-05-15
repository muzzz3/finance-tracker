'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/finance'
import type { Transaction } from '@/lib/types'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

interface MonthlyIncomeRow {
  month: string
  earnings: number
  k401: number
  roth: number
  stocks: number
}

export default function YearlyPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomeRows, setIncomeRows] = useState<MonthlyIncomeRow[]>([])
  const [subMonthly, setSubMonthly] = useState(0)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: txs }, { data: income }, { data: subs }] = await Promise.all([
      supabase.from('transactions').select('*').gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
      supabase.from('monthly_income').select('*').gte('month', `${year}-01-01`).lte('month', `${year}-12-31`),
      supabase.from('subscriptions').select('amount,billing_cycle').eq('active', true),
    ])
    setTransactions(txs ?? [])
    setIncomeRows(income ?? [])
    setSubMonthly((subs ?? []).reduce((sum, s) =>
      sum + (s.billing_cycle === 'yearly' ? s.amount / 12 : s.amount), 0))
    setLoading(false)
  }, [year]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const monthStr = `${year}-${String(m).padStart(2, '0')}`
    const monthTxs = transactions.filter(t => t.date.startsWith(monthStr))
    const row = incomeRows.find(r => r.month.startsWith(monthStr))

    const earnings = row?.earnings ?? 0
    const k401 = row?.k401 ?? 0
    const roth = row?.roth ?? 0
    const stocks = row?.stocks ?? 0
    const txExpenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const expenses = txExpenses + (earnings > 0 || txExpenses > 0 ? subMonthly : 0)
    const paycheckSavings = Math.max(0, earnings - expenses - k401 - roth - stocks)
    const savings = k401 + roth + stocks + paycheckSavings

    return {
      month: format(new Date(year, i), 'MMM'),
      Income: earnings,
      Expenses: expenses,
      Savings: savings,
    }
  })

  const totals = monthlyData.reduce(
    (acc, m) => ({ income: acc.income + m.Income, expenses: acc.expenses + m.Expenses, savings: acc.savings + m.Savings }),
    { income: 0, expenses: 0, savings: 0 }
  )

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Yearly View</h1>
          <p className="text-sm text-slate-500 mt-0.5">Month-by-month breakdown</p>
        </div>
        <div className="flex items-center gap-1 bg-[#111827] border border-white/8 rounded-xl px-1 py-1">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold px-4 text-white">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Income', value: totals.income, color: 'text-emerald-400' },
              { label: 'Total Expenses', value: totals.expenses, color: 'text-red-400' },
              { label: 'Total Savings', value: totals.savings, color: 'text-blue-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#111827] border border-white/8 rounded-2xl px-5 py-4">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{formatCurrency(value)}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#111827] border border-white/8 rounded-2xl p-6">
            <p className="text-sm font-semibold text-white mb-4">Monthly Overview</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.25 / 500) * 500]} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ backgroundColor: '#1a2235', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="Income" stroke="#34d399" strokeWidth={2} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="Expenses" stroke="#f87171" strokeWidth={2} fill="url(#expenseGrad)" />
                <Area type="monotone" dataKey="Savings" stroke="#60a5fa" strokeWidth={2} fill="url(#savingsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-4 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Month', 'Income', 'Expenses', 'Savings'].map(h => (
                <span key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right first:text-left">{h}</span>
              ))}
            </div>
            {monthlyData.map((row, i) => (
              <div
                key={row.month}
                className="grid grid-cols-4 px-5 py-3.5 hover:bg-white/2 transition-colors"
                style={{ borderBottom: i < 11 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <span className="text-sm font-medium text-slate-300">{row.month}</span>
                <span className="text-sm font-semibold text-right text-emerald-400">{formatCurrency(row.Income)}</span>
                <span className="text-sm font-semibold text-right text-red-400">{formatCurrency(row.Expenses)}</span>
                <span className="text-sm font-semibold text-right text-blue-400">{formatCurrency(row.Savings)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
