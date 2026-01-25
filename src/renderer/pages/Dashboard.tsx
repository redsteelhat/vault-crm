import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users, CalendarClock, AlertTriangle, Clock, Plus, ArrowRight } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useContactStore } from '@/stores/contactStore'
import { useFollowUpStore } from '@/stores/followupStore'
import { formatRelativeDate, getDueDateLabel } from '@/lib/utils'

export function Dashboard() {
  const { t } = useTranslation()
  const { contacts, fetchContacts } = useContactStore()
  const { dueToday, overdue, upcoming, fetchDueToday, fetchOverdue, fetchUpcoming, markDone } =
    useFollowUpStore()

  useEffect(() => {
    fetchContacts()
    fetchDueToday()
    fetchOverdue()
    fetchUpcoming(7)
  }, [fetchContacts, fetchDueToday, fetchOverdue, fetchUpcoming])

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

  const allPending = [...overdue, ...dueToday, ...upcoming].slice(0, 8)

  return (
    <div className="flex flex-col h-screen">
      <Header title={t('dashboard.title')} description={t('dashboard.description')} />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bg}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Follow-ups Queue */}
            <Card className="border-none shadow-sm">
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
                  <div className="space-y-3">
                    {allPending.map((followup) => {
                      const { label, variant } = getDueDateLabel(followup.due_at)
                      return (
                        <div
                          key={followup.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/contacts/${followup.contact_id}`}
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {followup.contact_name}
                            </Link>
                            {followup.reason && (
                              <p className="text-sm text-muted-foreground truncate">
                                {followup.reason}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant={variant}>{label}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markDone(followup.id)}
                              className="text-xs"
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

            {/* Recent Contacts */}
            <Card className="border-none shadow-sm">
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
                  <div className="space-y-3">
                    {contacts.slice(0, 6).map((contact) => (
                      <Link
                        key={contact.id}
                        to={`/contacts/${contact.id}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
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
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
