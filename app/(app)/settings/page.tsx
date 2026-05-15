'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { IncomeConfig } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/finance'

const ALL_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export default function SettingsPage() {
  const [configs, setConfigs] = useState<IncomeConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New income form
  const [sourceName, setSourceName] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [error, setError] = useState('')

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('income_config').select('*').order('created_at')
    setConfigs(data ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  function toggleDay(day: number) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  async function handleAddConfig(e: React.FormEvent) {
    e.preventDefault()
    if (!sourceName.trim()) { setError('Enter a source name'); return }
    if (!amount || isNaN(parseFloat(amount))) { setError('Enter a valid amount'); return }
    if (selectedDays.length === 0) { setError('Select at least one pay day'); return }

    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('income_config').insert({
      source_name: sourceName.trim(),
      amount: parseFloat(amount),
      pay_days: selectedDays,
    })

    if (err) {
      setError(err.message)
    } else {
      setSourceName('')
      setAmount('')
      setSelectedDays([])
      await fetchData()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('income_config').delete().eq('id', id)
    setConfigs(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : configs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No income sources configured.</p>
          ) : (
            <div className="space-y-3">
              {configs.map(config => (
                <div key={config.id} className="flex items-start justify-between border rounded-lg px-4 py-3">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{config.source_name}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(config.amount)} per paycheck</p>
                    <p className="text-xs text-muted-foreground">
                      Pay days: {config.pay_days.join(', ')} of each month
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Add income source</p>
            <form onSubmit={handleAddConfig} className="space-y-4">
              <div className="space-y-2">
                <Label>Source name</Label>
                <Input
                  placeholder="e.g. ServiceNow"
                  value={sourceName}
                  onChange={e => setSourceName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount per paycheck ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Pay days of month</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`w-8 h-8 text-xs rounded-md border transition-colors ${
                        selectedDays.includes(day)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                {selectedDays.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedDays.join(', ')}
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Add income source'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
