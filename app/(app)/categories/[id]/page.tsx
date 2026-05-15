'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/finance'
import type { Category, Transaction } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>()
  const [category, setCategory] = useState<Category | null>(null)
  const [children, setChildren] = useState<Category[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: cats }, { data: txs }] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('transactions').select('*').order('date', { ascending: false }),
    ])

    const allCats = cats ?? []
    setCategories(allCats)

    const cat = allCats.find(c => c.id === id) ?? null
    setCategory(cat)

    const childCats = allCats.filter(c => c.parent_id === id)
    setChildren(childCats)

    const relevantIds = childCats.length > 0
      ? [id, ...childCats.map(c => c.id)]
      : [id]

    setTransactions((txs ?? []).filter(t => relevantIds.includes(t.category_id ?? '')))
    setLoading(false)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(txId: string) {
    setDeleting(txId)
    await supabase.from('transactions').delete().eq('id', txId)
    setTransactions(prev => prev.filter(t => t.id !== txId))
    setDeleting(null)
  }

  const months = Array.from(new Set(transactions.map(t => t.date.slice(0, 7)))).sort().reverse()

  const filtered = filterMonth === 'all'
    ? transactions
    : transactions.filter(t => t.date.startsWith(filterMonth))

  const total = filtered.reduce((s, t) => s + t.amount, 0)

  function getCatName(catId: string | null) {
    if (!catId) return ''
    return categories.find(c => c.id === catId)?.name ?? ''
  }

  if (loading) return <div className="p-6 text-muted-foreground text-sm">Loading...</div>
  if (!category) return <div className="p-6 text-muted-foreground text-sm">Category not found.</div>

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{category.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{category.type}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>+ Add Transaction</Button>
      </div>

      {children.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {children.map(child => {
            const childTotal = transactions
              .filter(t => t.category_id === child.id && (filterMonth === 'all' || t.date.startsWith(filterMonth)))
              .reduce((s, t) => s + t.amount, 0)
            return (
              <div key={child.id} className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">{child.name}</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(childTotal)}</p>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Select value={filterMonth} onValueChange={v => setFilterMonth(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            {months.map(m => (
              <SelectItem key={m} value={m}>{format(new Date(m + '-01'), 'MMM yyyy')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm font-semibold">{formatCurrency(total)} total</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No transactions.</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {filtered.map(tx => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{tx.description || getCatName(tx.category_id)}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{format(new Date(tx.date), 'MMM d, yyyy')}</span>
                  {children.length > 0 && tx.category_id !== id && (
                    <Badge variant="outline" className="text-xs">{getCatName(tx.category_id)}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">{formatCurrency(tx.amount)}</span>
                <button
                  onClick={() => handleDelete(tx.id)}
                  disabled={deleting === tx.id}
                  className="text-muted-foreground hover:text-destructive text-xs transition-colors"
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
        defaultCategoryId={id}
      />
    </div>
  )
}
