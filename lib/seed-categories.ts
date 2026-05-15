import type { SupabaseClient } from '@supabase/supabase-js'

export async function seedDefaultCategories(supabase: SupabaseClient, userId: string) {
  // Insert parent Food category first
  const { data: foodCategory } = await supabase
    .from('categories')
    .insert({ user_id: userId, name: 'Food', type: 'expense', color: '#f97316' })
    .select('id')
    .single()

  const categories = [
    // Food sub-categories
    { user_id: userId, name: 'Outside Food', type: 'expense', parent_id: foodCategory?.id, color: '#fb923c' },
    { user_id: userId, name: 'Groceries', type: 'expense', parent_id: foodCategory?.id, color: '#fdba74' },
    // Other expenses
    { user_id: userId, name: 'Home Goods', type: 'expense', color: '#a78bfa' },
    { user_id: userId, name: 'Car', type: 'expense', color: '#60a5fa' },
    { user_id: userId, name: 'Entertainment', type: 'expense', color: '#f472b6' },
    { user_id: userId, name: 'Apartment Expenses', type: 'expense', color: '#34d399' },
    { user_id: userId, name: 'Wasted :(', type: 'expense', color: '#94a3b8' },
    // Savings
    { user_id: userId, name: '401k & Roth IRA', type: 'saving', color: '#22c55e' },
    { user_id: userId, name: 'Stock Program', type: 'saving', color: '#16a34a' },
  ]

  await supabase.from('categories').insert(categories)
}
