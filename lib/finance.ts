import { getDaysInMonth } from 'date-fns'
import type { IncomeConfig, Transaction, Category } from './types'

export function calculateMonthlyIncome(configs: IncomeConfig[], year: number, month: number): number {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  return configs.reduce((total, config) => {
    const validPaydays = config.pay_days.filter(d => d <= daysInMonth)
    return total + config.amount * validPaydays.length
  }, 0)
}

export function groupTransactionsByCategory(
  transactions: Transaction[],
  categories: Category[]
): Map<string, { category: Category; total: number; transactions: Transaction[] }> {
  const map = new Map<string, { category: Category; total: number; transactions: Transaction[] }>()

  for (const tx of transactions) {
    if (!tx.category_id) continue
    const cat = categories.find(c => c.id === tx.category_id)
    if (!cat) continue

    const existing = map.get(tx.category_id)
    if (existing) {
      existing.total += tx.amount
      existing.transactions.push(tx)
    } else {
      map.set(tx.category_id, { category: cat, total: tx.amount, transactions: [tx] })
    }
  }

  return map
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}
