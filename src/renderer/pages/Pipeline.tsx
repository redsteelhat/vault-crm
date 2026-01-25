import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KanbanBoard } from '@/components/KanbanBoard'
import { 
  Plus, 
  Settings, 
  BarChart3, 
  DollarSign, 
  TrendingUp,
  Target,
  ChevronDown,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface Pipeline {
  id: string
  name: string
  stages: string
  is_default: number
}

interface PipelineStage {
  id: string
  name: string
  color: string
  order: number
}

interface Deal {
  id: string
  pipeline_id: string
  contact_id: string | null
  name: string
  value: number
  currency: string
  stage: string
  probability: number
  expected_close: string | null
  notes: string | null
  contact_name: string | null
  contact_company: string | null
  closed_at: string | null
  won: number | null
}

interface Contact {
  id: string
  name: string
  company: string | null
}

type DealFormData = {
  name: string
  contact_id: string
  value: string
  currency: string
  stage: string
  probability: string
  expected_close: string
  notes: string
}

export default function Pipeline() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  // Stats
  const [stats, setStats] = useState({
    totalDeals: 0,
    totalValue: 0,
    weightedValue: 0,
    closedStats: { won: { count: 0, value: 0 }, lost: { count: 0, value: 0 }, winRate: 0 }
  })

  // Deal dialog
  const [dealDialogOpen, setDealDialogOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [dealForm, setDealForm] = useState<DealFormData>({
    name: '',
    contact_id: '',
    value: '',
    currency: 'USD',
    stage: '',
    probability: '50',
    expected_close: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [dealToDelete, setDealToDelete] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api

      // Load pipelines
      const pipelinesData = await api.pipelines.getAll()
      setPipelines(pipelinesData)

      // Select default pipeline or first one
      const defaultPipeline = pipelinesData.find(p => p.is_default) || pipelinesData[0]
      if (defaultPipeline) {
        setSelectedPipeline(defaultPipeline)
      }

      // Load contacts for dropdown
      const contactsData = await api.contacts.getAll()
      setContacts(contactsData.map(c => ({ id: c.id, name: c.name, company: c.company })))
    } catch (error) {
      console.error('Error loading pipelines:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  const loadPipelineData = useCallback(async (pipelineId: string) => {
    try {
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api

      // Load stages
      const stagesData = await api.pipelines.getStages(pipelineId)
      setStages(stagesData)

      // Load deals
      const dealsData = await api.deals.getAll(pipelineId)
      setDeals(dealsData)

      // Load stats
      const pipelineStats = await api.pipelines.getStats(pipelineId)
      const weightedValue = await api.deals.getWeightedValue(pipelineId)
      const closedStats = await api.deals.getClosedStats(pipelineId, 30)

      setStats({
        totalDeals: pipelineStats.totalDeals,
        totalValue: pipelineStats.totalValue,
        weightedValue,
        closedStats
      })

      // Set default stage for new deals
      if (stagesData.length > 0) {
        setDealForm(prev => ({ ...prev, stage: stagesData[0].id }))
      }
    } catch (error) {
      console.error('Error loading pipeline data:', error)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (selectedPipeline) {
      loadPipelineData(selectedPipeline.id)
    }
  }, [selectedPipeline, loadPipelineData])

  const handleDealMove = async (dealId: string, newStage: string) => {
    try {
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api
      await api.deals.moveToStage(dealId, newStage)

      // Update local state
      setDeals(prev => prev.map(d =>
        d.id === dealId ? { ...d, stage: newStage } : d
      ))

      toast({
        title: t('pipeline.dealMoved'),
        description: t('pipeline.dealMovedDesc')
      })
    } catch (error) {
      console.error('Error moving deal:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    }
  }

  const openNewDealDialog = (stage?: string) => {
    setEditingDeal(null)
    setDealForm({
      name: '',
      contact_id: '',
      value: '',
      currency: 'USD',
      stage: stage || (stages[0]?.id || ''),
      probability: '50',
      expected_close: '',
      notes: ''
    })
    setDealDialogOpen(true)
  }

  const openEditDealDialog = async (dealId: string) => {
    const deal = deals.find(d => d.id === dealId)
    if (!deal) return

    setEditingDeal(deal)
    setDealForm({
      name: deal.name,
      contact_id: deal.contact_id || '',
      value: deal.value.toString(),
      currency: deal.currency,
      stage: deal.stage,
      probability: deal.probability.toString(),
      expected_close: deal.expected_close?.split('T')[0] || '',
      notes: deal.notes || ''
    })
    setDealDialogOpen(true)
  }

  const handleSaveDeal = async () => {
    if (!dealForm.name.trim()) {
      toast({
        title: t('common.error'),
        description: t('pipeline.dealNameRequired'),
        variant: 'destructive'
      })
      return
    }

    if (!selectedPipeline) return

    try {
      setSaving(true)
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api

      const dealData = {
        pipeline_id: selectedPipeline.id,
        contact_id: dealForm.contact_id || null,
        name: dealForm.name.trim(),
        value: parseFloat(dealForm.value) || 0,
        currency: dealForm.currency,
        stage: dealForm.stage,
        probability: parseInt(dealForm.probability) || 50,
        expected_close: dealForm.expected_close || null,
        notes: dealForm.notes || null
      }

      if (editingDeal) {
        await api.deals.update(editingDeal.id, dealData)
        toast({
          title: t('pipeline.dealUpdated'),
          description: t('pipeline.dealUpdatedDesc')
        })
      } else {
        await api.deals.create(dealData)
        toast({
          title: t('pipeline.dealCreated'),
          description: t('pipeline.dealCreatedDesc')
        })
      }

      setDealDialogOpen(false)
      loadPipelineData(selectedPipeline.id)
    } catch (error) {
      console.error('Error saving deal:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCloseDeal = async (dealId: string, won: boolean) => {
    try {
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api
      await api.deals.close(dealId, won)

      toast({
        title: won ? t('pipeline.dealWon') : t('pipeline.dealLost'),
        description: won ? t('pipeline.dealWonDesc') : t('pipeline.dealLostDesc')
      })

      if (selectedPipeline) {
        loadPipelineData(selectedPipeline.id)
      }
    } catch (error) {
      console.error('Error closing deal:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    }
  }

  const handleDeleteDeal = async () => {
    if (!dealToDelete) return

    try {
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api
      await api.deals.delete(dealToDelete)

      toast({
        title: t('pipeline.dealDeleted'),
        description: t('pipeline.dealDeletedDesc')
      })

      setDeleteDialogOpen(false)
      setDealToDelete(null)

      if (selectedPipeline) {
        loadPipelineData(selectedPipeline.id)
      }
    } catch (error) {
      console.error('Error deleting deal:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    }
  }

  const confirmDeleteDeal = (dealId: string) => {
    setDealToDelete(dealId)
    setDeleteDialogOpen(true)
  }

  const viewDealContact = (dealId: string) => {
    const deal = deals.find(d => d.id === dealId)
    if (deal?.contact_id) {
      navigate(`/contacts/${deal.contact_id}`)
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
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
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{t('pipeline.title')}</h1>

          {/* Pipeline Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {selectedPipeline?.name || t('pipeline.selectPipeline')}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {pipelines.map(pipeline => (
                <DropdownMenuItem
                  key={pipeline.id}
                  onClick={() => setSelectedPipeline(pipeline)}
                >
                  {pipeline.name}
                  {pipeline.is_default === 1 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {t('common.default')}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {}}>
                <Settings className="h-4 w-4 mr-2" />
                {t('pipeline.managePipelines')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {}}>
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('pipeline.viewReports')}
          </Button>
          <Button onClick={() => openNewDealDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('pipeline.newDeal')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              {t('pipeline.openDeals')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('pipeline.pipelineValue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(stats.totalValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('pipeline.weightedValue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.weightedValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('pipeline.winRate')} (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.closedStats.winRate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.closedStats.won.count} {t('pipeline.won')} / {stats.closedStats.lost.count} {t('pipeline.lost')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      {selectedPipeline && stages.length > 0 && (
        <KanbanBoard
          stages={stages}
          deals={deals.filter(d => !d.closed_at)}
          onDealMove={handleDealMove}
          onDealView={viewDealContact}
          onDealEdit={openEditDealDialog}
          onDealClose={handleCloseDeal}
          onDealDelete={confirmDeleteDeal}
          onAddDeal={openNewDealDialog}
        />
      )}

      {/* Deal Dialog */}
      <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDeal ? t('pipeline.editDeal') : t('pipeline.newDeal')}
            </DialogTitle>
            <DialogDescription>
              {editingDeal ? t('pipeline.editDealDesc') : t('pipeline.newDealDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('pipeline.dealName')} *</Label>
              <Input
                id="name"
                value={dealForm.name}
                onChange={(e) => setDealForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('pipeline.dealNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">{t('pipeline.linkedContact')}</Label>
              <Select
                value={dealForm.contact_id}
                onValueChange={(value) => setDealForm(prev => ({ ...prev, contact_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('pipeline.selectContact')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('pipeline.noContact')}</SelectItem>
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} {contact.company && `(${contact.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">{t('pipeline.dealValue')}</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  value={dealForm.value}
                  onChange={(e) => setDealForm(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">{t('pipeline.currency')}</Label>
                <Select
                  value={dealForm.currency}
                  onValueChange={(value) => setDealForm(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="TRY">TRY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stage">{t('pipeline.stage')}</Label>
                <Select
                  value={dealForm.stage}
                  onValueChange={(value) => setDealForm(prev => ({ ...prev, stage: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="probability">{t('pipeline.probability')} (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={dealForm.probability}
                  onChange={(e) => setDealForm(prev => ({ ...prev, probability: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_close">{t('pipeline.expectedClose')}</Label>
              <Input
                id="expected_close"
                type="date"
                value={dealForm.expected_close}
                onChange={(e) => setDealForm(prev => ({ ...prev, expected_close: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('pipeline.notes')}</Label>
              <Textarea
                id="notes"
                value={dealForm.notes}
                onChange={(e) => setDealForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('pipeline.notesPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDealDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveDeal} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingDeal ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pipeline.deleteDeal')}</DialogTitle>
            <DialogDescription>
              {t('pipeline.deleteConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteDeal}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
