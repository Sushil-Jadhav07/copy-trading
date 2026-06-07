import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import Decimal from 'decimal.js'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount?: number | null): string => {
  if (amount == null || !Number.isFinite(Number(amount))) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount))
}

export const formatPnl = (amount?: number | null): string => {
  if (amount == null || !Number.isFinite(Number(amount))) return '—'
  const numeric = Number(amount)
  const abs = Math.abs(numeric)
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)

  if (Math.abs(numeric) < 0.005) return formatted
  return numeric > 0 ? `+${formatted}` : `−${formatted}`
}

export const formatCompactINR = (amount: number = 0): string => {
  const numeric = Number.isFinite(Number(amount)) ? Number(amount) : 0
  const abs = Math.abs(numeric)
  const sign = numeric < 0 ? '−' : ''

  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`
  return `${sign}₹${abs.toFixed(0)}`
}

export const formatPercent = (value?: number | null, decimals = 1): string => {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return `${Number(value).toFixed(decimals)}%`
}

export const formatDuration = (hours: number): string => {
  if (!Number.isFinite(hours) || hours <= 0) return 'Expired'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

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

export const getTimestampMs = (value?: string | number | Date | null) => {
  if (!value) return null
  const date = new Date(value)
  const ms = date.getTime()
  return Number.isFinite(ms) ? ms : null
}

export const sortByMostRecent = <T extends Record<string, any>>(
  list: T[] = [],
  candidateKeys: string[] = ['timestamp', 'createdAt', 'updatedAt', 'time', 'date']
) => {
  return [...list].sort((a, b) => {
    const aMs =
      candidateKeys
        .map((key) => getTimestampMs(a?.[key]))
        .find((v) => v != null) ?? 0
    const bMs =
      candidateKeys
        .map((key) => getTimestampMs(b?.[key]))
        .find((v) => v != null) ?? 0
    return bMs - aMs
  })
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

// ─── Safe Financial Arithmetic ──────────────────────────────────────────────

const toD = (n: number | string | null | undefined): Decimal => {
  if (n === null || n === undefined || n === '') return new Decimal(0);
  const num = typeof n === 'string' ? n.trim() : String(n);
  try {
    const d = new Decimal(num);
    return d.isNaN() || !d.isFinite() ? new Decimal(0) : d;
  } catch {
    return new Decimal(0);
  }
};

export const safeAdd = (...nums: (number | string | null | undefined)[]): number =>
  nums.reduce<Decimal>((acc, n) => acc.plus(toD(n)), new Decimal(0)).toNumber();

export const safeSub = (a: number | string | null | undefined, b: number | string | null | undefined): number =>
  toD(a).minus(toD(b)).toNumber();

export const safeMul = (a: number | string | null | undefined, b: number | string | null | undefined): number =>
  toD(a).times(toD(b)).toNumber();

export const safeDiv = (a: number | string | null | undefined, b: number | string | null | undefined): number => {
  const divisor = toD(b);
  if (divisor.isZero()) return 0;
  return toD(a).dividedBy(divisor).toNumber();
};

export const roundTo = (n: number | string | null | undefined, dp = 2): number =>
  toD(n).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP).toNumber();

export const safeEq = (
  a: number | string | null | undefined,
  b: number | string | null | undefined,
  tolerance = 0.001
): boolean => Math.abs(toD(a).minus(toD(b)).toNumber()) < tolerance;

export const safeSum = (arr: (number | string | null | undefined)[]): number =>
  arr.reduce<Decimal>((acc, n) => acc.plus(toD(n)), new Decimal(0)).toNumber();

export const safePct = (part: number | string | null | undefined, total: number | string | null | undefined): number =>
  safeDiv(safeMul(part, 100), total);

export const MONEY_TOLERANCE = 0.001;
export const QTY_TOLERANCE   = 0.0001;
