'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/finance'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DonutChart } from '@/components/charts/donut-chart'

interface Account {
  id: string
  name: string
  institution: string | null
  type: string
  asset_class: string
  balance: number
  color: string | null
  updated_at: string
}

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking', liability: false },
  { value: 'savings', label: 'Savings', liability: false },
  { value: 'brokerage', label: 'Brokerage', liability: false },
  { value: 'retirement', label: 'Retirement (401k/IRA)', liability: false },
  { value: 'other', label: 'Other Asset', liability: false },
  { value: 'credit', label: 'Credit Card', liability: true },
  { value: 'loan', label: 'Loan', liability: true },
]

const ASSET_CLASSES = [
  { value: 'cash', label: 'Cash', color: '#34d399' },
  { value: 'stocks', label: 'Stocks & ETFs', color: '#60a5fa' },
  { value: 'crypto', label: 'Crypto', color: '#f59e0b' },
  { value: 'retirement', label: 'Retirement', color: '#a78bfa' },
  { value: 'bonds', label: 'Bonds', color: '#6ee7b7' },
  { value: 'real_estate', label: 'Real Estate', color: '#fb923c' },
  { value: 'other', label: 'Other', color: '#94a3b8' },
  { value: 'liability', label: 'Liability', color: '#f87171' },
]

const DEFAULT_ASSET_CLASS: Record<string, string> = {
  checking: 'cash', savings: 'cash', brokerage: 'stocks',
  retirement: 'retirement', other: 'other', credit: 'liability', loan: 'liability',
}

const isLiability = (type: string) => ACCOUNT_TYPES.find(t => t.value === type)?.liability ?? false

export default function NetWorthPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [type, setType] = useState('checking')
  const [assetClass, setAssetClass] = useState('cash')
  const [balance, setBalance] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: userData }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('accounts').select('*').order('created_at'),
    ])
    setUserId(userData.user?.id ?? null)
    setAccounts(data ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  function openAdd() {
    setEditingAccount(null)
    setName(''); setInstitution(''); setType('checking'); setAssetClass('cash'); setBalance(''); setError('')
    setDialogOpen(true)
  }

  function openEdit(account: Account) {
    setEditingAccount(account)
    setName(account.name)
    setInstitution(account.institution ?? '')
    setType(account.type)
    setAssetClass(account.asset_class)
    setBalance(String(account.balance))
    setError('')
    setDialogOpen(true)
  }

  function handleTypeChange(newType: string) {
    setType(newType)
    setAssetClass(DEFAULT_ASSET_CLASS[newType] ?? 'other')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Enter an account name'); return }
    if (!balance || isNaN(parseFloat(balance))) { setError('Enter a valid balance'); return }

    setSaving(true)
    setError('')

    const color = ASSET_CLASSES.find(a => a.value === assetClass)?.color ?? '#94a3b8'
    const payload = {
      name: name.trim(),
      institution: institution.trim() || null,
      type, asset_class: assetClass,
      balance: parseFloat(balance),
      color,
      updated_at: new Date().toISOString(),
    }

    if (editingAccount) {
      await supabase.from('accounts').update(payload).eq('id', editingAccount.id)
    } else {
      await supabase.from('accounts').insert({ ...payload, user_id: userId })
    }

    setSaving(false)
    setDialogOpen(false)
    fetchData()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('accounts').delete().eq('id', id)
    setAccounts(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  const assets = accounts.filter(a => !isLiability(a.type))
  const liabilities = accounts.filter(a => isLiability(a.type))
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0)
  const netWorth = totalAssets - totalLiabilities

  // Asset allocation donut — group assets by asset_class
  const allocationData = ASSET_CLASSES.filter(ac => ac.value !== 'liability').map(ac => ({
    name: ac.label,
    value: assets.filter(a => a.asset_class === ac.value).reduce((s, a) => s + a.balance, 0),
    color: ac.color,
  })).filter(d => d.value > 0)

  // Group assets by account type for the list
  const assetGroups = ACCOUNT_TYPES.filter(t => !t.liability).map(t => ({
    ...t,
    accounts: assets.filter(a => a.type === t.value),
  })).filter(g => g.accounts.length > 0)

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Net Worth</h1>
        <Button onClick={openAdd} size="sm" className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white border-0">
          <Plus className="w-3.5 h-3.5" /> Add Account
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#111827] border border-white/8 rounded-2xl px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Net Worth</p>
              <p className={`text-3xl font-bold ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(netWorth)}</p>
            </div>
            <div className="bg-[#111827] border border-white/8 rounded-2xl px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Assets</p>
              <p className="text-3xl font-bold text-emerald-400">{formatCurrency(totalAssets)}</p>
            </div>
            <div className="bg-[#111827] border border-white/8 rounded-2xl px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Liabilities</p>
              <p className="text-3xl font-bold text-red-400">{formatCurrency(totalLiabilities)}</p>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-12 text-center">
              <p className="text-white font-semibold mb-1">No accounts yet</p>
              <p className="text-sm text-slate-500 mb-4">Add your bank, brokerage, and retirement accounts.</p>
              <Button onClick={openAdd} size="sm" className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white border-0">
                <Plus className="w-3.5 h-3.5" /> Add Account
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-5">
              {/* Asset allocation donut */}
              {allocationData.length > 0 && (
                <div className="col-span-2 bg-[#111827] border border-white/8 rounded-2xl p-5">
                  <p className="text-sm font-semibold text-white mb-1">Asset Allocation</p>
                  <p className="text-xs text-slate-500 mb-2">Where your money is</p>
                  <DonutChart data={allocationData} centerLabel="Assets" centerValue={formatCurrency(totalAssets)} />
                  <div className="mt-3 space-y-2">
                    {allocationData.map(d => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-xs text-slate-400">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {totalAssets > 0 ? Math.round((d.value / totalAssets) * 100) : 0}%
                          </span>
                          <span className="text-xs font-semibold text-white">{formatCurrency(d.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Account list */}
              <div className={`${allocationData.length > 0 ? 'col-span-3' : 'col-span-5'} space-y-3`}>
                {assetGroups.map(group => (
                  <div key={group.value} className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/6 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{group.label}</p>
                      <span className="text-sm font-bold text-emerald-400">
                        {formatCurrency(group.accounts.reduce((s, a) => s + a.balance, 0))}
                      </span>
                    </div>
                    {group.accounts.map((account, i, arr) => (
                      <div key={account.id} className={`px-5 py-3 flex items-center justify-between hover:bg-white/2 transition-colors ${i < arr.length - 1 ? 'border-b border-white/6' : ''}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: account.color ?? '#94a3b8' }} />
                          <div>
                            <p className="text-sm font-medium text-slate-200">{account.name}</p>
                            <p className="text-xs text-slate-500">
                              {account.institution && `${account.institution} · `}
                              {ASSET_CLASSES.find(a => a.value === account.asset_class)?.label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold text-white">{formatCurrency(account.balance)}</p>
                          <button onClick={() => openEdit(account)} className="text-slate-600 hover:text-blue-400 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(account.id)} disabled={deleting === account.id} className="text-slate-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {liabilities.length > 0 && (
                  <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/6 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">Liabilities</p>
                      <span className="text-sm font-bold text-red-400">{formatCurrency(totalLiabilities)}</span>
                    </div>
                    {liabilities.map((account, i, arr) => (
                      <div key={account.id} className={`px-5 py-3 flex items-center justify-between hover:bg-white/2 transition-colors ${i < arr.length - 1 ? 'border-b border-white/6' : ''}`}>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{account.name}</p>
                          {account.institution && <p className="text-xs text-slate-500">{account.institution}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold text-red-400">{formatCurrency(account.balance)}</p>
                          <button onClick={() => openEdit(account)} className="text-slate-600 hover:text-blue-400 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(account.id)} disabled={deleting === account.id} className="text-slate-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#111827] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Update Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Account name</Label>
              <Input placeholder="e.g. Chase Checking" value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Institution (optional)</Label>
              <Input placeholder="e.g. Chase, Fidelity" value={institution} onChange={e => setInstitution(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300">Account type</Label>
                <Select value={type} onValueChange={v => handleTypeChange(v ?? 'checking')}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Asset class</Label>
                <Select value={assetClass} onValueChange={v => setAssetClass(v ?? 'other')}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_CLASSES.filter(a => a.value !== 'liability').map(a => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Current balance ($)</Label>
              <CurrencyInput placeholder="0.00" value={balance} onChange={setBalance} className="bg-white/5 border-white/10 text-white" />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10 text-slate-300">Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white border-0">
                {saving ? 'Saving...' : editingAccount ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
