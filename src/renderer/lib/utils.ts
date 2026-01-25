import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, differenceInDays, Locale } from 'date-fns'
import { enUS, tr, de, fr } from 'date-fns/locale'
import i18n from '@/i18n'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get date-fns locale based on current i18n language
function getDateLocale(): Locale {
  const lang = i18n.language?.split('-')[0] || 'en'
  const locales: Record<string, Locale> = {
    en: enUS,
    tr: tr,
    de: de,
    fr: fr
  }
  return locales[lang] || enUS
}

export function formatDate(date: string | Date | null): string {
  if (!date) return i18n.t('common.never', 'Never')
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'PP', { locale: getDateLocale() })
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return i18n.t('common.never', 'Never')
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'PPp', { locale: getDateLocale() })
}

export function formatRelativeDate(date: string | Date | null): string {
  if (!date) return i18n.t('common.never', 'Never')
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffDays = differenceInDays(now, d)

  if (diffDays === 0) return i18n.t('common.today', 'Today')
  if (diffDays === 1) return i18n.t('common.yesterday', 'Yesterday')
  
  return formatDistanceToNow(d, { 
    addSuffix: true, 
    locale: getDateLocale() 
  })
}

export function getDaysUntil(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  return differenceInDays(target, now)
}

export function getDueDateLabel(date: string | Date): { label: string; variant: 'destructive' | 'warning' | 'default' } {
  const days = getDaysUntil(date)
  const t = i18n.t.bind(i18n)
  
  if (days < 0) {
    return { 
      label: t('followups.daysOverdue', '{{count}} days overdue', { count: Math.abs(days) }), 
      variant: 'destructive' 
    }
  }
  if (days === 0) {
    return { label: t('followups.dueToday', 'Due today'), variant: 'warning' }
  }
  if (days === 1) {
    return { label: t('followups.dueTomorrow', 'Due tomorrow'), variant: 'warning' }
  }
  if (days <= 7) {
    return { 
      label: t('followups.dueInDays', 'Due in {{count}} days', { count: days }), 
      variant: 'default' 
    }
  }
  return { label: formatDate(date), variant: 'default' }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function parseEmails(emailsJson: string): string[] {
  try {
    const emails = JSON.parse(emailsJson)
    return Array.isArray(emails) ? emails : []
  } catch {
    return []
  }
}

export function parsePhones(phonesJson: string): string[] {
  try {
    const phones = JSON.parse(phonesJson)
    return Array.isArray(phones) ? phones : []
  } catch {
    return []
  }
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
