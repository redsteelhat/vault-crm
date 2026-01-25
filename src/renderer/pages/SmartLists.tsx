import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
    if (!date) return 'Never'
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  const smartLists = [
    {
      id: 'overdue',
      title: 'Overdue',
      description: 'Follow-ups past their due date',
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      count: overdue.length,
      data: overdue,
      type: 'followup'
    },
    {
      id: 'today',
      title: 'Due Today',
      description: 'Follow-ups due today',
      icon: CalendarClock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      count: dueToday.length,
      data: dueToday,
      type: 'followup'
    },
    {
      id: 'upcoming',
      title: 'Upcoming (7 days)',
      description: 'Follow-ups due this week',
      icon: Clock,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      count: upcoming.length,
      data: upcoming,
      type: 'followup'
    },
    {
      id: 'stale30',
      title: 'Stale (30 days)',
      description: 'No contact in 30 days',
      icon: Users,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      count: stale30.length,
      data: stale30,
      type: 'contact'
    },
    {
      id: 'stale60',
      title: 'Stale (60 days)',
      description: 'No contact in 30-60 days',
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-600/10',
      count: stale60.length,
      data: stale60,
      type: 'contact'
    },
    {
      id: 'stale90',
      title: 'Stale (90+ days)',
      description: 'No contact in 60-90+ days',
      icon: Users,
      color: 'text-red-600',
      bg: 'bg-red-600/10',
      count: stale90.length,
      data: stale90,
      type: 'contact'
    },
    {
      id: 'hot',
      title: 'Hot List',
      description: 'Investors & Hot Leads',
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
        <Header title="Smart Lists" description="Intelligent contact segmentation" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title="Smart Lists" description="Intelligent contact segmentation" />

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
                      <p className="text-muted-foreground">No items in this list</p>
                      <p className="text-sm text-muted-foreground/70">
                        {activeList?.type === 'followup'
                          ? 'All follow-ups are on track!'
                          : 'Great job staying in touch!'}
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
