'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { Plus, Pencil, Search } from 'lucide-react'
import Fuse from 'fuse.js'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/finance'
import type { Category, Transaction } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'

export default function TransactionsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: cats }, { data: txs }] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('transactions').select('*').order('date', { ascending: false }).limit(500),
    ])
    setCategories(cats ?? [])
    setTransactions(txs ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
  }

  const categoryFiltered = filterCategory === 'all'
    ? transactions
    : transactions.filter(t => t.category_id === filterCategory)

  const filtered = search.trim()
    ? new Fuse(categoryFiltered, {
        keys: ['description', 'amount'],
        threshold: 0.35,
        getFn: (t, path) => {
          if (path[0] === 'description') return t.description ?? getCategoryName(t.category_id)
          return String(t.amount)
        },
      }).search(search.trim()).map(r => r.item)
    : categoryFiltered

  function getCategoryName(categoryId: string | null) {
    if (!categoryId) return 'Uncategorized'
    const cat = categories.find(c => c.id === categoryId)
    if (!cat) return 'Unknown'
    if (cat.parent_id) {
      const parent = categories.find(c => c.id === cat.parent_id)
      return parent ? `${parent.name} → ${cat.name}` : cat.name
    }
    return cat.name
  }

  function getCategoryColor(categoryId: string | null) {
    if (!categoryId) return '#64748b'
    return categories.find(c => c.id === categoryId)?.color ?? '#64748b'
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All your recorded entries</p>
        </div>
        <Button onClick={() => { setEditingTx(null); setDialogOpen(true) }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Transaction
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-64 rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
        <Select value={filterCategory} onValueChange={v => setFilterCategory(v ?? 'all')}>
          <SelectTrigger className="w-48 bg-card border-border">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} transactions</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No transactions yet.</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filtered.map((tx, i) => (
            <div key={tx.id} className={`flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors ${i < filtered.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(tx.category_id) }} />
                <div>
                  <p className="text-sm font-medium">{tx.description || getCategoryName(tx.category_id)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{format(new Date(tx.date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                    <Badge variant="outline" className="text-xs border-white/10 text-muted-foreground">
                      {getCategoryName(tx.category_id)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-semibold text-sm ${tx.type === 'saving' ? 'text-blue-400' : 'text-foreground'}`}>
                  {formatCurrency(tx.amount)}
                </span>
                <button
                  onClick={() => { setEditingTx(tx); setDialogOpen(true) }}
                  className="text-muted-foreground hover:text-blue-400 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(tx.id)}
                  disabled={deleting === tx.id}
                  className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                >
                  {deleting === tx.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        onSuccess={fetchData}
        editing={editingTx}
      />
    </div>
  )
}
