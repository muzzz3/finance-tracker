# Finance Tracker

A personal finance tracking web app built with Next.js and Supabase. Tracks monthly income, expenses, savings, subscriptions, net worth, and a wishlist for impulse control.

## Features

- **Dashboard** — Monthly overview with income, expenses, paycheck savings, 401k & Roth IRA, and stock program stat cards. Expense breakdown and income allocation donut charts.
- **Transactions** — Log and filter expenses by category. Categories include Food (Outside Food / Groceries), Home Goods, Car, Entertainment, Apartment Expenses, Wasted :(
- **Income** — Enter monthly earnings, 401k, Roth IRA, and stock program contributions. Supports quick-add for second paychecks.
- **Subscriptions** — Track recurring payments (monthly or yearly). Yearly subscriptions are normalized to monthly cost and automatically included in dashboard expenses.
- **Net Worth** — Manually track accounts (checking, brokerage, retirement, etc.) with asset class breakdown (cash, stocks, crypto, retirement, bonds, real estate). Asset allocation donut chart.
- **Yearly View** — Area chart showing income, expenses, and savings month-by-month for the year with a summary table.
- **Wishlist** — Impulse control list. Add items you want to buy, open them in a side panel to write notes, then mark as purchased or "not worth it".

## Tech Stack

- **Framework** — Next.js 16 (App Router, Turbopack)
- **Database & Auth** — Supabase (Postgres + Row Level Security)
- **Styling** — Tailwind CSS v4, Plus Jakarta Sans font
- **UI Components** — shadcn/ui (base-ui primitives)
- **Charts** — Recharts
- **Language** — TypeScript

## Architecture

```
app/
  (app)/              # Authenticated route group
    dashboard/        # Monthly dashboard
    transactions/     # Transaction log
    income/           # Monthly income entry
    subscriptions/    # Recurring payments
    net-worth/        # Account & asset tracking
    yearly/           # Year-over-year chart
    wishlist/         # Impulse control list
  login/              # Auth pages
  signup/
components/
  layout/             # Sidebar navigation
  charts/             # Donut chart wrapper
  transactions/       # Add transaction dialog
  ui/                 # shadcn/ui components + custom date picker
lib/
  supabase/           # Client & server Supabase helpers
  finance.ts          # Calculation utilities
  types.ts            # Shared TypeScript interfaces
supabase/
  schema.sql          # Categories, transactions, income_config tables
  accounts.sql        # Net worth accounts table
  monthly_income.sql  # Monthly income table
  subscriptions.sql   # Subscriptions table
  wishlist.sql        # Wishlist items table
proxy.ts              # Auth middleware (Next.js 16 convention)
```

## Database Tables

| Table | Purpose |
|---|---|
| `categories` | Expense categories (seeded on signup) |
| `transactions` | Individual expense entries |
| `monthly_income` | Per-month earnings, 401k, Roth, stocks |
| `subscriptions` | Recurring payments with billing cycle |
| `accounts` | Net worth accounts with asset class |
| `wishlist_items` | Impulse buy tracking list |

All tables use Supabase Row Level Security — users can only access their own data.

## Setup

1. Clone the repo
2. Create a Supabase project at [supabase.com](https://supabase.com)
3. Copy `.env.local.example` to `.env.local` and fill in your Supabase URL and anon key
4. Run the SQL files in `supabase/` in the Supabase SQL editor (in order: `schema.sql`, `accounts.sql`, `monthly_income.sql`, `subscriptions.sql`, `wishlist.sql`)
5. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

6. Sign up at `/signup` — default expense categories are seeded automatically on first signup.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
