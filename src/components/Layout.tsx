import { NavLink, Outlet } from 'react-router-dom'
import { Home, PlusCircle, LayoutDashboard, Vote, Lock, LogOut } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import { shortenAddress } from '../lib/utils'
import TurnAlerts from './TurnAlerts'
import NimiqLogo from './nimiq/NimiqLogo'
import NimiqIcon from './nimiq/NimiqIcon'

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
    <div className="app-shell">
      <header className="app-header">
        <div className="flex items-center justify-between">
          <NimiqLogo />

          {isConnected ? (
            <div className="flex items-center gap-1.5">
              <div className="wallet-chip">
                <NimiqIcon name="hexagon" className="nq-green" style={{ width: '1.25rem', height: '1.25rem' }} />
                <span>{shortenAddress(wallet.address!)}</span>
              </div>
              <button
                onClick={disconnect}
                className="nq-button-s light-blue"
                title="Disconnect"
                style={{ padding: '0.75rem' }}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={connect} disabled={connecting} className="nq-button-s green">
              {connecting ? 'Connecting…' : 'Connect'}
            </button>
          )}
        </div>
      </header>

      <main className="app-main animate-fade-in">
        <TurnAlerts />
        <Outlet />
      </main>

      <nav className="app-nav">
        <div className="max-w-lg mx-auto flex justify-around px-2 py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon className="w-5 h-5" />
              <span className="nq-text-s" style={{ fontSize: '1.25rem' }}>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}