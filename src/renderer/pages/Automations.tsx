import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, 
  Zap,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Pause,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'

type TriggerType = 
  | 'tag_added' 
  | 'tag_removed' 
  | 'deal_stage_changed' 
  | 'contact_created' 
  | 'deal_created' 
  | 'followup_done' 
  | 'task_done'

type ActionType = 
  | 'add_tag' 
  | 'remove_tag' 
  | 'create_task' 
  | 'update_field' 
  | 'move_deal_stage' 
  | 'send_notification'

interface AutomationRule {
  id: string
  name: string
  trigger_type: TriggerType
  trigger_config: string
  action_type: ActionType
  action_config: string
  enabled: number
  run_count: number
  last_run_at: string | null
  created_at: string
}

interface Tag {
  id: string
  name: string
}

interface PipelineStage {
  id: string
  name: string
}

export default function Automations() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [rules, setRules] = useState<AutomationRule[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    enabled: 0,
    totalRuns: 0
  })

  // Rule dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [ruleForm, setRuleForm] = useState({
    name: '',
    trigger_type: 'tag_added' as TriggerType,
    trigger_config: {} as Record<string, string>,
    action_type: 'add_tag' as ActionType,
    action_config: {} as Record<string, string>
  })
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api

      const [rulesData, statsData, tagsData, pipelineData] = await Promise.all([
        api.automations.getAll(),
        api.automations.getStats(),
        api.tags.getAll(),
        api.pipelines.getDefault()
      ])

      setRules(rulesData)
      setStats(statsData)
      setTags(tagsData)

      if (pipelineData) {
        const stagesData = await api.pipelines.getStages(pipelineData.id)
        setStages(stagesData)
      }
    } catch (error) {
      console.error('Error loading automations:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openNewRuleDialog = () => {
    setEditingRule(null)
    setRuleForm({
      name: '',
      trigger_type: 'tag_added',
      trigger_config: {},
      action_type: 'add_tag',
      action_config: {}
    })
    setDialogOpen(true)
  }

  const openEditRuleDialog = (rule: AutomationRule) => {
    setEditingRule(rule)
    setRuleForm({
      name: rule.name,
      trigger_type: rule.trigger_type,
      trigger_config: JSON.parse(rule.trigger_config || '{}'),
      action_type: rule.action_type,
      action_config: JSON.parse(rule.action_config || '{}')
    })
    setDialogOpen(true)
  }

  const handleSaveRule = async () => {
    if (!ruleForm.name.trim()) {
      toast({
        title: t('common.error'),
        description: t('automations.nameRequired'),
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api

      const ruleData = {
        name: ruleForm.name.trim(),
        trigger_type: ruleForm.trigger_type,
        trigger_config: JSON.stringify(ruleForm.trigger_config),
        action_type: ruleForm.action_type,
        action_config: JSON.stringify(ruleForm.action_config),
        enabled: 1
      }

      if (editingRule) {
        await api.automations.update(editingRule.id, ruleData)
        toast({
          title: t('automations.ruleUpdated'),
          description: t('automations.ruleUpdatedDesc')
        })
      } else {
        await api.automations.create(ruleData)
        toast({
          title: t('automations.ruleCreated'),
          description: t('automations.ruleCreatedDesc')
        })
      }

      setDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error saving rule:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleRule = async (rule: AutomationRule) => {
    try {
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api
      await api.automations.toggle(rule.id, rule.enabled === 0)
      loadData()
    } catch (error) {
      console.error('Error toggling rule:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    }
  }

  const handleDeleteRule = async () => {
    if (!ruleToDelete) return

    try {
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api
      await api.automations.delete(ruleToDelete)

      toast({
        title: t('automations.ruleDeleted'),
        description: t('automations.ruleDeletedDesc')
      })

      setDeleteDialogOpen(false)
      setRuleToDelete(null)
      loadData()
    } catch (error) {
      console.error('Error deleting rule:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    }
  }

  const confirmDeleteRule = (ruleId: string) => {
    setRuleToDelete(ruleId)
    setDeleteDialogOpen(true)
  }

  const getTriggerLabel = (type: TriggerType) => t(`automations.triggers.${type}`)
  const getActionLabel = (type: ActionType) => t(`automations.actions.${type}`)

  const renderTriggerConfig = () => {
    switch (ruleForm.trigger_type) {
      case 'tag_added':
      case 'tag_removed':
        return (
          <div className="space-y-2">
            <Label>{t('common.tag')}</Label>
            <Select
              value={ruleForm.trigger_config.tagId || ''}
              onValueChange={(value) => setRuleForm(prev => ({
                ...prev,
                trigger_config: { ...prev.trigger_config, tagId: value }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                {tags.map(tag => (
                  <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case 'deal_stage_changed':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('pipeline.stage')} (from)</Label>
              <Select
                value={ruleForm.trigger_config.fromStage || ''}
                onValueChange={(value) => setRuleForm(prev => ({
                  ...prev,
                  trigger_config: { ...prev.trigger_config, fromStage: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.any')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('common.any')}</SelectItem>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('pipeline.stage')} (to)</Label>
              <Select
                value={ruleForm.trigger_config.toStage || ''}
                onValueChange={(value) => setRuleForm(prev => ({
                  ...prev,
                  trigger_config: { ...prev.trigger_config, toStage: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.any')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('common.any')}</SelectItem>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const renderActionConfig = () => {
    switch (ruleForm.action_type) {
      case 'add_tag':
      case 'remove_tag':
        return (
          <div className="space-y-2">
            <Label>{t('common.tag')}</Label>
            <Select
              value={ruleForm.action_config.tagId || ''}
              onValueChange={(value) => setRuleForm(prev => ({
                ...prev,
                action_config: { ...prev.action_config, tagId: value }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                {tags.map(tag => (
                  <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case 'create_task':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('tasks.taskTitle')}</Label>
              <Input
                value={ruleForm.action_config.title || ''}
                onChange={(e) => setRuleForm(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, title: e.target.value }
                }))}
                placeholder={t('tasks.taskTitlePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('tasks.dueDate')} (days from now)</Label>
              <Input
                type="number"
                min="0"
                value={ruleForm.action_config.dueDays || '1'}
                onChange={(e) => setRuleForm(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, dueDays: e.target.value }
                }))}
              />
            </div>
          </div>
        )
      case 'move_deal_stage':
        return (
          <div className="space-y-2">
            <Label>{t('pipeline.stage')}</Label>
            <Select
              value={ruleForm.action_config.toStage || ''}
              onValueChange={(value) => setRuleForm(prev => ({
                ...prev,
                action_config: { ...prev.action_config, toStage: value }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                {stages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case 'send_notification':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={ruleForm.action_config.title || ''}
                onChange={(e) => setRuleForm(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, title: e.target.value }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Input
                value={ruleForm.action_config.body || ''}
                onChange={(e) => setRuleForm(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, body: e.target.value }
                }))}
              />
            </div>
          </div>
        )
      default:
        return null
    }
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
          <h1 className="text-2xl font-bold">{t('automations.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {stats.enabled} {t('automations.enabledRules')} · {stats.totalRuns} {t('automations.stats.totalRuns')}
          </p>
        </div>
        <Button onClick={openNewRuleDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t('automations.newRule')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">{t('automations.stats.totalRules')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.enabled}</p>
                <p className="text-sm text-muted-foreground">{t('automations.stats.enabledRules')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ArrowRight className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalRuns}</p>
                <p className="text-sm text-muted-foreground">{t('automations.stats.totalRuns')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>{t('automations.noRules')}</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={rule.enabled === 1}
                      onCheckedChange={() => handleToggleRule(rule)}
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? t('automations.enabled') : t('automations.disabled')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>{getTriggerLabel(rule.trigger_type)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{getActionLabel(rule.action_type)}</span>
                      </div>
                      {rule.run_count > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ran {rule.run_count} times
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
                        <DropdownMenuItem onClick={() => openEditRuleDialog(rule)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => confirmDeleteRule(rule.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? t('automations.editRule') : t('automations.newRule')}
            </DialogTitle>
            <DialogDescription>
              {editingRule ? t('automations.editRuleDesc') : t('automations.newRuleDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('automations.ruleName')} *</Label>
              <Input
                id="name"
                value={ruleForm.name}
                onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('automations.ruleNamePlaceholder')}
              />
            </div>

            {/* Trigger Section */}
            <div className="space-y-3">
              <Label className="text-base font-medium">{t('automations.trigger')}</Label>
              <Select
                value={ruleForm.trigger_type}
                onValueChange={(value: TriggerType) => setRuleForm(prev => ({
                  ...prev,
                  trigger_type: value,
                  trigger_config: {}
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tag_added">{t('automations.triggers.tag_added')}</SelectItem>
                  <SelectItem value="tag_removed">{t('automations.triggers.tag_removed')}</SelectItem>
                  <SelectItem value="deal_stage_changed">{t('automations.triggers.deal_stage_changed')}</SelectItem>
                  <SelectItem value="contact_created">{t('automations.triggers.contact_created')}</SelectItem>
                  <SelectItem value="deal_created">{t('automations.triggers.deal_created')}</SelectItem>
                  <SelectItem value="followup_done">{t('automations.triggers.followup_done')}</SelectItem>
                  <SelectItem value="task_done">{t('automations.triggers.task_done')}</SelectItem>
                </SelectContent>
              </Select>
              {renderTriggerConfig()}
            </div>

            {/* Action Section */}
            <div className="space-y-3">
              <Label className="text-base font-medium">{t('automations.action')}</Label>
              <Select
                value={ruleForm.action_type}
                onValueChange={(value: ActionType) => setRuleForm(prev => ({
                  ...prev,
                  action_type: value,
                  action_config: {}
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add_tag">{t('automations.actions.add_tag')}</SelectItem>
                  <SelectItem value="remove_tag">{t('automations.actions.remove_tag')}</SelectItem>
                  <SelectItem value="create_task">{t('automations.actions.create_task')}</SelectItem>
                  <SelectItem value="move_deal_stage">{t('automations.actions.move_deal_stage')}</SelectItem>
                  <SelectItem value="send_notification">{t('automations.actions.send_notification')}</SelectItem>
                </SelectContent>
              </Select>
              {renderActionConfig()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveRule} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRule ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('automations.deleteRule')}</DialogTitle>
            <DialogDescription>
              {t('automations.deleteRuleConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteRule}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
