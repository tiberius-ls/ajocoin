import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="nq-surface-pad flex flex-col items-start">
      <div
        className="flex items-center justify-center mb-4 nq-light-blue-bg"
        style={{ width: '5rem', height: '5rem', borderRadius: '1rem' }}
      >
        <Icon className="nq-light-blue" style={{ width: '2.75rem', height: '2.75rem' }} />
      </div>
      <h3 className="nq-h3 mb-1">{title}</h3>
      <p className="nq-text text-on-card-muted mb-6">{description}</p>
      {action}
    </div>
  )
}