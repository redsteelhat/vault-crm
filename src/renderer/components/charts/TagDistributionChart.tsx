import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TagData {
  id: string
  name: string
  color: string
  count: number
}

interface TagDistributionChartProps {
  data: TagData[]
  title?: string
  className?: string
}

export function TagDistributionChart({ data, title, className }: TagDistributionChartProps) {
  const { t } = useTranslation()

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.count - a.count)
  }, [data])

  const maxCount = useMemo(() => {
    return Math.max(...data.map((d) => d.count), 1)
  }, [data])

  if (data.length === 0) {
    return (
      <Card className={`border-none shadow-sm ${className || ''}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            {title || t('dashboard.tagDistribution')}
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
          {title || t('dashboard.tagDistribution')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedData.slice(0, 6).map((tag) => (
            <div key={tag.id} className="flex items-center gap-3">
              <Badge
                style={{ backgroundColor: tag.color + '20', color: tag.color }}
                className="min-w-[80px] justify-center"
              >
                {tag.name}
              </Badge>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(tag.count / maxCount) * 100}%`,
                    backgroundColor: tag.color
                  }}
                />
              </div>
              <span className="text-sm font-medium w-8 text-right">{tag.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
