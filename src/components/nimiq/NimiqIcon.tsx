import type { CSSProperties } from 'react'

interface NimiqIconProps {
  name: string
  className?: string
  label?: string
  style?: CSSProperties
}

export default function NimiqIcon({ name, className = '', label, style }: NimiqIconProps) {
  return (
    <svg
      className={`nq-icon ${className}`.trim()}
      style={style}
      aria-hidden={!label}
      aria-label={label}
    >
      <use href={`/nimiq-style.icons.svg#nq-${name}`} />
    </svg>
  )
}