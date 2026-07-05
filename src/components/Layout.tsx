import { NavLink, Outlet } from 'react-router-dom'
import { Home, PlusCircle, LayoutDashboard, Vote, Lock, Wallet, LogOut } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import { shortenAddress } from '../lib/utils'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/create', icon: PlusCircle, label: 'Create' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Groups' },
  { to: '/voting', icon: Vote, label: 'Votes' },
  { to: '/vesting', icon: Lock, label: 'Vesting' },
]

export default function Layout() {
  const { wallet, connecting, connect, disconnect, isConnected } = useAjo()

  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-ajo-navy/90 backdrop-blur-lg border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-nimiq-green flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">AjoCoin</h1>
              <p className="text-[10px] text-white/40 leading-tight">Group savings on Nimiq</p>
            </div>
          </div>

          {isConnected ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl bg-ajo-card border border-nimiq-green/20">
                <Wallet className="w-3.5 h-3.5 text-nimiq-green" />
                <span>{shortenAddress(wallet.address!)}</span>
              </div>
              <button
                onClick={disconnect}
                className="p-2 rounded-xl bg-ajo-card border border-white/10 hover:border-red-400/30 transition-colors"
                title="Disconnect"
              >
                <LogOut className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl bg-ajo-card border border-white/10 hover:border-nimiq-green/30 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-nimiq-green" />
              {connecting ? 'Connecting…' : 'Connect'}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-24 animate-fade-in">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-ajo-navy/95 backdrop-blur-lg border-t border-white/5">
        <div className="max-w-lg mx-auto flex justify-around px-2 py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  isActive ? 'text-nimiq-green' : 'text-white/40 hover:text-white/70'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}