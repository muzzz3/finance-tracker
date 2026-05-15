'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ArrowLeftRight, BarChart2, LogOut, TrendingUp, Landmark, ShoppingBag, Wallet, Repeat2 } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/income', label: 'Income', icon: Wallet },
  { href: '/subscriptions', label: 'Subscriptions', icon: Repeat2 },
  { href: '/net-worth', label: 'Net Worth', icon: Landmark },
  { href: '/yearly', label: 'Yearly View', icon: BarChart2 },
  { href: '/wishlist', label: 'Wishlist', icon: ShoppingBag },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-52 shrink-0 flex flex-col h-screen sticky top-0" style={{ backgroundColor: '#0a0f1e', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-white">Finance Tracker</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'text-white'
                  : 'text-slate-400 hover:text-white'
              )}
              style={active ? { backgroundColor: 'rgba(96,165,250,0.12)' } : undefined}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-blue-400' : '')} />
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-all duration-150 hover:bg-white/4"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
