import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users,
  CalendarClock,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  MessageSquare,
  PhoneCall,
  Mail,
  TrendingUp,
  UserPlus
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useContactStore } from '@/stores/contactStore'
import { useFollowUpStore } from '@/stores/followupStore'
import { formatRelativeDate, getDueDateLabel, formatDateTime } from '@/lib/utils'
import { ActivityChart } from '@/components/charts/ActivityChart'
import { SourceDistributionChart } from '@/components/charts/SourceDistributionChart'
import { TagDistributionChart } from '@/components/charts/TagDistributionChart'

interface RecentInteraction {
  id: string
  contact_id: string
  contact_name: string
  contact_company: string | null
  type: 'note' | 'call' | 'meeting' | 'email'
  body: string
  occurred_at: string
}

interface DailyCount {
  date: string
  count: number
}

interface SourceData {
  source: string
  count: number
}

interface TagData {
  id: string
  name: string
  color: string
  contact_count: number
}

const interactionIcons = {
  note: MessageSquare,
  call: PhoneCall,
  meeting: Users,
  email: Mail
}

export function Dashboard() {
  const { t } = useTranslation()
  const { contacts, fetchContacts } = useContactStore()
  const { dueToday, overdue, upcoming, fetchDueToday, fetchOverdue, fetchUpcoming, markDone } =
    useFollowUpStore()

  const [recentInteractions, setRecentInteractions] = useState<RecentInteraction[]>([])
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([])
  const [sourceDistribution, setSourceDistribution] = useState<SourceData[]>([])
  const [tagDistribution, setTagDistribution] = useState<TagData[]>([])
  const [newContactsThisMonth, setNewContactsThisMonth] = useState(0)
  const [totalInteractions, setTotalInteractions] = useState(0)

  useEffect(() => {
    fetchContacts()
    fetchDueToday()
    fetchOverdue()
    fetchUpcoming(7)
    loadDashboardData()
  }, [fetchContacts, fetchDueToday, fetchOverdue, fetchUpcoming])

  const loadDashboardData = async () => {
    try {
      const [
        recentData,
        dailyData,
        sourceData,
        tagsData,
        newThisMonth,
        interactionCount
      ] = await Promise.all([
        window.api.interactions.getRecent(10),
        window.api.interactions.getDailyCounts(7),
        window.api.contacts.getSourceDistribution(),
        window.api.tags.getWithCounts(),
        window.api.contacts.getCreatedThisMonth(),
        window.api.interactions.getCount()
      ])

      setRecentInteractions(recentData)
      setDailyCounts(dailyData)
      setSourceDistribution(sourceData)
      setTagDistribution(tagsData.map((tag: TagData) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        count: tag.contact_count
      })))
      setNewContactsThisMonth(newThisMonth)
      setTotalInteractions(interactionCount)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const stats = [
    {
      title: t('dashboard.totalContacts'),
      value: contacts.length,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      title: t('dashboard.dueToday'),
      value: dueToday.length,
      icon: CalendarClock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    {
      title: t('dashboard.overdue'),
      value: overdue.length,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    {
      title: t('dashboard.upcoming'),
      value: upcoming.length,
      icon: Clock,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    }
  ]

  const additionalStats = [
    {
      title: t('dashboard.newContactsThisMonth'),
      value: newContactsThisMonth,
      icon: UserPlus,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    {
      title: t('dashboard.totalInteractions'),
      value: totalInteractions,
      icon: TrendingUp,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10'
    }
  ]

  const allPending = [...overdue, ...dueToday, ...upcoming].slice(0, 6)

  // Format daily counts for chart
  const chartData = dailyCounts.map((item) => {
    const date = new Date(item.date)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return {
      date: item.date,
      count: item.count,
      label: dayNames[date.getDay()]
    }
  })

  return (
    <div className="flex flex-col h-screen">
      <Header title={t('dashboard.title')} description={t('dashboard.description')} />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-2 rounded-full ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {additionalStats.map((stat) => (
              <Card key={stat.title} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-2 rounded-full ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ActivityChart data={chartData} className="lg:col-span-1" />
            <SourceDistributionChart data={sourceDistribution} className="lg:col-span-1" />
            <TagDistributionChart
              data={tagDistribution.map((t) => ({
                id: t.id,
                name: t.name,
                color: t.color,
                count: t.contact_count
              }))}
              className="lg:col-span-1"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Follow-ups Queue */}
            <Card className="border-none shadow-sm lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">{t('dashboard.followupQueue')}</CardTitle>
                <Link to="/followups">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    {t('dashboard.viewAll')} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {allPending.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CalendarClock className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">{t('dashboard.noFollowups')}</p>
                    <p className="text-sm text-muted-foreground/70">
                      {t('dashboard.noFollowupsDesc')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allPending.map((followup) => {
                      const { label, variant } = getDueDateLabel(followup.due_at)
                      return (
                        <div
                          key={followup.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/contacts/${followup.contact_id}`}
                              className="font-medium text-sm hover:text-primary transition-colors"
                            >
                              {followup.contact_name}
                            </Link>
                            {followup.reason && (
                              <p className="text-xs text-muted-foreground truncate">
                                {followup.reason}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Badge variant={variant} className="text-xs">{label}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markDone(followup.id)}
                              className="text-xs h-7 px-2"
                            >
                              {t('dashboard.markDone')}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Interactions */}
            <Card className="border-none shadow-sm lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">{t('dashboard.recentInteractions')}</CardTitle>
              </CardHeader>
              <CardContent>
                {recentInteractions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">{t('dashboard.noInteractions')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentInteractions.slice(0, 6).map((interaction) => {
                      const Icon = interactionIcons[interaction.type]
                      return (
                        <Link
                          key={interaction.id}
                          to={`/contacts/${interaction.contact_id}`}
                          className="flex items-start gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="p-1.5 rounded bg-muted">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{interaction.contact_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{interaction.body}</p>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              {formatDateTime(interaction.occurred_at)}
                            </p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Contacts */}
            <Card className="border-none shadow-sm lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">{t('dashboard.recentContacts')}</CardTitle>
                <Link to="/contacts">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    {t('dashboard.viewAll')} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">{t('dashboard.noRecentContacts')}</p>
                    <Link to="/import">
                      <Button variant="outline" size="sm" className="mt-3">
                        <Plus className="h-4 w-4 mr-1" /> {t('contacts.importContacts')}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contacts.slice(0, 6).map((contact) => (
                      <Link
                        key={contact.id}
                        to={`/contacts/${contact.id}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {contact.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{contact.name}</p>
                            {contact.company && (
                              <p className="text-xs text-muted-foreground">{contact.company}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeDate(contact.last_contact_at)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{t('common.quickActions', 'Quick Actions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Link to="/contacts">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> {t('contacts.addContact')}
                  </Button>
                </Link>
                <Link to="/import">
                  <Button variant="outline">{t('import.title')}</Button>
                </Link>
                <Link to="/followups">
                  <Button variant="outline">{t('followups.title')}</Button>
                </Link>
                <Link to="/smart-lists">
                  <Button variant="outline">{t('nav.smartLists')}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
