import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { 
  MoreHorizontal, 
  User, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  XCircle,
  Eye,
  Pencil,
  Trash2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'

interface Deal {
  id: string
  name: string
  value: number
  currency: string
  probability: number
  expected_close: string | null
  contact_name: string | null
  contact_company: string | null
  closed_at: string | null
  won: number | null
}

interface DealCardProps {
  deal: Deal
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onClose?: (id: string, won: boolean) => void
  onDelete?: (id: string) => void
}

export function DealCard({ deal, onView, onEdit, onClose, onDelete }: DealCardProps) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const isClosed = deal.closed_at !== null

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-primary/50' : ''
      } ${isClosed ? 'opacity-75' : ''}`}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{deal.name}</h4>
            {deal.contact_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <User className="h-3 w-3" />
                <span className="truncate">{deal.contact_name}</span>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView?.(deal.id)}>
                <Eye className="h-4 w-4 mr-2" />
                {t('common.view')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(deal.id)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('common.edit')}
              </DropdownMenuItem>
              {!isClosed && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onClose?.(deal.id, true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    {t('pipeline.markWon')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onClose?.(deal.id, false)}>
                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                    {t('pipeline.markLost')}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(deal.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 space-y-2">
          {/* Value */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <DollarSign className="h-3.5 w-3.5" />
              {formatCurrency(deal.value, deal.currency)}
            </div>
            <Badge variant="outline" className="text-xs">
              {deal.probability}%
            </Badge>
          </div>

          {/* Expected Close */}
          {deal.expected_close && !isClosed && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(deal.expected_close), 'MMM d, yyyy')}
            </div>
          )}

          {/* Closed status */}
          {isClosed && (
            <Badge 
              variant={deal.won ? 'default' : 'destructive'} 
              className="text-xs w-full justify-center"
            >
              {deal.won ? t('pipeline.won') : t('pipeline.lost')}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
