'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Category, Transaction } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onSuccess: () => void
  defaultCategoryId?: string
  editing?: Transaction | null
}

export function AddTransactionDialog({ open, onOpenChange, categories, onSuccess, defaultCategoryId, editing }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editing) {
      setAmount(String(editing.amount))
      setDescription(editing.description ?? '')
      setDate(editing.date)
      setCategoryId(editing.category_id ?? '')
    } else {
      setAmount('')
      setDescription('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setCategoryId(defaultCategoryId ?? '')
    }
    setError('')
  }, [editing, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCategory = categories.find(c => c.id === categoryId)

  // Group categories for display
  const parentCategories = categories.filter(c => !c.parent_id)
  const childCategories = categories.filter(c => c.parent_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId) { setError('Please select a category'); return }
    if (!amount || isNaN(parseFloat(amount))) { setError('Enter a valid amount'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const payload = {
      amount: parseFloat(amount),
      description: description || null,
      date,
      category_id: categoryId,
      type: selectedCategory?.type ?? 'expense',
    }

    let err
    if (editing) {
      const { error: e } = await supabase.from('transactions').update(payload).eq('id', editing.id)
      err = e
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: e } = await supabase.from('transactions').insert({ ...payload, user_id: user?.id })
      err = e
    }

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      onOpenChange(false)
      onSuccess()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              <option value="" disabled className="bg-[#1e293b]">Select category</option>
              {parentCategories.map(parent => {
                const children = childCategories.filter(c => c.parent_id === parent.id)
                if (children.length > 0) {
                  return children.map(child => (
                    <option key={child.id} value={child.id} className="bg-[#1e293b]">
                      {parent.name} → {child.name}
                    </option>
                  ))
                }
                return (
                  <option key={parent.id} value={parent.id} className="bg-[#1e293b]">
                    {parent.name}
                  </option>
                )
              })}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Amount ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              placeholder="e.g. Whole Foods run"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : editing ? 'Update' : 'Add'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
