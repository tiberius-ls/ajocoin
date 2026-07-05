export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function formatNim(amount: number): string {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} NIM`
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function vestingProgress(schedule: { startDate: string; endDate: string; releasedAmount: number; totalAmount: number }): number {
  const now = Date.now()
  const start = new Date(schedule.startDate).getTime()
  const end = new Date(schedule.endDate).getTime()

  if (now >= end) return 100
  if (now <= start) return Math.round((schedule.releasedAmount / schedule.totalAmount) * 100)

  const timeProgress = ((now - start) / (end - start)) * 100
  const amountProgress = (schedule.releasedAmount / schedule.totalAmount) * 100
  return Math.round(Math.max(timeProgress, amountProgress))
}

export function nimToLunas(nim: number): number {
  return Math.round(nim * 1e5)
}