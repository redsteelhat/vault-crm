import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Linkedin, User, Building, MapPin, Briefcase, AlertCircle, CheckCircle, ClipboardPaste } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { parseLinkedInText, validateLinkedInData, type LinkedInData } from '@/lib/linkedin-parser'
import { cn } from '@/lib/utils'

interface LinkedInParserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: {
    name: string
    title?: string
    company?: string
    location?: string
    notes?: string
    emails?: string[]
    source: string
  }) => void
}

export function LinkedInParser({ open, onOpenChange, onImport }: LinkedInParserProps) {
  const { t } = useTranslation()
  const [pastedText, setPastedText] = useState('')
  const [parsedData, setParsedData] = useState<LinkedInData | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Editable fields
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  // Parse text when it changes
  useEffect(() => {
    if (pastedText.trim().length > 10) {
      const data = parseLinkedInText(pastedText)
      setParsedData(data)
      
      // Populate editable fields
      setName(data.name || '')
      setTitle(data.title || '')
      setCompany(data.company || '')
      setLocation(data.location || '')
      setEmail(data.email || '')
      setNotes(data.about || data.headline || '')
    } else {
      setParsedData(null)
    }
  }, [pastedText])

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setPastedText('')
      setParsedData(null)
      setIsEditing(false)
      setName('')
      setTitle('')
      setCompany('')
      setLocation('')
      setEmail('')
      setNotes('')
    }
  }, [open])

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setPastedText(text)
    } catch {
      // Clipboard access denied
      console.error('Clipboard access denied')
    }
  }

  const handleImport = () => {
    if (!name.trim()) return

    onImport({
      name: name.trim(),
      title: title.trim() || undefined,
      company: company.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      emails: email.trim() ? [email.trim()] : undefined,
      source: 'linkedin'
    })

    onOpenChange(false)
  }

  const validation = parsedData ? validateLinkedInData(parsedData) : null
  const confidence = parsedData?.confidence || 0

  const getConfidenceColor = (conf: number) => {
    if (conf >= 70) return 'text-emerald-500'
    if (conf >= 40) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0A66C2]" />
            {t('linkedin.title')}
          </DialogTitle>
          <DialogDescription>
            {t('linkedin.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Paste Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('linkedin.pasteProfile')}</Label>
              <Button variant="outline" size="sm" onClick={handlePaste}>
                <ClipboardPaste className="h-4 w-4 mr-2" />
                {t('linkedin.pasteFromClipboard')}
              </Button>
            </div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={t('linkedin.placeholder')}
              className="w-full h-32 p-3 rounded-md border bg-background resize-none font-mono text-sm"
            />
          </div>

          {/* Confidence Score */}
          {parsedData && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                {confidence >= 50 ? (
                  <CheckCircle className={cn('h-5 w-5', getConfidenceColor(confidence))} />
                ) : (
                  <AlertCircle className={cn('h-5 w-5', getConfidenceColor(confidence))} />
                )}
                <span className={cn('font-medium', getConfidenceColor(confidence))}>
                  {confidence}% {t('linkedin.confidence')}
                </span>
              </div>
              {validation && validation.issues.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {validation.issues.map((issue, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {issue}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Parsed Results */}
          {parsedData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">{t('linkedin.extractedData')}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? t('common.close') : t('common.edit')}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" /> {t('contacts.fields.name')}
                  </Label>
                  {isEditing ? (
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('contacts.fields.name')}
                    />
                  ) : (
                    <p className={cn('p-2 rounded bg-muted/50', !name && 'text-muted-foreground italic')}>
                      {name || t('linkedin.notDetected')}
                    </p>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> {t('contacts.fields.title')}
                  </Label>
                  {isEditing ? (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('contacts.fields.title')}
                    />
                  ) : (
                    <p className={cn('p-2 rounded bg-muted/50', !title && 'text-muted-foreground italic')}>
                      {title || t('linkedin.notDetected')}
                    </p>
                  )}
                </div>

                {/* Company */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building className="h-4 w-4" /> {t('contacts.fields.company')}
                  </Label>
                  {isEditing ? (
                    <Input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder={t('contacts.fields.company')}
                    />
                  ) : (
                    <p className={cn('p-2 rounded bg-muted/50', !company && 'text-muted-foreground italic')}>
                      {company || t('linkedin.notDetected')}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {t('contacts.fields.location')}
                  </Label>
                  {isEditing ? (
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={t('contacts.fields.location')}
                    />
                  ) : (
                    <p className={cn('p-2 rounded bg-muted/50', !location && 'text-muted-foreground italic')}>
                      {location || t('linkedin.notDetected')}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2 col-span-2">
                  <Label className="flex items-center gap-2">
                    {t('contacts.fields.email')}
                  </Label>
                  {isEditing ? (
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('contacts.fields.email')}
                      type="email"
                    />
                  ) : (
                    <p className={cn('p-2 rounded bg-muted/50', !email && 'text-muted-foreground italic')}>
                      {email || t('linkedin.notDetected')}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2 col-span-2">
                  <Label>{t('contacts.fields.notes')}</Label>
                  {isEditing ? (
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('contacts.fields.notes')}
                      className="w-full h-20 p-2 rounded-md border bg-background resize-none"
                    />
                  ) : (
                    <p className={cn('p-2 rounded bg-muted/50 max-h-20 overflow-y-auto', !notes && 'text-muted-foreground italic')}>
                      {notes || t('linkedin.notDetected')}
                    </p>
                  )}
                </div>
              </div>

              {/* Source Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('contacts.fields.source')}:</span>
                <Badge variant="secondary" className="bg-[#0A66C2]/10 text-[#0A66C2]">
                  <Linkedin className="h-3 w-3 mr-1" />
                  LinkedIn
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!name.trim()}
            className="bg-[#0A66C2] hover:bg-[#004182]"
          >
            <Linkedin className="h-4 w-4 mr-2" />
            {t('linkedin.importContact')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
