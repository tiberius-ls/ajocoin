import NimiqIcon from './NimiqIcon'

interface NimiqLogoProps {
  compact?: boolean
}

/** Nimiq signet + wordmark styling */
export default function NimiqLogo({ compact = false }: NimiqLogoProps) {
  return (
    <div className="flex items-center" style={{ gap: '0.55rem' }}>
      <NimiqIcon name="hexagon" className="nq-gold" style={{ width: '2.25rem', height: '2.25rem' }} />
      {!compact && (
        <div>
          <p className="font-bold uppercase text-white leading-tight" style={{ letterSpacing: '0.08em', fontSize: '1.35rem' }}>
            AjoCoin
          </p>
          <p className="text-on-blue-muted nq-text-s leading-tight" style={{ fontSize: '1.25rem' }}>Group savings on Nimiq</p>
        </div>
      )}
    </div>
  )
}