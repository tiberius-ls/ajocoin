import { useEffect, useRef } from 'react'
// Bundled build includes SVG data — no separate sprite file needed.
import Identicons from '@nimiq/identicons/dist/identicons.bundle.min.js'

interface IdenticonProps {
  seed: string
  size?: number
  className?: string
}

export default function Identicon({ seed, size = 40, className = '' }: IdenticonProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    void Identicons.render(seed.replace(/\s/g, ''), el)
  }, [seed])

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: size, height: size, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}
      aria-hidden
    />
  )
}