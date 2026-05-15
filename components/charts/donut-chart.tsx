'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/finance'

interface Slice {
  name: string
  value: number
  color: string
}

interface Props {
  data: Slice[]
  centerLabel?: string
  centerValue?: string
}

export function DonutChart({ data, centerLabel, centerValue }: Props) {
  const filtered = data.filter(d => d.value > 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={90}
            paddingAngle={2}
            strokeWidth={0}
          >
            {filtered.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{ backgroundColor: '#0d1424', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '12px' }}
            labelStyle={{ color: '#94a3b8' }}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-slate-400">{centerLabel}</p>
          <p className="text-base font-bold text-white">{centerValue}</p>
        </div>
      )}
    </div>
  )
}
