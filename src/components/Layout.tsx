import { NavLink, Outlet } from 'react-router-dom'
import { Home, Vote } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import { shortenAddress } from '../lib/utils'
import TurnAlerts from './TurnAlerts'
import NimiqLogo from './nimiq/NimiqLogo'
import NimiqIcon from './nimiq/NimiqIcon'

const navItems = [
  { to: '/', icon: 'lucide', lucide: Home, label: 'Home' },
  { to: '/create', icon: 'plus-circle', label: 'Create' },
  { to: '/dashboard', icon: 'contacts', label: 'Groups' },
  { to: '/voting', icon: 'lucide', lucide: Vote, label: 'Votes' },
  { to: '/vesting', icon: 'keys', label: 'Vesting' },
] as const

export default function Layout() {
  const { wallet, connecting, connect, disconnect, isConnected } = useAjo()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <NimiqLogo />

          {isConnected ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="wallet-chip">
                <NimiqIcon name="hexagon" className="nq-green" style={{ width: '1.25rem', height: '1.25rem' }} />
                <span className="nq-text-s mono-address">
                  {shortenAddress(wallet.address!)}
                </span>
              </div>
              <button
                onClick={disconnect}
                className="nq-button-s light-blue"
                title="Disconnect"
                style={{ padding: '0.75rem', minWidth: 0 }}
              >
                <NimiqIcon name="login" style={{ width: '1.25rem', height: '1.25rem', transform: 'scaleX(-1)' }} />
              </button>
            </div>
          ) : (
            <button onClick={connect} disabled={connecting} className="nq-button-s green shrink-0">
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
        <div className="flex justify-around w-full px-2 py-2">
          {navItems.map(({ to, icon, label, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {'lucide' in rest && rest.lucide ? (
                <rest.lucide className="w-5 h-5" />
              ) : (
                <NimiqIcon name={icon} style={{ width: '2rem', height: '2rem' }} />
              )}
              <span className="nq-text-s">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}