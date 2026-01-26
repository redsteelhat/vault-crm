import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  Sparkles, 
  FileText, 
  CalendarClock, 
  Tag, 
  Briefcase, 
  Mail,
  Copy,
  Check,
  Loader2,
  Settings,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/useToast'
import { Link } from 'react-router-dom'

interface AIAssistPanelProps {
  contactId: string
  contactName: string
  company?: string | null
  recentInteractions: string[]
  existingTags: string[]
  lastContactDate?: string | null
}

type ToolType = 'summarize' | 'followup' | 'tags' | 'meeting' | 'email' | null

export function AIAssistPanel({
  contactId,
  contactName,
  company,
  recentInteractions,
  existingTags,
  lastContactDate
}: AIAssistPanelProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [activeTool, setActiveTool] = useState<ToolType>(null)
  const [loading, setLoading] = useState(false)
  
  // Tool results
  const [summaryResult, setSummaryResult] = useState<string>('')
  const [followUpResult, setFollowUpResult] = useState<string>('')
  const [tagsResult, setTagsResult] = useState<string[]>([])
  const [meetingPrepResult, setMeetingPrepResult] = useState<string>('')
  const [emailResult, setEmailResult] = useState<{ subject: string; body: string } | null>(null)
  
  // Email tool inputs
  const [emailPurpose, setEmailPurpose] = useState('')
  const [emailTone, setEmailTone] = useState<'formal' | 'friendly' | 'casual'>('friendly')
  
  // Meeting prep input
  const [meetingPurpose, setMeetingPurpose] = useState('')

  useEffect(() => {
    checkAIAvailability()
    loadAIConfig()
  }, [])

  const loadAIConfig = async () => {
    try {
      const config = await window.api.ai.getConfig()
      setAiMode(config.provider === 'local' ? 'local' : config.provider === 'openai' || config.provider === 'anthropic' ? 'cloud' : 'off')
    } catch {
      setAiMode('off')
    }
  }

  const checkAIAvailability = async () => {
    try {
      const available = await window.api.ai.checkLocalAvailable()
      setIsAvailable(available)
    } catch {
      setIsAvailable(false)
    }
  }

  const handleSummarize = async () => {
    if (recentInteractions.length === 0) {
      toast({ title: 'No notes to summarize', variant: 'destructive' })
      return
    }

    setActiveTool('summarize')
    setLoading(true)
    try {
      const result = await window.api.ai.summarizeNotes(recentInteractions)
      setSummaryResult(result)
    } catch (error) {
      toast({ title: 'Failed to summarize notes', variant: 'destructive' })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestFollowUp = async () => {
    setActiveTool('followup')
    setLoading(true)
    try {
      const result = await window.api.ai.suggestFollowUp({
        contactName,
        recentInteractions,
        lastContactDate: lastContactDate || undefined
      })
      setFollowUpResult(result)
    } catch (error) {
      toast({ title: 'Failed to suggest follow-up', variant: 'destructive' })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestTags = async () => {
    if (recentInteractions.length === 0) {
      toast({ title: 'No notes to analyze', variant: 'destructive' })
      return
    }

    setActiveTool('tags')
    setLoading(true)
    try {
      const notes = recentInteractions.join('\n')
      const result = await window.api.ai.suggestTags(notes, existingTags.map(t => t.name))
      setTagsResult(result)
    } catch (error) {
      toast({ title: 'Failed to suggest tags', variant: 'destructive' })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleMeetingPrep = async () => {
    setActiveTool('meeting')
    setLoading(true)
    try {
      const result = await window.api.ai.meetingPrep({
        contactName,
        company: company || undefined,
        meetingPurpose: meetingPurpose || undefined,
        recentNotes: recentInteractions
      })
      setMeetingPrepResult(result)
    } catch (error) {
      toast({ title: 'Failed to generate meeting prep', variant: 'destructive' })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDraftEmail = async () => {
    if (!emailPurpose.trim()) {
      toast({ title: 'Please enter email purpose', variant: 'destructive' })
      return
    }

    setActiveTool('email')
    setLoading(true)
    try {
      const result = await window.api.ai.draftEmail({
        contactName,
        purpose: emailPurpose,
        tone: emailTone
      })
      setEmailResult(result)
    } catch (error) {
      toast({ title: 'Failed to draft email', variant: 'destructive' })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }

  const handleSaveAsNote = async (text: string) => {
    try {
      await window.api.interactions.create({
        contact_id: contactId,
        type: 'note',
        body: text,
        occurred_at: new Date().toISOString()
      })
      toast({ title: 'Saved as interaction note', variant: 'success' })
    } catch (error) {
      toast({ title: 'Failed to save note', variant: 'destructive' })
    }
  }

  const handleApplyTags = async (tagNames: string[]) => {
    try {
      const tagsToAdd = existingTags.filter(t => tagNames.includes(t.name))
      for (const tag of tagsToAdd) {
        await window.api.contacts.addTag(contactId, tag.id)
      }
      toast({ title: `Applied ${tagsToAdd.length} tag(s)`, variant: 'success' })
      setTagsResult([])
    } catch (error) {
      toast({ title: 'Failed to apply tags', variant: 'destructive' })
    }
  }

  if (isAvailable === null) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isAvailable === false) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Assist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 p-4 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">AI not available</p>
            <p className="text-xs text-muted-foreground">
              Configure AI in Settings to use AI features
            </p>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Open Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Assist
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={aiMode === 'local' ? 'default' : aiMode === 'cloud' ? 'secondary' : 'outline'}>
            {aiMode === 'local' && 'Local'}
            {aiMode === 'cloud' && 'Cloud'}
            {aiMode === 'off' && 'Off'}
          </Badge>
          {aiMode === 'cloud' && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Data will be sent to cloud
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-2">
            {/* Summarize Notes */}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleSummarize}
              disabled={loading || recentInteractions.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Summarize Notes
            </Button>

            {/* Suggest Follow-up */}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleSuggestFollowUp}
              disabled={loading}
            >
              <CalendarClock className="h-4 w-4 mr-2" />
              Suggest Next Follow-up
            </Button>

            {/* Suggest Tags */}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleSuggestTags}
              disabled={loading || recentInteractions.length === 0}
            >
              <Tag className="h-4 w-4 mr-2" />
              Suggest Tags
            </Button>

            {/* Meeting Prep */}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setActiveTool(activeTool === 'meeting' ? null : 'meeting')}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Meeting Prep Brief
            </Button>

            {/* Draft Email */}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setActiveTool(activeTool === 'email' ? null : 'email')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Draft Email
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Results Area */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Summarize Result */}
          {activeTool === 'summarize' && !loading && summaryResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Summary</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(summaryResult)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveAsNote(summaryResult)}
                  >
                    Save as Note
                  </Button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap">
                {summaryResult}
              </div>
            </div>
          )}

          {/* Follow-up Result */}
          {activeTool === 'followup' && !loading && followUpResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Suggested Follow-up</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(followUpResult)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap">
                {followUpResult}
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  // Navigate to follow-ups page or open dialog
                  toast({ title: 'Create follow-up from suggestion', description: 'Feature coming soon' })
                }}
              >
                Create Follow-up
              </Button>
            </div>
          )}

          {/* Tags Result */}
          {activeTool === 'tags' && !loading && tagsResult.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Suggested Tags</p>
                <Button
                  size="sm"
                  onClick={() => handleApplyTags(tagsResult)}
                >
                  Apply Tags
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tagsResult.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Meeting Prep Input & Result */}
          {activeTool === 'meeting' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="meetingPurpose">Meeting Purpose (optional)</Label>
                <Input
                  id="meetingPurpose"
                  placeholder="e.g., Quarterly review, Product demo"
                  value={meetingPurpose}
                  onChange={(e) => setMeetingPurpose(e.target.value)}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleMeetingPrep}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Prep Notes'
                  )}
                </Button>
              </div>
              {meetingPrepResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Meeting Prep</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(meetingPrepResult)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap">
                    {meetingPrepResult}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Email Draft Input & Result */}
          {activeTool === 'email' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="emailPurpose">Email Purpose *</Label>
                <Input
                  id="emailPurpose"
                  placeholder="e.g., Follow up on proposal, Schedule meeting"
                  value={emailPurpose}
                  onChange={(e) => setEmailPurpose(e.target.value)}
                />
                <Label htmlFor="emailTone">Tone</Label>
                <Select value={emailTone} onValueChange={(v) => setEmailTone(v as typeof emailTone)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleDraftEmail}
                  disabled={loading || !emailPurpose.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Drafting...
                    </>
                  ) : (
                    'Draft Email'
                  )}
                </Button>
              </div>
              {emailResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Email Draft</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(`${emailResult.subject}\n\n${emailResult.body}`)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Subject:</p>
                      <p className="text-sm">{emailResult.subject}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Body:</p>
                      <p className="text-sm whitespace-pre-wrap">{emailResult.body}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      toast({ title: 'Save as template', description: 'Feature coming soon' })
                    }}
                  >
                    Save as Template
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
