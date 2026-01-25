import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, PhoneCall, Users, Mail } from 'lucide-react'

interface MonthlyData {
  month: string
  count: number
}

interface TypeData {
  type: 'note' | 'call' | 'meeting' | 'email'
  count: number
}

interface InteractionAnalyticsProps {
  monthlyData: MonthlyData[]
  typeData: TypeData[]
  className?: string
}

const TYPE_COLORS = {
  note: 'hsl(220, 70%, 50%)',
  call: 'hsl(160, 60%, 45%)',
  meeting: 'hsl(280, 65%, 55%)',
  email: 'hsl(30, 80%, 55%)'
}

const TYPE_ICONS = {
  note: MessageSquare,
  call: PhoneCall,
  meeting: Users,
  email: Mail
}

export function InteractionAnalyticsChart({
  monthlyData,
  typeData,
  className
}: InteractionAnalyticsProps) {
  const { t } = useTranslation()
  const [view, setView] = useState<'trend' | 'type'>('trend')

  const pieData = useMemo(() => {
    return typeData.map((item) => ({
      name: t(`interactions.${item.type}`),
      value: item.count,
      fill: TYPE_COLORS[item.type]
    }))
  }, [typeData, t])

  const total = useMemo(() => {
    return typeData.reduce((sum, item) => sum + item.count, 0)
  }, [typeData])

  return (
    <Card className={`border-none shadow-sm ${className || ''}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">
          {t('contactDetail.interactionAnalytics')}
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant={view === 'trend' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('trend')}
          >
            {t('common.trend')}
          </Button>
          <Button
            variant={view === 'type' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('type')}
          >
            {t('common.types')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          {view === 'trend' ? (
            monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                {t('common.noData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : total === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              {t('common.noData')}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-1/2 h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {typeData.map((item) => {
                  const Icon = TYPE_ICONS[item.type]
                  return (
                    <div key={item.type} className="flex items-center gap-2">
                      <div
                        className="p-1.5 rounded"
                        style={{ backgroundColor: TYPE_COLORS[item.type] + '20' }}
                      >
                        <Icon className="h-3 w-3" style={{ color: TYPE_COLORS[item.type] }} />
                      </div>
                      <span className="text-sm flex-1">{t(`interactions.${item.type}`)}</span>
                      <span className="text-sm font-medium">{item.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
