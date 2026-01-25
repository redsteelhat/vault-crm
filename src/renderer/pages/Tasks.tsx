import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, 
  Calendar,
  User,
  Briefcase,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { format, isToday, isPast, isFuture, addDays } from 'date-fns'

interface Task {
  id: string
  contact_id: string | null
  deal_id: string | null
  title: string
  description: string | null
  due_at: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'done' | 'cancelled'
  created_at: string
  completed_at: string | null
  contact_name: string | null
  deal_name: string | null
}

interface Contact {
  id: string
  name: string
}

interface Deal {
  id: string
  name: string
}

type TaskFormData = {
  title: string
  description: string
  contact_id: string
  deal_id: string
  due_at: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export default function Tasks() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [tasks, setTasks] = useState<Task[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('today')

  // Stats
  const [stats, setStats] = useState({ open: 0, overdue: 0, completed: 0 })

  // Task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    title: '',
    description: '',
    contact_id: '',
    deal_id: '',
    due_at: format(new Date(), 'yyyy-MM-dd'),
    priority: 'medium'
  })
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api

      // Load tasks based on active tab
      let tasksData: Task[] = []
      switch (activeTab) {
        case 'today':
          tasksData = await api.tasks.getToday()
          break
        case 'upcoming':
          tasksData = await api.tasks.getUpcoming(7)
          break
        case 'overdue':
          tasksData = await api.tasks.getOverdue()
          break
        case 'all':
          tasksData = await api.tasks.getAll()
          break
        default:
          tasksData = await api.tasks.getOpen()
      }
      setTasks(tasksData)

      // Load stats
      const statsData = await api.tasks.getCount()
      setStats(statsData)

      // Load contacts and deals for dropdown
      const contactsData = await api.contacts.getAll()
      setContacts(contactsData.map(c => ({ id: c.id, name: c.name })))

      const dealsData = await api.deals.getAll()
      setDeals(dealsData.map(d => ({ id: d.id, name: d.name })))
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [activeTab, t, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openNewTaskDialog = () => {
    setEditingTask(null)
    setTaskForm({
      title: '',
      description: '',
      contact_id: '',
      deal_id: '',
      due_at: format(new Date(), 'yyyy-MM-dd'),
      priority: 'medium'
    })
    setTaskDialogOpen(true)
  }

  const openEditTaskDialog = (task: Task) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      contact_id: task.contact_id || '',
      deal_id: task.deal_id || '',
      due_at: task.due_at?.split('T')[0] || '',
      priority: task.priority
    })
    setTaskDialogOpen(true)
  }

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) {
      toast({
        title: t('common.error'),
        description: t('tasks.taskTitleRequired'),
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api

      const taskData = {
        title: taskForm.title.trim(),
        description: taskForm.description || null,
        contact_id: taskForm.contact_id || null,
        deal_id: taskForm.deal_id || null,
        due_at: taskForm.due_at || null,
        priority: taskForm.priority,
        status: 'open' as const
      }

      if (editingTask) {
        await api.tasks.update(editingTask.id, taskData)
        toast({
          title: t('tasks.taskUpdated'),
          description: t('tasks.taskUpdatedDesc')
        })
      } else {
        await api.tasks.create(taskData)
        toast({
          title: t('tasks.taskCreated'),
          description: t('tasks.taskCreatedDesc')
        })
      }

      setTaskDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error saving task:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleComplete = async (task: Task) => {
    try {
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api

      if (task.status === 'done') {
        await api.tasks.reopen(task.id)
      } else {
        await api.tasks.complete(task.id)
        toast({
          title: t('tasks.taskCompleted'),
          description: t('tasks.taskCompletedDesc')
        })
      }

      loadData()
    } catch (error) {
      console.error('Error toggling task:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    }
  }

  const handleDeleteTask = async () => {
    if (!taskToDelete) return

    try {
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api
      await api.tasks.delete(taskToDelete)

      toast({
        title: t('tasks.taskDeleted'),
        description: t('tasks.taskDeletedDesc')
      })

      setDeleteDialogOpen(false)
      setTaskToDelete(null)
      loadData()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    }
  }

  const confirmDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId)
    setDeleteDialogOpen(true)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return t('tasks.priorityUrgent')
      case 'high': return t('tasks.priorityHigh')
      case 'medium': return t('tasks.priorityMedium')
      case 'low': return t('tasks.priorityLow')
      default: return priority
    }
  }

  const renderTask = (task: Task) => {
    const isOverdue = task.due_at && isPast(new Date(task.due_at)) && task.status === 'open'
    const isDone = task.status === 'done'

    return (
      <Card key={task.id} className={`${isDone ? 'opacity-60' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isDone}
              onCheckedChange={() => handleToggleComplete(task)}
              className="mt-1"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className={`font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditTaskDialog(task)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => confirmDeleteTask(task.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3">
                {/* Priority */}
                <Badge variant="outline" className="gap-1">
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                  {getPriorityLabel(task.priority)}
                </Badge>

                {/* Due date */}
                {task.due_at && (
                  <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                    {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                    {format(new Date(task.due_at), 'MMM d, yyyy')}
                  </div>
                )}

                {/* Contact */}
                {task.contact_name && (
                  <button
                    onClick={() => task.contact_id && navigate(`/contacts/${task.contact_id}`)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                  >
                    <User className="h-3 w-3" />
                    {task.contact_name}
                  </button>
                )}

                {/* Deal */}
                {task.deal_name && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Briefcase className="h-3 w-3" />
                    {task.deal_name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('tasks.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {stats.open} {t('tasks.statusOpen')} · {stats.overdue} {t('tasks.overdue')}
          </p>
        </div>
        <Button onClick={openNewTaskDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t('tasks.newTask')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setActiveTab('today')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-sm text-muted-foreground">{t('tasks.statusOpen')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setActiveTab('overdue')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-sm text-muted-foreground">{t('tasks.overdue')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setActiveTab('all')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">{t('tasks.completed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today">{t('tasks.today')}</TabsTrigger>
          <TabsTrigger value="upcoming">{t('tasks.upcoming')}</TabsTrigger>
          <TabsTrigger value="overdue">{t('tasks.overdue')}</TabsTrigger>
          <TabsTrigger value="all">{t('tasks.allTasks')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Circle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>{t('tasks.noTasks')}</p>
                </div>
              ) : (
                tasks.map(renderTask)
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? t('tasks.editTask') : t('tasks.newTask')}
            </DialogTitle>
            <DialogDescription>
              {editingTask ? t('tasks.editTaskDesc') : t('tasks.newTaskDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('tasks.taskTitle')} *</Label>
              <Input
                id="title"
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t('tasks.taskTitlePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('tasks.description')}</Label>
              <Textarea
                id="description"
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('tasks.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_at">{t('tasks.dueDate')}</Label>
                <Input
                  id="due_at"
                  type="date"
                  value={taskForm.due_at}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, due_at: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">{t('tasks.priority')}</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                    setTaskForm(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('tasks.priorityLow')}</SelectItem>
                    <SelectItem value="medium">{t('tasks.priorityMedium')}</SelectItem>
                    <SelectItem value="high">{t('tasks.priorityHigh')}</SelectItem>
                    <SelectItem value="urgent">{t('tasks.priorityUrgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">{t('pipeline.linkedContact')}</Label>
              <Select
                value={taskForm.contact_id || '_none'}
                onValueChange={(value) => setTaskForm(prev => ({ ...prev, contact_id: value === '_none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('pipeline.selectContact')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t('pipeline.noContact')}</SelectItem>
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal">{t('tasks.linkedDeal')}</Label>
              <Select
                value={taskForm.deal_id || '_none'}
                onValueChange={(value) => setTaskForm(prev => ({ ...prev, deal_id: value === '_none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('tasks.selectDeal')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t('tasks.noDeal')}</SelectItem>
                  {deals.map(deal => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveTask} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTask ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tasks.deleteTask')}</DialogTitle>
            <DialogDescription>
              {t('tasks.deleteTaskConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
