import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function usd(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function buildContext(txs: any[], income: any[], subs: any[], accounts: any[], cats: any[]) {
  const catMap = new Map(cats.map((c: any) => [c.id, c.name]))

  // Transactions grouped by month → category
  const byMonth = new Map<string, Map<string, number>>()
  for (const tx of txs) {
    const month = tx.date.slice(0, 7)
    if (!byMonth.has(month)) byMonth.set(month, new Map())
    const cat = catMap.get(tx.category_id) ?? 'Uncategorized'
    byMonth.get(month)!.set(cat, (byMonth.get(month)!.get(cat) ?? 0) + tx.amount)
  }

  let ctx = '## User Financial Data\n\n'

  // Income
  ctx += '### Monthly Income (most recent first)\n'
  for (const inc of income) {
    const label = new Date(inc.month + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    ctx += `**${label}**: Earnings ${usd(inc.earnings)}, 401k ${usd(inc.k401)}, Roth IRA ${usd(inc.roth)}, Stock Program ${usd(inc.stocks)}\n`
  }

  // Spending
  ctx += '\n### Spending by Category (most recent first)\n'
  for (const month of Array.from(byMonth.keys()).sort().reverse()) {
    const label = new Date(month + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const cats = byMonth.get(month)!
    const total = Array.from(cats.values()).reduce((s, v) => s + v, 0)
    ctx += `\n**${label}** (total: ${usd(total)}):\n`
    for (const [cat, amt] of Array.from(cats.entries()).sort((a, b) => b[1] - a[1])) {
      ctx += `  - ${cat}: ${usd(amt)}\n`
    }
  }

  // Subscriptions
  const subMonthly = subs.reduce((s: number, sub: any) => s + (sub.billing_cycle === 'yearly' ? sub.amount / 12 : sub.amount), 0)
  ctx += `\n### Active Recurring Payments (${usd(subMonthly)}/mo total)\n`
  for (const sub of subs) {
    const monthly = sub.billing_cycle === 'yearly' ? sub.amount / 12 : sub.amount
    ctx += `  - ${sub.name}: ${usd(monthly)}/mo${sub.group_name ? ` (${sub.group_name})` : ''}\n`
  }

  // Net worth
  const isLiability = (type: string) => ['credit', 'loan'].includes(type)
  const totalAssets = accounts.filter((a: any) => !isLiability(a.type)).reduce((s: number, a: any) => s + a.balance, 0)
  const totalLiabilities = accounts.filter((a: any) => isLiability(a.type)).reduce((s: number, a: any) => s + a.balance, 0)
  ctx += `\n### Net Worth\n`
  ctx += `Net Worth: ${usd(totalAssets - totalLiabilities)} (Assets: ${usd(totalAssets)}, Liabilities: ${usd(totalLiabilities)})\n`
  for (const acc of accounts) {
    ctx += `  - ${acc.name}: ${usd(acc.balance)} (${acc.asset_class})\n`
  }

  return ctx
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages } = await req.json() as { messages: Message[] }

  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const since = threeMonthsAgo.toISOString().split('T')[0]

  const [{ data: txs }, { data: income }, { data: subs }, { data: accounts }, { data: cats }] = await Promise.all([
    supabase.from('transactions').select('*').gte('date', since).order('date', { ascending: false }),
    supabase.from('monthly_income').select('*').order('month', { ascending: false }).limit(3),
    supabase.from('subscriptions').select('*').eq('active', true),
    supabase.from('accounts').select('*'),
    supabase.from('categories').select('*'),
  ])

  const context = buildContext(txs ?? [], income ?? [], subs ?? [], accounts ?? [], cats ?? [])
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const system = `You are a personal finance assistant with access to the user's real financial data. Answer questions concisely and with specific numbers from their data. You can also give general financial advice. Be conversational. Today is ${today}.

${context}`

  const ollamaUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  const ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL ?? 'llama3.1',
      messages: [{ role: 'system', content: system }, ...messages],
      stream: true,
    }),
  })

  if (!ollamaRes.ok) return new Response('Could not reach Ollama — make sure it is running', { status: 502 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = ollamaRes.body!.getReader()
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
            try {
              const data = JSON.parse(line)
              if (data.message?.content) controller.enqueue(encoder.encode(data.message.content))
              if (data.done) { controller.close(); return }
            } catch {}
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
