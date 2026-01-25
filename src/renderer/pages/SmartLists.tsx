import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarClock,
  AlertTriangle,
  Clock,
  Flame,
  Users,
  ChevronRight
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Contact {
  id: string
  name: string
  company: string | null
  last_contact_at: string | null
}

interface FollowUp {
  id: string
  contact_id: string
  contact_name: string
  due_at: string
  reason: string | null
  status: string
}

export function SmartLists() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('overdue')
  const [overdue, setOverdue] = useState<FollowUp[]>([])
  const [dueToday, setDueToday] = useState<FollowUp[]>([])
  const [upcoming, setUpcoming] = useState<FollowUp[]>([])
  const [stale30, setStale30] = useState<Contact[]>([])
  const [stale60, setStale60] = useState<Contact[]>([])
  const [stale90, setStale90] = useState<Contact[]>([])
  const [hotList, setHotList] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [
        overdueData,
        dueTodayData,
        upcomingData,
        stale30Data,
        stale60Data,
        stale90Data,
        hotListData
      ] = await Promise.all([
        window.api.followups.getOverdue(),
        window.api.followups.getDueToday(),
        window.api.followups.getUpcoming(7),
        window.api.contacts.getStale(30),
        window.api.contacts.getStale(60),
        window.api.contacts.getStale(90),
        window.api.contacts.getHotList()
      ])

      setOverdue(overdueData)
      setDueToday(dueTodayData)
      setUpcoming(upcomingData)
      setStale30(stale30Data)
      setStale60(stale60Data.filter((c: Contact) => !stale30Data.find((s: Contact) => s.id === c.id)))
      setStale90(stale90Data.filter((c: Contact) => !stale60Data.find((s: Contact) => s.id === c.id)))
      setHotList(hotListData)
    } catch (error) {
      console.error('Failed to load smart lists:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatRelativeDate = (date: string | null): string => {
    if (!date) return t('common.never')
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return t('common.today')
    if (diffDays === 1) return t('common.yesterday')
    if (diffDays < 7) return t('common.daysAgo', { count: diffDays })
    if (diffDays < 30) return t('common.weeksAgo', { count: Math.floor(diffDays / 7) })
    if (diffDays < 365) return t('common.monthsAgo', { count: Math.floor(diffDays / 30) })
    return t('common.monthsAgo', { count: Math.floor(diffDays / 365) })
  }

  const smartLists = [
    {
      id: 'overdue',
      title: t('smartLists.overdue'),
      description: t('smartLists.overdueDesc'),
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      count: overdue.length,
      data: overdue,
      type: 'followup'
    },
    {
      id: 'today',
      title: t('smartLists.dueToday'),
      description: t('smartLists.dueTodayDesc'),
      icon: CalendarClock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      count: dueToday.length,
      data: dueToday,
      type: 'followup'
    },
    {
      id: 'upcoming',
      title: t('smartLists.upcoming7'),
      description: t('smartLists.upcoming7Desc'),
      icon: Clock,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      count: upcoming.length,
      data: upcoming,
      type: 'followup'
    },
    {
      id: 'stale30',
      title: t('smartLists.stale30'),
      description: t('smartLists.stale30Desc'),
      icon: Users,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      count: stale30.length,
      data: stale30,
      type: 'contact'
    },
    {
      id: 'stale60',
      title: t('smartLists.stale60'),
      description: t('smartLists.stale60Desc'),
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-600/10',
      count: stale60.length,
      data: stale60,
      type: 'contact'
    },
    {
      id: 'stale90',
      title: t('smartLists.stale90'),
      description: t('smartLists.stale90Desc'),
      icon: Users,
      color: 'text-red-600',
      bg: 'bg-red-600/10',
      count: stale90.length,
      data: stale90,
      type: 'contact'
    },
    {
      id: 'hot',
      title: t('smartLists.hotList'),
      description: t('smartLists.hotListDesc'),
      icon: Flame,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      count: hotList.length,
      data: hotList,
      type: 'contact'
    }
  ]

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title={t('smartLists.title')} description={t('smartLists.description')} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title={t('smartLists.title')} description={t('smartLists.description')} />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {smartLists.map((list) => (
              <Card
                key={list.id}
                className={`border-none shadow-sm cursor-pointer transition-all hover:scale-105 ${
                  activeTab === list.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setActiveTab(list.id)}
              >
                <CardContent className="p-4">
                  <div className={`p-2 rounded-lg ${list.bg} w-fit mb-2`}>
                    <list.icon className={`h-5 w-5 ${list.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{list.count}</p>
                  <p className="text-xs text-muted-foreground truncate">{list.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detail View */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const activeList = smartLists.find((l) => l.id === activeTab)
                  if (!activeList) return null
                  const Icon = activeList.icon
                  return (
                    <>
                      <div className={`p-2 rounded-lg ${activeList.bg}`}>
                        <Icon className={`h-5 w-5 ${activeList.color}`} />
                      </div>
                      {activeList.title}
                      <Badge variant="secondary">{activeList.count}</Badge>
                    </>
                  )
                })()}
              </CardTitle>
              <CardDescription>
                {smartLists.find((l) => l.id === activeTab)?.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const activeList = smartLists.find((l) => l.id === activeTab)
                if (!activeList || activeList.data.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className={`p-4 rounded-full ${activeList?.bg || 'bg-muted'} mb-4`}>
                        {activeList && (
                          <activeList.icon
                            className={`h-8 w-8 ${activeList.color || 'text-muted-foreground'}`}
                          />
                        )}
                      </div>
                      <p className="text-muted-foreground">{t('smartLists.noItems')}</p>
                      <p className="text-sm text-muted-foreground/70">
                        {activeList?.type === 'followup'
                          ? t('smartLists.allOnTrack')
                          : t('smartLists.stayingInTouch')}
                      </p>
                    </div>
                  )
                }

                if (activeList.type === 'followup') {
                  return (
                    <div className="space-y-2">
                      {(activeList.data as FollowUp[]).map((item) => (
                        <Link
                          key={item.id}
                          to={`/contacts/${item.contact_id}`}
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{item.contact_name}</p>
                            {item.reason && (
                              <p className="text-sm text-muted-foreground truncate">
                                {item.reason}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                              {new Date(item.due_at).toLocaleDateString()}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                }

                return (
                  <div className="space-y-2">
                    {(activeList.data as Contact[]).map((contact) => (
                      <Link
                        key={contact.id}
                        to={`/contacts/${contact.id}`}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {contact.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium">{contact.name}</p>
                            {contact.company && (
                              <p className="text-sm text-muted-foreground">{contact.company}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {formatRelativeDate(contact.last_contact_at)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
