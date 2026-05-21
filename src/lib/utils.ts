import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0)

export const formatNumber = (num: number = 0) =>
  new Intl.NumberFormat('en-IN').format(num || 0)

export const formatDate = (value?: string | number | Date | null) => {
  if (!value) return 'N/A'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const formatRelativeTime = (value?: string | number | Date | null) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'

  const now = new Date()
  
  // Reset hours to compare dates only
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const diffTime = dNow.getTime() - dDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  const timeStr = date.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })

  if (diffDays === 0) {
    return `Today, ${timeStr}`
  } else if (diffDays === 1) {
    return `Yesterday, ${timeStr}`
  } else if (diffDays < 7) {
    return `${date.toLocaleDateString('en-IN', { weekday: 'short' })}, ${timeStr}`
  }

  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${timeStr}`
}

export function getInstrumentType(symbol: string): 'EQ' | 'FUT' | 'CE' | 'PE' {
  if (!symbol) return 'EQ';
  const s = symbol.toUpperCase();
  if (s.endsWith('CE')) return 'CE';
  if (s.endsWith('PE')) return 'PE';
  if (s.includes('FUT')) return 'FUT';
  return 'EQ';
}

export function isTradeFilled(status: string): boolean {
  const s = String(status || '').toUpperCase();
  return ['FILLED', 'COMPLETE', 'TRADED', 'EXECUTED', 'COMPLETED', 'SUCCESS'].includes(s);
}
