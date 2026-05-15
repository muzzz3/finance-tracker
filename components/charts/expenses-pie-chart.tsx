'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Category } from '@/lib/types'
import { formatCurrency } from '@/lib/finance'

interface Props {
  grouped: Map<string, { category: Category; total: number }>
  categories: Category[]
}

export function ExpensesPieChart({ grouped, categories }: Props) {
  const data = categories
    .filter(c => !c.parent_id) // top-level only; food children roll up via food parent
    .map(cat => {
      if (cat.name === 'Food') {
        // sum children
        const total = Array.from(grouped.values())
          .filter(g => g.category.parent_id === cat.id)
          .reduce((s, g) => s + g.total, 0)
        return { name: cat.name, value: total, color: cat.color ?? '#888' }
      }
      const entry = grouped.get(cat.id)
      return { name: cat.name, value: entry?.total ?? 0, color: cat.color ?? '#888' }
    })
    .filter(d => d.value > 0)

  if (data.length === 0) return null

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
