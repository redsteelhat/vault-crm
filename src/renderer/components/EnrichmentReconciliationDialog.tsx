import { useState } from 'react'
import { Check, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'

interface EnrichmentResult {
  favicon?: string
  logo?: string
  companyName?: string
  domain?: string
}

interface EnrichmentReconciliationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  results: Record<string, EnrichmentResult>
  contactNames: Record<string, string>
  onApply: (applied: Record<string, EnrichmentResult>) => void
}

export function EnrichmentReconciliationDialog({
  open,
  onOpenChange,
  results,
  contactNames,
  onApply
}: EnrichmentReconciliationDialogProps) {
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [skipped, setSkipped] = useState<Set<string>>(new Set())

  const handleApply = (contactId: string) => {
    const newApplied = new Set(applied)
    newApplied.add(contactId)
    setApplied(newApplied)
    const newSkipped = new Set(skipped)
    newSkipped.delete(contactId)
    setSkipped(newSkipped)
  }

  const handleSkip = (contactId: string) => {
    const newSkipped = new Set(skipped)
    newSkipped.add(contactId)
    setSkipped(newSkipped)
    const newApplied = new Set(applied)
    newApplied.delete(contactId)
    setApplied(newApplied)
  }

  const handleApplyAll = () => {
    const allIds = new Set(Object.keys(results))
    setApplied(allIds)
    setSkipped(new Set())
  }

  const handleConfirm = () => {
    const appliedResults: Record<string, EnrichmentResult> = {}
    applied.forEach((contactId) => {
      if (results[contactId]) {
        appliedResults[contactId] = results[contactId]
      }
    })
    onApply(appliedResults)
    onOpenChange(false)
  }

  const hasConflicts = Object.entries(results).some(([contactId, result]) => {
    // Check if contact already has company name (conflict)
    // This would require fetching contact data, simplified here
    return false
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Review Enrichment Results</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Review and apply enrichment suggestions for {Object.keys(results).length} contacts
            </p>
            <Button variant="outline" size="sm" onClick={handleApplyAll}>
              Apply All
            </Button>
          </div>

          {hasConflicts && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <p className="text-sm text-amber-500">
                Some contacts already have company information. Review conflicts before applying.
              </p>
            </div>
          )}

          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {Object.entries(results).map(([contactId, result]) => {
                const isApplied = applied.has(contactId)
                const isSkipped = skipped.has(contactId)
                const contactName = contactNames[contactId] || contactId

                return (
                  <Card key={contactId} className="border-none shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{contactName}</h4>
                            {isApplied && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Applied
                              </Badge>
                            )}
                            {isSkipped && (
                              <Badge variant="secondary" className="text-xs">
                                Skipped
                              </Badge>
                            )}
                          </div>

                          {result.companyName && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Company:</span>
                              <span className="font-medium">{result.companyName}</span>
                            </div>
                          )}

                          {result.logo && (
                            <div className="flex items-center gap-2">
                              <img
                                src={result.logo}
                                alt="Company logo"
                                className="w-8 h-8 rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                              <span className="text-xs text-muted-foreground">Logo available</span>
                            </div>
                          )}

                          {result.favicon && !result.logo && (
                            <div className="flex items-center gap-2">
                              <img
                                src={result.favicon}
                                alt="Favicon"
                                className="w-4 h-4"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                              <span className="text-xs text-muted-foreground">Favicon available</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!isApplied && !isSkipped && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApply(contactId)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Apply
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSkip(contactId)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Skip
                              </Button>
                            </>
                          )}
                          {isApplied && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSkip(contactId)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Undo
                            </Button>
                          )}
                          {isSkipped && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApply(contactId)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Apply
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={applied.size === 0}>
            Apply {applied.size} {applied.size === 1 ? 'Change' : 'Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
