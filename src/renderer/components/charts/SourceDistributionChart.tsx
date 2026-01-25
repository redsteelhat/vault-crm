import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SourceData {
  source: string
  count: number
}

interface SourceDistributionChartProps {
  data: SourceData[]
  title?: string
  className?: string
}

const COLORS = [
  'hsl(220, 70%, 50%)',
  'hsl(160, 60%, 45%)',
  'hsl(280, 65%, 55%)',
  'hsl(30, 80%, 55%)',
  'hsl(340, 75%, 55%)',
  'hsl(180, 60%, 45%)',
  'hsl(45, 85%, 50%)',
  'hsl(200, 70%, 50%)'
]

export function SourceDistributionChart({ data, title, className }: SourceDistributionChartProps) {
  const { t } = useTranslation()

  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      name: item.source || t('dashboard.unknown'),
      value: item.count,
      fill: COLORS[index % COLORS.length]
    }))
  }, [data, t])

  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + item.count, 0)
  }, [data])

  if (data.length === 0) {
    return (
      <Card className={`border-none shadow-sm ${className || ''}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            {title || t('dashboard.sourceDistribution')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            {t('common.noData')}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-none shadow-sm ${className || ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {title || t('dashboard.sourceDistribution')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
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
                formatter={(value: number) => [
                  `${value} (${((value / total) * 100).toFixed(1)}%)`,
                  t('contacts.title')
                ]}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
