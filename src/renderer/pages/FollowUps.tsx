import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MoreVertical,
  Calendar
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { useFollowUpStore } from '@/stores/followupStore'
import { useToast } from '@/hooks/useToast'
import { formatDate, getDueDateLabel, cn } from '@/lib/utils'
import { format } from 'date-fns'

export function FollowUps() {
  const { toast } = useToast()
  const {
    dueToday,
    overdue,
    upcoming,
    fetchDueToday,
    fetchOverdue,
    fetchUpcoming,
    markDone,
    snooze,
    deleteFollowUp
  } = useFollowUpStore()

  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false)
  const [selectedFollowUp, setSelectedFollowUp] = useState<string | null>(null)
  const [snoozeDate, setSnoozeDate] = useState<Date>(new Date())

  useEffect(() => {
    fetchDueToday()
    fetchOverdue()
    fetchUpcoming(30)
  }, [fetchDueToday, fetchOverdue, fetchUpcoming])

  const handleMarkDone = async (id: string) => {
    try {
      await markDone(id)
      toast({ title: 'Follow-up completed', variant: 'success' })
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' })
    }
  }

  const handleSnooze = async () => {
    if (!selectedFollowUp) return
    try {
      await snooze(selectedFollowUp, snoozeDate.toISOString())
      toast({ title: 'Follow-up snoozed', variant: 'success' })
      setSnoozeDialogOpen(false)
      setSelectedFollowUp(null)
    } catch {
      toast({ title: 'Failed to snooze', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this follow-up?')) {
      try {
        await deleteFollowUp(id)
        toast({ title: 'Follow-up deleted' })
      } catch {
        toast({ title: 'Failed to delete', variant: 'destructive' })
      }
    }
  }

  const openSnoozeDialog = (id: string) => {
    setSelectedFollowUp(id)
    setSnoozeDate(new Date(Date.now() + 24 * 60 * 60 * 1000)) // Tomorrow
    setSnoozeDialogOpen(true)
  }

  const FollowUpItem = ({ followup }: { followup: any }) => {
    const { label, variant } = getDueDateLabel(followup.due_at)

    return (
      <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:shadow-sm transition-all">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold',
              variant === 'destructive'
                ? 'bg-red-500/10 text-red-500'
                : variant === 'warning'
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-primary/10 text-primary'
            )}
          >
            {followup.contact_name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              to={`/contacts/${followup.contact_id}`}
              className="font-medium hover:text-primary transition-colors block truncate"
            >
              {followup.contact_name}
            </Link>
            {followup.contact_company && (
              <p className="text-sm text-muted-foreground truncate">{followup.contact_company}</p>
            )}
            {followup.reason && (
              <p className="text-sm text-muted-foreground mt-1 truncate">{followup.reason}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <Badge variant={variant}>{label}</Badge>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => handleMarkDone(followup.id)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Done
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openSnoozeDialog(followup.id)}>
                Snooze
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(followup.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <CalendarClock className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  )

  return (
    <div className="flex flex-col h-screen">
      <Header title="Follow-ups" description="Stay on top of your relationships" />

      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overdue.length}</p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/10">
                  <CalendarClock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dueToday.length}</p>
                  <p className="text-sm text-muted-foreground">Due Today</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcoming.length}</p>
                  <p className="text-sm text-muted-foreground">Upcoming (30 days)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">
                All ({overdue.length + dueToday.length + upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="text-red-500">
                Overdue ({overdue.length})
              </TabsTrigger>
              <TabsTrigger value="today" className="text-amber-500">
                Today ({dueToday.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="space-y-3">
                {overdue.length === 0 && dueToday.length === 0 && upcoming.length === 0 ? (
                  <EmptyState message="No pending follow-ups" />
                ) : (
                  <>
                    {overdue.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-red-500 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" /> Overdue
                        </h3>
                        <div className="space-y-2">
                          {overdue.map((f) => (
                            <FollowUpItem key={f.id} followup={f} />
                          ))}
                        </div>
                      </div>
                    )}
                    {dueToday.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-amber-500 mb-3 flex items-center gap-2">
                          <CalendarClock className="h-4 w-4" /> Due Today
                        </h3>
                        <div className="space-y-2">
                          {dueToday.map((f) => (
                            <FollowUpItem key={f.id} followup={f} />
                          ))}
                        </div>
                      </div>
                    )}
                    {upcoming.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4" /> Upcoming
                        </h3>
                        <div className="space-y-2">
                          {upcoming.map((f) => (
                            <FollowUpItem key={f.id} followup={f} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="overdue">
              {overdue.length === 0 ? (
                <EmptyState message="No overdue follow-ups" />
              ) : (
                <div className="space-y-2">
                  {overdue.map((f) => (
                    <FollowUpItem key={f.id} followup={f} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="today">
              {dueToday.length === 0 ? (
                <EmptyState message="No follow-ups due today" />
              ) : (
                <div className="space-y-2">
                  {dueToday.map((f) => (
                    <FollowUpItem key={f.id} followup={f} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="upcoming">
              {upcoming.length === 0 ? (
                <EmptyState message="No upcoming follow-ups" />
              ) : (
                <div className="space-y-2">
                  {upcoming.map((f) => (
                    <FollowUpItem key={f.id} followup={f} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Snooze Dialog */}
      <Dialog open={snoozeDialogOpen} onOpenChange={setSnoozeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Snooze Follow-up</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select a new date for this follow-up
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(snoozeDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={snoozeDate}
                  onSelect={(d) => d && setSnoozeDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnoozeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSnooze}>Snooze</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
