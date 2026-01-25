import { useState, useEffect } from 'react'
import { Users, ArrowRight, Check, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/useToast'

interface Contact {
  id: string
  name: string
  company: string | null
  title: string | null
  emails: string
  phones: string
  location: string | null
  source: string | null
  notes: string | null
  last_contact_at: string | null
  created_at: string
}

interface DuplicatePair {
  contact1: Contact
  contact2: Contact
  matchType: 'email' | 'phone' | 'name'
  similarity: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMergeComplete: () => void
}

export function DuplicateMergeDialog({ open, onOpenChange, onMergeComplete }: Props) {
  const { toast } = useToast()
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMerging, setIsMerging] = useState(false)
  const [mergeChoices, setMergeChoices] = useState<Record<string, 'left' | 'right'>>({})

  useEffect(() => {
    if (open) {
      findDuplicates()
    }
  }, [open])

  const findDuplicates = async () => {
    setIsLoading(true)
    try {
      const contacts = await window.api.contacts.getAll()
      const pairs: DuplicatePair[] = []

      // Find duplicates by email
      const emailMap = new Map<string, Contact[]>()
      for (const contact of contacts) {
        const emails = parseJsonArray(contact.emails)
        for (const email of emails) {
          const normalized = email.toLowerCase().trim()
          if (!emailMap.has(normalized)) {
            emailMap.set(normalized, [])
          }
          emailMap.get(normalized)!.push(contact)
        }
      }

      for (const [, matches] of emailMap) {
        if (matches.length > 1) {
          for (let i = 0; i < matches.length - 1; i++) {
            pairs.push({
              contact1: matches[i],
              contact2: matches[i + 1],
              matchType: 'email',
              similarity: 100
            })
          }
        }
      }

      // Find duplicates by phone
      const phoneMap = new Map<string, Contact[]>()
      for (const contact of contacts) {
        const phones = parseJsonArray(contact.phones)
        for (const phone of phones) {
          const normalized = phone.replace(/\D/g, '') // Only digits
          if (normalized.length >= 7) {
            if (!phoneMap.has(normalized)) {
              phoneMap.set(normalized, [])
            }
            phoneMap.get(normalized)!.push(contact)
          }
        }
      }

      for (const [, matches] of phoneMap) {
        if (matches.length > 1) {
          for (let i = 0; i < matches.length - 1; i++) {
            // Skip if already found by email
            const exists = pairs.some(
              p =>
                (p.contact1.id === matches[i].id && p.contact2.id === matches[i + 1].id) ||
                (p.contact1.id === matches[i + 1].id && p.contact2.id === matches[i].id)
            )
            if (!exists) {
              pairs.push({
                contact1: matches[i],
                contact2: matches[i + 1],
                matchType: 'phone',
                similarity: 100
              })
            }
          }
        }
      }

      // Find similar names (Levenshtein distance)
      for (let i = 0; i < contacts.length; i++) {
        for (let j = i + 1; j < contacts.length; j++) {
          const distance = levenshtein(
            contacts[i].name.toLowerCase(),
            contacts[j].name.toLowerCase()
          )
          const maxLen = Math.max(contacts[i].name.length, contacts[j].name.length)
          const similarity = Math.round(((maxLen - distance) / maxLen) * 100)

          if (distance <= 2 && similarity >= 80) {
            // Skip if already found
            const exists = pairs.some(
              p =>
                (p.contact1.id === contacts[i].id && p.contact2.id === contacts[j].id) ||
                (p.contact1.id === contacts[j].id && p.contact2.id === contacts[i].id)
            )
            if (!exists) {
              pairs.push({
                contact1: contacts[i],
                contact2: contacts[j],
                matchType: 'name',
                similarity
              })
            }
          }
        }
      }

      setDuplicates(pairs)
      setCurrentIndex(0)
      
      // Set default choices (prefer newer contact)
      const defaultChoices: Record<string, 'left' | 'right'> = {}
      for (const pair of pairs) {
        const left = new Date(pair.contact1.created_at)
        const right = new Date(pair.contact2.created_at)
        defaultChoices[pair.contact1.id + '-' + pair.contact2.id] = right > left ? 'right' : 'left'
      }
      setMergeChoices(defaultChoices)
    } catch (error) {
      console.error('Failed to find duplicates:', error)
      toast({ title: 'Failed to scan for duplicates', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMerge = async () => {
    if (duplicates.length === 0) return

    const currentPair = duplicates[currentIndex]
    const pairKey = currentPair.contact1.id + '-' + currentPair.contact2.id
    const choice = mergeChoices[pairKey] || 'left'

    const keepContact = choice === 'left' ? currentPair.contact1 : currentPair.contact2
    const deleteContact = choice === 'left' ? currentPair.contact2 : currentPair.contact1

    setIsMerging(true)
    try {
      // Merge data from deleted contact into kept contact
      const mergedEmails = mergeJsonArrays(keepContact.emails, deleteContact.emails)
      const mergedPhones = mergeJsonArrays(keepContact.phones, deleteContact.phones)
      const mergedNotes = [keepContact.notes, deleteContact.notes].filter(Boolean).join('\n\n---\n\n')

      await window.api.contacts.update(keepContact.id, {
        emails: mergedEmails,
        phones: mergedPhones,
        notes: mergedNotes || null,
        company: keepContact.company || deleteContact.company,
        title: keepContact.title || deleteContact.title,
        location: keepContact.location || deleteContact.location
      })

      // Delete the duplicate
      await window.api.contacts.delete(deleteContact.id)

      toast({ title: 'Contacts merged successfully' })

      // Move to next pair or close
      if (currentIndex < duplicates.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        onMergeComplete()
        onOpenChange(false)
      }
    } catch (error) {
      toast({ title: 'Failed to merge contacts', variant: 'destructive' })
    } finally {
      setIsMerging(false)
    }
  }

  const handleSkip = () => {
    if (currentIndex < duplicates.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onOpenChange(false)
    }
  }

  const currentPair = duplicates[currentIndex]
  const pairKey = currentPair ? currentPair.contact1.id + '-' + currentPair.contact2.id : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Find & Merge Duplicates
          </DialogTitle>
          <DialogDescription>
            {isLoading
              ? 'Scanning for duplicates...'
              : duplicates.length === 0
              ? 'No duplicates found'
              : `Found ${duplicates.length} potential duplicate${duplicates.length > 1 ? 's' : ''}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Scanning contacts...</div>
          </div>
        ) : duplicates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
              <Check className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-lg font-medium">No Duplicates Found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your contact list is clean!
            </p>
          </div>
        ) : currentPair ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <Badge variant="secondary">
                {currentIndex + 1} of {duplicates.length}
              </Badge>
              <Badge
                variant={
                  currentPair.matchType === 'email'
                    ? 'default'
                    : currentPair.matchType === 'phone'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {currentPair.matchType === 'email' && 'Same Email'}
                {currentPair.matchType === 'phone' && 'Same Phone'}
                {currentPair.matchType === 'name' && `${currentPair.similarity}% Similar Name`}
              </Badge>
            </div>

            <RadioGroup
              value={mergeChoices[pairKey] || 'left'}
              onValueChange={(v) =>
                setMergeChoices({ ...mergeChoices, [pairKey]: v as 'left' | 'right' })
              }
            >
              <div className="grid grid-cols-2 gap-4">
                {/* Left Contact */}
                <Label
                  htmlFor="left"
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                    mergeChoices[pairKey] === 'left' || !mergeChoices[pairKey]
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="left" id="left" className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{currentPair.contact1.name}</p>
                      {currentPair.contact1.company && (
                        <p className="text-sm text-muted-foreground truncate">
                          {currentPair.contact1.company}
                        </p>
                      )}
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p>📧 {parseJsonArray(currentPair.contact1.emails).join(', ') || 'No email'}</p>
                        <p>📱 {parseJsonArray(currentPair.contact1.phones).join(', ') || 'No phone'}</p>
                        <p>📅 Created: {new Date(currentPair.contact1.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </Label>

                {/* Right Contact */}
                <Label
                  htmlFor="right"
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                    mergeChoices[pairKey] === 'right'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="right" id="right" className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{currentPair.contact2.name}</p>
                      {currentPair.contact2.company && (
                        <p className="text-sm text-muted-foreground truncate">
                          {currentPair.contact2.company}
                        </p>
                      )}
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p>📧 {parseJsonArray(currentPair.contact2.emails).join(', ') || 'No email'}</p>
                        <p>📱 {parseJsonArray(currentPair.contact2.phones).join(', ') || 'No phone'}</p>
                        <p>📅 Created: {new Date(currentPair.contact2.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-4">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-600">
                The selected contact will be kept. Data from the other will be merged in, then it will be deleted.
              </p>
            </div>
          </>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {duplicates.length > 0 && currentPair && (
            <>
              <Button variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
              <Button onClick={handleMerge} disabled={isMerging}>
                {isMerging ? 'Merging...' : 'Merge & Keep Selected'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper functions
function parseJsonArray(json: string | null): string[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function mergeJsonArrays(json1: string, json2: string): string {
  const arr1 = parseJsonArray(json1)
  const arr2 = parseJsonArray(json2)
  const merged = [...new Set([...arr1, ...arr2])]
  return JSON.stringify(merged)
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}
