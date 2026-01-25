import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getDueDateLabel } from '@/lib/utils'

interface FollowUp {
  id: string
  contact_id: string
  contact_name: string
  contact_company?: string | null
  due_at: string
  reason: string | null
  status: string
}

interface CalendarViewProps {
  followups: FollowUp[]
  onMarkDone: (id: string) => void
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function CalendarView({ followups, onMarkDone }: CalendarViewProps) {
  const { t } = useTranslation()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days: (Date | null)[] = []

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }, [year, month])

  // Group followups by date
  const followupsByDate = useMemo(() => {
    const map = new Map<string, FollowUp[]>()
    
    followups.forEach((followup) => {
      const date = new Date(followup.due_at).toISOString().split('T')[0]
      const existing = map.get(date) || []
      existing.push(followup)
      map.set(date, existing)
    })

    return map
  }, [followups])

  const getFollowupsForDate = (date: Date): FollowUp[] => {
    const dateStr = date.toISOString().split('T')[0]
    return followupsByDate.get(dateStr) || []
  }

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  const selectedDateFollowups = selectedDate ? getFollowupsForDate(selectedDate) : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="border-none shadow-sm lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">
            {MONTHS[month]} {year}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              {t('common.today')}
            </Button>
            <Button variant="outline" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-20" />
              }

              const dayFollowups = getFollowupsForDate(day)
              const hasFollowups = dayFollowups.length > 0
              const hasOverdue = dayFollowups.some((f) => {
                const dueDate = new Date(f.due_at)
                return dueDate < new Date() && f.status === 'open'
              })

              return (
                <button
                  key={day.toISOString()}
                  className={`h-20 p-1 rounded-lg border transition-colors text-left ${
                    isSelected(day)
                      ? 'border-primary bg-primary/5'
                      : isToday(day)
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-transparent hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`text-sm font-medium ${
                        isToday(day) ? 'text-primary' : ''
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {hasFollowups && (
                      <div className="flex gap-0.5">
                        {dayFollowups.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              hasOverdue ? 'bg-red-500' : 'bg-primary'
                            }`}
                          />
                        ))}
                        {dayFollowups.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{dayFollowups.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {hasFollowups && (
                    <div className="mt-1 space-y-0.5">
                      {dayFollowups.slice(0, 2).map((followup) => (
                        <div
                          key={followup.id}
                          className="text-xs truncate text-muted-foreground"
                        >
                          {followup.contact_name}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            {selectedDate
              ? selectedDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })
              : t('common.select')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('followups.noFollowups')}
            </p>
          ) : selectedDateFollowups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('followups.noFollowupsDesc')}
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {selectedDateFollowups.map((followup) => {
                  const { label, variant } = getDueDateLabel(followup.due_at)
                  return (
                    <div
                      key={followup.id}
                      className="p-3 rounded-lg bg-muted/50 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <Link
                          to={`/contacts/${followup.contact_id}`}
                          className="font-medium text-sm hover:text-primary transition-colors"
                        >
                          {followup.contact_name}
                        </Link>
                        <Badge variant={variant} className="text-xs">
                          {label}
                        </Badge>
                      </div>
                      {followup.contact_company && (
                        <p className="text-xs text-muted-foreground">
                          {followup.contact_company}
                        </p>
                      )}
                      {followup.reason && (
                        <p className="text-xs text-muted-foreground">
                          {followup.reason}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => onMarkDone(followup.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {t('followups.markDone')}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
