import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ActivityData {
  date: string
  count: number
  label: string
}

interface ActivityChartProps {
  data: ActivityData[]
  title?: string
  className?: string
}

export function ActivityChart({ data, title, className }: ActivityChartProps) {
  const { t } = useTranslation()

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      fill: item.count > 5 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.6)'
    }))
  }, [data])

  const maxValue = useMemo(() => {
    return Math.max(...data.map((d) => d.count), 1)
  }, [data])

  return (
    <Card className={`border-none shadow-sm ${className || ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {title || t('dashboard.activityChart')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
                domain={[0, maxValue + 2]}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [value, t('dashboard.interactions')]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
