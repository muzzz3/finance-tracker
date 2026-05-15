'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/finance'
import { Plus, X, ShoppingBag, Ban, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDistanceToNow } from 'date-fns'

interface WishlistItem {
  id: string
  name: string
  price: number | null
  notes: string | null
  status: 'active' | 'cancelled' | 'purchased'
  created_at: string
  updated_at: string
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [detailNotes, setDetailNotes] = useState('')
  const [detailName, setDetailName] = useState('')
  const [detailPrice, setDetailPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: userData }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('wishlist_items').select('*').order('created_at', { ascending: false }),
    ])
    setUserId(userData.user?.id ?? null)
    setItems(data ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  // Populate detail fields only when switching to a different item
  useEffect(() => {
    if (selectedId) {
      const item = items.find(i => i.id === selectedId)
      if (item) {
        setDetailNotes(item.notes ?? '')
        setDetailName(item.name)
        setDetailPrice(item.price != null ? String(item.price) : '')
      }
    }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedItem = items.find(i => i.id === selectedId) ?? null

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const { data } = await supabase.from('wishlist_items').insert({
      user_id: userId,
      name: newName.trim(),
      price: newPrice ? parseFloat(newPrice) : null,
    }).select().single()
    if (data) {
      setItems(prev => [data, ...prev])
      setSelectedId(data.id)
      setNewName('')
      setNewPrice('')
      setAdding(false)
    }
  }

  async function saveDetail() {
    if (!selectedId || !detailName.trim()) return
    setSaving(true)
    const parsed = detailPrice ? parseFloat(detailPrice) : null
    await supabase.from('wishlist_items').update({
      name: detailName.trim(),
      price: parsed != null && !isNaN(parsed) ? parsed : null,
      notes: detailNotes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', selectedId)
    setItems(prev => prev.map(i =>
      i.id === selectedId ? { ...i, name: detailName.trim(), price: parsed != null && !isNaN(parsed) ? parsed : null, notes: detailNotes || null } : i
    ))
    setSaving(false)
  }

  async function handleSetStatus(status: 'active' | 'cancelled' | 'purchased') {
    if (!selectedId) return
    await supabase.from('wishlist_items').update({
      notes: detailNotes || null,
      status,
      updated_at: new Date().toISOString(),
    }).eq('id', selectedId)
    setItems(prev => prev.map(i =>
      i.id === selectedId ? { ...i, status, notes: detailNotes || null } : i
    ))
    if (status !== 'active') setSelectedId(null)
  }

  const activeItems = items.filter(i => i.status === 'active')
  const inactiveItems = items.filter(i => i.status !== 'active')
  const sortedItems = [...activeItems, ...inactiveItems]

  return (
    <div className="flex h-full overflow-hidden">
      {/* List panel */}
      <div
        className="flex flex-col shrink-0 overflow-hidden transition-all duration-200"
        style={{
          width: selectedItem ? '55%' : '100%',
          borderRight: selectedItem ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h1 className="text-xl font-bold text-white">Wishlist</h1>
          <Button onClick={() => { setAdding(true) }} size="sm" className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white border-0">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </Button>
        </div>

        {/* Quick-add form */}
        {adding && (
          <form
            onSubmit={handleAddItem}
            className="flex gap-2 items-end px-6 py-4 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}
          >
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-slate-400">Item name</Label>
              <Input autoFocus placeholder="e.g. AirPods Pro" value={newName} onChange={e => setNewName(e.target.value)} className="bg-white/5 border-white/10 text-white h-9" />
            </div>
            <div className="w-28 space-y-1">
              <Label className="text-xs text-slate-400">Price (optional)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="bg-white/5 border-white/10 text-white h-9" />
            </div>
            <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white border-0 h-9">Add</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)} className="text-slate-400 h-9 px-2">
              <X className="w-4 h-4" />
            </Button>
          </form>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading...</div>
          ) : sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <ShoppingBag className="w-8 h-8 text-slate-700 mb-3" />
              <p className="text-slate-400 font-medium text-sm">Nothing on your wishlist</p>
              <p className="text-slate-600 text-xs mt-1">Add items you&apos;re tempted to buy before pulling the trigger</p>
            </div>
          ) : (
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {sortedItems.map((item, i) => {
                const isSelected = item.id === selectedId
                const isCancelled = item.status === 'cancelled'
                const isPurchased = item.status === 'purchased'
                const isInactive = isCancelled || isPurchased
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(isSelected ? null : item.id)}
                    className="w-full text-left flex items-center justify-between px-6 py-4 transition-colors"
                    style={{
                      backgroundColor: isSelected ? 'rgba(96,165,250,0.08)' : undefined,
                      borderBottom: i < sortedItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isCancelled && <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      {isPurchased && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      {!isInactive && (
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isSelected ? '#60a5fa' : '#475569' }} />
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isCancelled ? 'line-through text-slate-600' : isPurchased ? 'text-slate-500' : 'text-slate-200'}`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Added {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {item.price != null && (
                      <p className={`text-sm font-semibold shrink-0 ml-4 ${isInactive ? 'text-slate-600' : 'text-white'}`}>
                        {formatCurrency(item.price)}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedItem && (
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Panel header */}
          <div className="flex items-start justify-between px-6 py-4 shrink-0 gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex-1 min-w-0 space-y-1">
              <input
                value={detailName}
                onChange={e => setDetailName(e.target.value)}
                onBlur={saveDetail}
                disabled={selectedItem.status !== 'active'}
                className="w-full bg-transparent text-base font-bold text-white placeholder-slate-600 focus:outline-none disabled:opacity-60"
                placeholder="Item name"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={detailPrice}
                  onChange={e => setDetailPrice(e.target.value)}
                  onBlur={saveDetail}
                  disabled={selectedItem.status !== 'active'}
                  className="w-24 bg-transparent text-sm text-slate-400 placeholder-slate-700 focus:outline-none disabled:opacity-60"
                  placeholder="Price"
                />
                {selectedItem.status === 'cancelled' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Not worth it</span>
                )}
                {selectedItem.status === 'purchased' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Purchased</span>
                )}
              </div>
            </div>
            <button onClick={() => setSelectedId(null)} className="text-slate-600 hover:text-white transition-colors mt-0.5 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Fields */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
            <textarea
              placeholder="Add notes..."
              value={detailNotes}
              onChange={e => setDetailNotes(e.target.value)}
              onBlur={saveDetail}
              disabled={selectedItem.status !== 'active'}
              className="flex-1 w-full bg-transparent text-slate-200 text-sm placeholder-slate-700 resize-none focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-slate-700 shrink-0">
              Added {formatDistanceToNow(new Date(selectedItem.created_at), { addSuffix: true })}
              {saving && <span className="ml-2 text-slate-600">Saving...</span>}
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 shrink-0 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {selectedItem.status === 'active' ? (
              <>
                <Button
                  onClick={() => handleSetStatus('purchased')}
                  className="w-full gap-2 border-0 text-white"
                  style={{ backgroundColor: '#10b981' }}
                >
                  <Check className="w-4 h-4" /> I bought it
                </Button>
                <Button
                  onClick={() => handleSetStatus('cancelled')}
                  variant="outline"
                  className="w-full gap-2 border-white/10 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Ban className="w-4 h-4" /> Not worth it
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleSetStatus('active')}
                variant="outline"
                className="w-full border-white/10 text-slate-300 hover:text-white"
              >
                Move back to wishlist
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
