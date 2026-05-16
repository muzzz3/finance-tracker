'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/finance'
import { Plus, Pencil, Trash2, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { CurrencyInput } from '@/components/ui/currency-input'
import { format, parseISO } from 'date-fns'

interface Subscription {
  id: string
  name: string
  amount: number
  billing_cycle: 'monthly' | 'yearly'
  next_billing_date: string | null
  color: string | null
  active: boolean
  group_name: string | null
}

const COLORS = [
  '#60a5fa', '#34d399', '#f59e0b', '#f87171', '#a78bfa',
  '#fb923c', '#e879f9', '#94a3b8', '#38bdf8', '#4ade80',
]

const SUGGESTED_GROUPS = [
  'Credit Cards', 'Entertainment', 'Food', 'Gaming',
  'Health & Fitness', 'Home', 'Shopping', 'Software & Tools',
]

const monthlyAmount = (s: Subscription) =>
  s.billing_cycle === 'yearly' ? s.amount / 12 : s.amount

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [nextDate, setNextDate] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [groupName, setGroupName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: userData }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('subscriptions').select('*').order('name'),
    ])
    setUserId(userData.user?.id ?? null)
    setSubs(data ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  function openAdd() {
    setEditing(null)
    setName(''); setAmount(''); setCycle('monthly'); setNextDate(''); setColor(COLORS[0]); setGroupName(''); setError('')
    setDialogOpen(true)
  }

  function openEdit(s: Subscription) {
    setEditing(s)
    setName(s.name)
    setAmount(String(s.amount))
    setCycle(s.billing_cycle)
    setNextDate(s.next_billing_date ?? '')
    setColor(s.color ?? COLORS[0])
    setGroupName(s.group_name ?? '')
    setError('')
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Enter a name'); return }
    if (!amount || isNaN(parseFloat(amount))) { setError('Enter a valid amount'); return }
    setSaving(true)
    const payload = {
      name: name.trim(),
      amount: parseFloat(amount),
      billing_cycle: cycle,
      next_billing_date: nextDate || null,
      color,
      group_name: groupName.trim() || null,
      updated_at: new Date().toISOString(),
    }
    if (editing) {
      const { data } = await supabase.from('subscriptions').update(payload).eq('id', editing.id).select().single()
      if (data) setSubs(prev => prev.map(s => s.id === editing.id ? data : s).sort((a, b) => a.name.localeCompare(b.name)))
    } else {
      const { data } = await supabase.from('subscriptions').insert({ ...payload, user_id: userId }).select().single()
      if (data) setSubs(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setSaving(false)
    setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('subscriptions').delete().eq('id', id)
    setSubs(prev => prev.filter(s => s.id !== id))
  }

  async function toggleActive(s: Subscription) {
    const { data } = await supabase.from('subscriptions').update({ active: !s.active }).eq('id', s.id).select().single()
    if (data) setSubs(prev => prev.map(x => x.id === s.id ? data : x))
  }

  const active = subs.filter(s => s.active)
  const paused = subs.filter(s => !s.active)
  const totalMonthly = active.reduce((sum, s) => sum + monthlyAmount(s), 0)
  const totalYearly = totalMonthly * 12

  // Group active subs by group_name
  const groupedActive = active.reduce((acc, s) => {
    const group = s.group_name ?? ''
    if (!acc[group]) acc[group] = []
    acc[group].push(s)
    return acc
  }, {} as Record<string, Subscription[]>)

  // Named groups sorted alphabetically, ungrouped at end
  const namedGroups = Object.keys(groupedActive).filter(g => g !== '').sort((a, b) => a.localeCompare(b))
  const hasUngrouped = !!groupedActive['']

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Subscriptions</h1>
        <Button onClick={openAdd} size="sm" className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white border-0">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading...</div>
      ) : (
        <>
          {/* Summary */}
          {active.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#111827] border border-white/8 rounded-2xl px-5 py-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Monthly</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(totalMonthly)}</p>
              </div>
              <div className="bg-[#111827] border border-white/8 rounded-2xl px-5 py-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Yearly</p>
                <p className="text-2xl font-bold text-slate-300">{formatCurrency(totalYearly)}</p>
              </div>
            </div>
          )}

          {subs.length === 0 ? (
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-12 text-center">
              <p className="text-white font-semibold mb-1">No subscriptions yet</p>
              <p className="text-sm text-slate-500 mb-4">Track your recurring payments in one place.</p>
              <Button onClick={openAdd} size="sm" className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white border-0">
                <Plus className="w-3.5 h-3.5" /> Add subscription
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Named groups */}
              {namedGroups.map(group => {
                const items = groupedActive[group]
                const groupTotal = items.reduce((sum, s) => sum + monthlyAmount(s), 0)
                return (
                  <div key={group} className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/6 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{group}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(groupTotal)}/mo</p>
                    </div>
                    {items.map((s, i) => (
                      <SubRow
                        key={s.id}
                        s={s}
                        last={i === items.length - 1}
                        onEdit={() => openEdit(s)}
                        onDelete={() => handleDelete(s.id)}
                        onToggle={() => toggleActive(s)}
                      />
                    ))}
                  </div>
                )
              })}

              {/* Ungrouped active */}
              {hasUngrouped && (
                <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/6 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-400">Ungrouped</p>
                    <p className="text-xs text-slate-500">{formatCurrency(groupedActive[''].reduce((sum, s) => sum + monthlyAmount(s), 0))}/mo</p>
                  </div>
                  {groupedActive[''].map((s, i) => (
                    <SubRow
                      key={s.id}
                      s={s}
                      last={i === groupedActive[''].length - 1}
                      onEdit={() => openEdit(s)}
                      onDelete={() => handleDelete(s.id)}
                      onToggle={() => toggleActive(s)}
                    />
                  ))}
                </div>
              )}

              {/* Paused */}
              {paused.length > 0 && (
                <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/6">
                    <p className="text-sm font-semibold text-slate-500">Paused</p>
                  </div>
                  {paused.map((s, i) => (
                    <SubRow
                      key={s.id}
                      s={s}
                      last={i === paused.length - 1}
                      onEdit={() => openEdit(s)}
                      onDelete={() => handleDelete(s.id)}
                      onToggle={() => toggleActive(s)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#111827] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Subscription' : 'Add Subscription'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Name</Label>
              <Input autoFocus placeholder="e.g. Netflix" value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Group (optional)</Label>
              <Input
                list="group-suggestions"
                placeholder="e.g. Entertainment"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
              <datalist id="group-suggestions">
                {SUGGESTED_GROUPS.map(g => <option key={g} value={g} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300">Amount ($)</Label>
                <CurrencyInput placeholder="0.00" value={amount} onChange={setAmount} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Billing cycle</Label>
                <div className="flex rounded-lg border border-white/10 overflow-hidden h-9">
                  {(['monthly', 'yearly'] as const).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCycle(c)}
                      className={`flex-1 text-sm font-medium transition-colors capitalize ${cycle === c ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Next billing date (optional)</Label>
              <DatePicker value={nextDate} onChange={setNextDate} />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                    style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                  />
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10 text-slate-300">Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white border-0">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SubRow({ s, last, onEdit, onDelete, onToggle }: {
  s: Subscription
  last: boolean
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const monthly = monthlyAmount(s)
  const isYearly = s.billing_cycle === 'yearly'

  return (
    <div className={`px-5 py-3.5 flex items-center justify-between hover:bg-white/2 transition-colors ${!last ? 'border-b border-white/6' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color ?? '#94a3b8', opacity: s.active ? 1 : 0.4 }} />
        <div>
          <p className={`text-sm font-medium ${s.active ? 'text-slate-200' : 'text-slate-500'}`}>{s.name}</p>
          <p className="text-xs text-slate-600">
            {isYearly
              ? `${formatCurrency(s.amount)}/yr · ${formatCurrency(monthly)}/mo`
              : `${formatCurrency(s.amount)}/mo`}
            {s.next_billing_date && ` · renews ${format(parseISO(s.next_billing_date), 'MMM d')}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <p className={`text-sm font-bold ${s.active ? 'text-white' : 'text-slate-600'}`}>{formatCurrency(monthly)}<span className="text-xs font-normal text-slate-600">/mo</span></p>
        <button onClick={onToggle} className="text-slate-600 hover:text-slate-300 transition-colors ml-1">
          {s.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onEdit} className="text-slate-600 hover:text-blue-400 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="text-slate-600 hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
