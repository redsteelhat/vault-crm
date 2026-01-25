import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { DealCard } from './DealCard'
import { useTranslation } from 'react-i18next'

interface PipelineStage {
  id: string
  name: string
  color: string
  order: number
}

interface Deal {
  id: string
  name: string
  value: number
  currency: string
  stage: string
  probability: number
  expected_close: string | null
  contact_name: string | null
  contact_company: string | null
  closed_at: string | null
  won: number | null
}

interface KanbanBoardProps {
  stages: PipelineStage[]
  deals: Deal[]
  onDealMove: (dealId: string, newStage: string) => void
  onDealView?: (id: string) => void
  onDealEdit?: (id: string) => void
  onDealClose?: (id: string, won: boolean) => void
  onDealDelete?: (id: string) => void
  onAddDeal?: (stage: string) => void
}

interface ColumnProps {
  stage: PipelineStage
  deals: Deal[]
  onDealView?: (id: string) => void
  onDealEdit?: (id: string) => void
  onDealClose?: (id: string, won: boolean) => void
  onDealDelete?: (id: string) => void
  onAddDeal?: (stage: string) => void
}

function KanbanColumn({
  stage,
  deals,
  onDealView,
  onDealEdit,
  onDealClose,
  onDealDelete,
  onAddDeal
}: ColumnProps) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const totalValue = deals.reduce((sum, d) => sum + d.value, 0)
  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value}`
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[280px] min-w-[280px] bg-muted/50 rounded-lg ${
        isOver ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
    >
      {/* Column Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-medium text-sm">{stage.name}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {deals.length}
            </span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {formatValue(totalValue)}
          </span>
        </div>
      </div>

      {/* Deals */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onView={onDealView}
                onEdit={onDealEdit}
                onClose={onDealClose}
                onDelete={onDealDelete}
              />
            ))}
          </div>
        </SortableContext>

        {deals.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            {t('pipeline.noDeals')}
          </div>
        )}
      </ScrollArea>

      {/* Add Deal Button */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => onAddDeal?.(stage.id)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('pipeline.addDeal')}
        </Button>
      </div>
    </div>
  )
}

export function KanbanBoard({
  stages,
  deals,
  onDealMove,
  onDealView,
  onDealEdit,
  onDealClose,
  onDealDelete,
  onAddDeal
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // We could add visual feedback here
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const dealId = active.id as string
    const overId = over.id as string

    // Check if dropped on a stage
    const targetStage = stages.find(s => s.id === overId)
    if (targetStage) {
      const deal = deals.find(d => d.id === dealId)
      if (deal && deal.stage !== targetStage.id) {
        onDealMove(dealId, targetStage.id)
      }
      return
    }

    // Check if dropped on another deal
    const overDeal = deals.find(d => d.id === overId)
    if (overDeal) {
      const deal = deals.find(d => d.id === dealId)
      if (deal && deal.stage !== overDeal.stage) {
        onDealMove(dealId, overDeal.stage)
      }
    }
  }

  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null
  const sortedStages = [...stages].sort((a, b) => a.order - b.order)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 overflow-x-auto min-h-[600px]">
        {sortedStages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={deals.filter(d => d.stage === stage.id)}
            onDealView={onDealView}
            onDealEdit={onDealEdit}
            onDealClose={onDealClose}
            onDealDelete={onDealDelete}
            onAddDeal={onAddDeal}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal && (
          <div className="rotate-3 scale-105">
            <DealCard deal={activeDeal} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
