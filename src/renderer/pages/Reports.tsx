import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  Users,
  Calendar,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'

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

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e']

export default function Reports() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [stages, setStages] = useState<PipelineStage[]>([])

  // Pipeline Stats
  const [pipelineStats, setPipelineStats] = useState({
    totalDeals: 0,
    totalValue: 0,
    weightedValue: 0,
    closedStats: { won: { count: 0, value: 0 }, lost: { count: 0, value: 0 }, winRate: 0 }
  })

  // Funnel data
  const [funnelData, setFunnelData] = useState<{ name: string; value: number; count: number; fill: string }[]>([])

  // Activity data
  const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([])

  // Contact stats
  const [contactStats, setContactStats] = useState({
    total: 0,
    thisMonth: 0,
    bySource: [] as { source: string; count: number }[]
  })

  // Tasks stats
  const [taskStats, setTaskStats] = useState({
    open: 0,
    overdue: 0,
    completed: 0
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api

      // Load pipelines
      const pipelinesData = await api.pipelines.getAll()
      setPipelines(pipelinesData)

      if (pipelinesData.length > 0) {
        const defaultPipeline = pipelinesData.find(p => p.is_default === 1) || pipelinesData[0]
        setSelectedPipeline(defaultPipeline.id)
      }

      // Load contact stats
      const [totalContacts, thisMonthContacts, sourceDistribution] = await Promise.all([
        api.contacts.getCount(),
        api.contacts.getCreatedThisMonth(),
        api.contacts.getSourceDistribution()
      ])
      setContactStats({
        total: totalContacts,
        thisMonth: thisMonthContacts,
        bySource: sourceDistribution
      })

      // Load task stats
      const taskCount = await api.tasks.getCount()
      setTaskStats(taskCount)

      // Load activity data (last 12 months)
      const interactionData = await api.interactions.getMonthlyCounts(12)
      setActivityData(interactionData.map(d => ({
        date: d.month,
        count: d.count
      })))
    } catch (error) {
      console.error('Error loading reports:', error)
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
    if (!pipelineId) return

    try {
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api

      // Load stages
      const stagesData = await api.pipelines.getStages(pipelineId)
      setStages(stagesData)

      // Load pipeline stats
      const [stats, weightedValue, closedStats] = await Promise.all([
        api.pipelines.getStats(pipelineId),
        api.deals.getWeightedValue(pipelineId),
        api.deals.getClosedStats(pipelineId, 30)
      ])

      setPipelineStats({
        totalDeals: stats.totalDeals,
        totalValue: stats.totalValue,
        weightedValue,
        closedStats
      })

      // Create funnel data
      const funnel = stagesData
        .filter(s => !s.id.includes('closed'))
        .sort((a, b) => a.order - b.order)
        .map((stage, index) => {
          const stageStats = stats.byStage.find(s => s.stage === stage.id)
          return {
            name: stage.name,
            value: stageStats?.value || 0,
            count: stageStats?.count || 0,
            fill: COLORS[index % COLORS.length]
          }
        })
      setFunnelData(funnel)
    } catch (error) {
      console.error('Error loading pipeline data:', error)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (selectedPipeline) {
      loadPipelineData(selectedPipeline)
    }
  }, [selectedPipeline, loadPipelineData])

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
        <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
        <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('pipeline.selectPipeline')} />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              {t('reports.openDeals')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipelineStats.totalDeals}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(pipelineStats.totalValue)} {t('reports.totalValue')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('reports.weightedForecast')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(pipelineStats.weightedValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('reports.basedOnProbability')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('reports.winRate')} (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {pipelineStats.closedStats.winRate.toFixed(0)}%
              </span>
              {pipelineStats.closedStats.winRate > 50 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {pipelineStats.closedStats.won.count} {t('pipeline.won')} / {pipelineStats.closedStats.lost.count} {t('pipeline.lost')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('reports.contacts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contactStats.total}</div>
            <p className="text-xs text-muted-foreground">
              +{contactStats.thisMonth} {t('reports.thisMonth')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">{t('reports.pipelineAnalytics')}</TabsTrigger>
          <TabsTrigger value="activity">{t('reports.activityAnalytics')}</TabsTrigger>
          <TabsTrigger value="contacts">{t('reports.contactAnalytics')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pipeline Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.pipelineFunnel')}</CardTitle>
              </CardHeader>
              <CardContent>
                {funnelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={funnelData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), t('reports.value')]}
                      />
                      <Bar dataKey="value" fill="#6366f1">
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {t('reports.noData')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deals by Stage */}
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.dealsByStage')}</CardTitle>
              </CardHeader>
              <CardContent>
                {funnelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [value, t('reports.deals')]}
                      />
                      <Bar dataKey="count" fill="#6366f1">
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {t('reports.noData')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Win/Loss Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.winLossAnalysis')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">
                    {formatCurrency(pipelineStats.closedStats.won.value)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pipelineStats.closedStats.won.count} {t('reports.dealsWon')} (30d)
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-600">
                    {formatCurrency(pipelineStats.closedStats.lost.value)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pipelineStats.closedStats.lost.count} {t('reports.dealsLost')} (30d)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {/* Activity Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.activityOverTime')}</CardTitle>
            </CardHeader>
            <CardContent>
              {activityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name={t('reports.interactions')}
                      stroke="#6366f1"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t('reports.noData')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{taskStats.open}</div>
                  <p className="text-sm text-muted-foreground mt-1">{t('tasks.statusOpen')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{taskStats.overdue}</div>
                  <p className="text-sm text-muted-foreground mt-1">{t('tasks.overdue')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{taskStats.completed}</div>
                  <p className="text-sm text-muted-foreground mt-1">{t('tasks.completed')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          {/* Contact Sources */}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.contactsBySource')}</CardTitle>
            </CardHeader>
            <CardContent>
              {contactStats.bySource.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={contactStats.bySource.map((s, i) => ({
                        ...s,
                        name: s.source || 'Unknown'
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      dataKey="count"
                    >
                      {contactStats.bySource.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t('reports.noData')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
