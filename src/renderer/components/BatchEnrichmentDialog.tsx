import { useState, useEffect } from 'react'
import { X, Pause, Play, Square, CheckCircle, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
// Simple progress bar component
const Progress = ({ value }: { value: number }) => (
  <div className="w-full bg-muted rounded-full h-2">
    <div
      className="bg-primary h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
)
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface BatchEnrichmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactIds: string[]
  onComplete?: (results: Record<string, any>, errors: string[]) => void
}

export function BatchEnrichmentDialog({
  open,
  onOpenChange,
  contactIds,
  onComplete
}: BatchEnrichmentDialogProps) {
  const [processed, setProcessed] = useState(0)
  const [total, setTotal] = useState(contactIds.length)
  const [current, setCurrent] = useState<string>('')
  const [status, setStatus] = useState<'running' | 'paused' | 'completed' | 'cancelled'>('running')
  const [results, setResults] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (open && contactIds.length > 0) {
      startBatch()
    }
  }, [open])

  useEffect(() => {
    setTotal(contactIds.length)
  }, [contactIds])

  const startBatch = async () => {
    setProcessed(0)
    setCurrent('')
    setStatus('running')
    setResults({})
    setErrors([])

    try {
      await window.api.enrichment.startBatch(contactIds, { concurrency: 3 })
    } catch (error) {
      console.error('Failed to start batch:', error)
      setStatus('cancelled')
    }
  }

  useEffect(() => {
    if (!open) return

    const handleProgress = (_event: any, data: { processed: number; total: number; current: string }) => {
      setProcessed(data.processed)
      setTotal(data.total)
      setCurrent(data.current)
    }

    const handleDone = (_event: any, data: { results: Record<string, any>; errors: string[] }) => {
      setResults(data.results)
      setErrors(data.errors)
      setStatus('completed')
      if (onComplete) {
        onComplete(data.results, data.errors)
      }
    }

    const handleError = (_event: any, data: { error: string }) => {
      console.error('Batch enrichment error:', data.error)
      setStatus('cancelled')
    }

    window.api.on('enrichment:batchProgress', handleProgress)
    window.api.on('enrichment:batchDone', handleDone)
    window.api.on('enrichment:batchError', handleError)

    return () => {
      // Cleanup listeners
      // Note: In a real implementation, you might want to remove listeners
    }
  }, [open, onComplete])

  const handlePause = async () => {
    try {
      const result = await window.api.enrichment.pauseBatch()
      if (result.success) {
        setStatus('paused')
      }
    } catch (error) {
      console.error('Failed to pause batch:', error)
    }
  }

  const handleResume = async () => {
    try {
      const result = await window.api.enrichment.resumeBatch()
      if (result.success) {
        setStatus('running')
      }
    } catch (error) {
      console.error('Failed to resume batch:', error)
    }
  }

  const handleCancel = async () => {
    try {
      const result = await window.api.enrichment.cancelBatch()
      if (result.success) {
        setStatus('cancelled')
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Failed to cancel batch:', error)
    }
  }

  const progress = total > 0 ? (processed / total) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch Enrichment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Processing {processed} of {total} contacts
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
            {current && (
              <p className="text-sm text-muted-foreground">Current: {current}</p>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant={
                status === 'completed'
                  ? 'default'
                  : status === 'cancelled'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {status === 'running' && 'Running'}
              {status === 'paused' && 'Paused'}
              {status === 'completed' && 'Completed'}
              {status === 'cancelled' && 'Cancelled'}
            </Badge>
          </div>

          {/* Controls */}
          {status === 'running' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePause}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <Square className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}

          {status === 'paused' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleResume}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <Square className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}

          {/* Results Summary */}
          {status === 'completed' && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Success: {Object.keys(results).length}</span>
                </div>
                {errors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span>Errors: {errors.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Close Button */}
          {status === 'completed' && (
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
