export type CategoryType = 'expense' | 'saving'

export interface Category {
  id: string
  user_id: string
  name: string
  type: CategoryType
  parent_id: string | null
  color: string | null
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  description: string | null
  date: string
  category_id: string | null
  type: 'expense' | 'saving'
  created_at: string
  categories?: Category
}

export interface IncomeConfig {
  id: string
  user_id: string
  source_name: string
  amount: number
  pay_days: number[]
  created_at: string
}
