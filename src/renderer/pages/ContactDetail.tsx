import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  PhoneCall,
  Users,
  Clock,
  Tag as TagIcon,
  TrendingUp
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { useContactStore } from '@/stores/contactStore'
import { useFollowUpStore } from '@/stores/followupStore'
import { useToast } from '@/hooks/useToast'
import { formatDate, formatDateTime, parseEmails, parsePhones, getInitials, cn } from '@/lib/utils'
import { format } from 'date-fns'
import { InteractionAnalyticsChart } from '@/components/charts/InteractionAnalyticsChart'

interface Interaction {
  id: string
  contact_id: string
  type: 'note' | 'call' | 'meeting' | 'email'
  body: string
  occurred_at: string
  created_at: string
}

const interactionIcons = {
  note: MessageSquare,
  call: PhoneCall,
  meeting: Users,
  email: Mail
}

interface InteractionStats {
  monthlyData: { month: string; count: number }[]
  typeData: { type: string; count: number }[]
  total: number
}

export function ContactDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const {
    selectedContact,
    selectedContactTags,
    tags,
    selectContact,
    updateContact,
    deleteContact,
    addTagToContact,
    removeTagFromContact,
    fetchTags
  } = useContactStore()

  const { fetchByContact, createFollowUp } = useFollowUpStore()

  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [followups, setFollowups] = useState<any[]>([])
  const [interactionStats, setInteractionStats] = useState<InteractionStats | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false)
  const [isAddFollowUpOpen, setIsAddFollowUpOpen] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    location: '',
    source: '',
    notes: ''
  })
  const [newNote, setNewNote] = useState({ type: 'note', body: '' })
  const [newFollowUp, setNewFollowUp] = useState({ date: new Date(), reason: '' })

  useEffect(() => {
    if (id) {
      selectContact(id)
      fetchTags()
      loadInteractions()
      loadFollowups()
      loadInteractionStats()
    }
  }, [id, selectContact, fetchTags])

  useEffect(() => {
    if (selectedContact) {
      const emails = parseEmails(selectedContact.emails)
      const phones = parsePhones(selectedContact.phones)
      setEditData({
        name: selectedContact.name,
        email: emails[0] || '',
        phone: phones[0] || '',
        company: selectedContact.company || '',
        title: selectedContact.title || '',
        location: selectedContact.location || '',
        source: selectedContact.source || '',
        notes: selectedContact.notes || ''
      })
    }
  }, [selectedContact])

  const loadInteractions = async () => {
    if (!id) return
    const result = await window.api.interactions.getByContact(id)
    setInteractions(result)
  }

  const loadFollowups = async () => {
    if (!id) return
    const result = await fetchByContact(id)
    setFollowups(result)
  }

  const loadInteractionStats = async () => {
    if (!id) return
    try {
      const stats = await window.api.interactions.getContactStats(id)
      setInteractionStats(stats)
    } catch (error) {
      console.error('Failed to load interaction stats:', error)
    }
  }

  const handleUpdate = async () => {
    if (!id) return
    try {
      await updateContact(id, {
        name: editData.name,
        company: editData.company || null,
        title: editData.title || null,
        emails: editData.email ? JSON.stringify([editData.email]) : '[]',
        phones: editData.phone ? JSON.stringify([editData.phone]) : '[]',
        location: editData.location || null,
        source: editData.source || null,
        notes: editData.notes || null
      })
      toast({ title: 'Contact updated', variant: 'success' })
      setIsEditOpen(false)
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!id || !selectedContact) return
    if (confirm(`Are you sure you want to delete ${selectedContact.name}?`)) {
      try {
        await deleteContact(id)
        toast({ title: 'Contact deleted' })
        navigate('/contacts')
      } catch {
        toast({ title: 'Failed to delete', variant: 'destructive' })
      }
    }
  }

  const handleAddNote = async () => {
    if (!id || !newNote.body.trim()) return
    try {
      await window.api.interactions.create({
        contact_id: id,
        type: newNote.type as any,
        body: newNote.body,
        occurred_at: new Date().toISOString()
      })
      toast({ title: 'Note added', variant: 'success' })
      setIsAddNoteOpen(false)
      setNewNote({ type: 'note', body: '' })
      loadInteractions()
      selectContact(id)
    } catch {
      toast({ title: 'Failed to add note', variant: 'destructive' })
    }
  }

  const handleAddFollowUp = async () => {
    if (!id) return
    try {
      await createFollowUp({
        contact_id: id,
        due_at: newFollowUp.date.toISOString(),
        reason: newFollowUp.reason || null,
        status: 'open'
      })
      toast({ title: 'Follow-up created', variant: 'success' })
      setIsAddFollowUpOpen(false)
      setNewFollowUp({ date: new Date(), reason: '' })
      loadFollowups()
    } catch {
      toast({ title: 'Failed to create follow-up', variant: 'destructive' })
    }
  }

  const handleAddTag = async (tagId: string) => {
    if (!id) return
    await addTagToContact(id, tagId)
  }

  const handleRemoveTag = async (tagId: string) => {
    if (!id) return
    await removeTagFromContact(id, tagId)
  }

  if (!selectedContact) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const emails = parseEmails(selectedContact.emails)
  const phones = parsePhones(selectedContact.phones)
  const availableTags = tags.filter((t) => !selectedContactTags.find((st) => st.id === t.id))

  return (
    <div className="flex flex-col h-screen">
      <Header title={selectedContact.name} />

      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Back Button */}
          <Link
            to="/contacts"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to contacts
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info Card */}
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary">
                      {getInitials(selectedContact.name)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedContact.name}</h2>
                      {selectedContact.title && (
                        <p className="text-muted-foreground">{selectedContact.title}</p>
                      )}
                      {selectedContact.company && (
                        <p className="text-muted-foreground flex items-center gap-1 mt-1">
                          <Building2 className="h-4 w-4" /> {selectedContact.company}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedContactTags.map((tag) => (
                          <Badge
                            key={tag.id}
                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                            className="cursor-pointer hover:opacity-80"
                            onClick={() => handleRemoveTag(tag.id)}
                          >
                            {tag.name} ×
                          </Badge>
                        ))}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-6 px-2">
                              <TagIcon className="h-3 w-3 mr-1" /> Add tag
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2">
                            {availableTags.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                All tags assigned
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {availableTags.map((tag) => (
                                  <button
                                    key={tag.id}
                                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted flex items-center gap-2"
                                    onClick={() => handleAddTag(tag.id)}
                                  >
                                    <span
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: tag.color }}
                                    />
                                    {tag.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setIsEditOpen(true)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleDelete}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-2 gap-4">
                  {emails[0] && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Mail className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <a href={`mailto:${emails[0]}`} className="text-sm hover:text-primary">
                          {emails[0]}
                        </a>
                      </div>
                    </div>
                  )}
                  {phones[0] && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Phone className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <a href={`tel:${phones[0]}`} className="text-sm hover:text-primary">
                          {phones[0]}
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedContact.location && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <MapPin className="h-4 w-4 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="text-sm">{selectedContact.location}</p>
                      </div>
                    </div>
                  )}
                  {selectedContact.source && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Users className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Source</p>
                        <p className="text-sm">{selectedContact.source}</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedContact.notes && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedContact.notes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" onClick={() => setIsAddNoteOpen(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" /> Add Note
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setIsAddFollowUpOpen(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" /> Schedule Follow-up
                  </Button>
                </CardContent>
              </Card>

              {/* Last Contact */}
              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Contact</p>
                      <p className="text-sm font-medium">
                        {formatDate(selectedContact.last_contact_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Follow-ups */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Upcoming Follow-ups</CardTitle>
                </CardHeader>
                <CardContent>
                  {followups.filter((f) => f.status === 'open').length === 0 ? (
                    <p className="text-sm text-muted-foreground">No scheduled follow-ups</p>
                  ) : (
                    <div className="space-y-2">
                      {followups
                        .filter((f) => f.status === 'open')
                        .slice(0, 3)
                        .map((followup) => (
                          <div
                            key={followup.id}
                            className="p-2 rounded-lg bg-muted/50 text-sm"
                          >
                            <p className="font-medium">{formatDate(followup.due_at)}</p>
                            {followup.reason && (
                              <p className="text-muted-foreground text-xs">{followup.reason}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Interaction Analytics */}
          {interactionStats && (
            <div className="mt-6">
              <InteractionAnalyticsChart
                monthlyData={interactionStats.monthlyData}
                typeData={interactionStats.typeData.map((d) => ({
                  type: d.type as 'note' | 'call' | 'meeting' | 'email',
                  count: d.count
                }))}
              />
            </div>
          )}

          {/* Timeline */}
          <Card className="mt-6 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t('contactDetail.interactions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="calls">Calls</TabsTrigger>
                  <TabsTrigger value="meetings">Meetings</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  {interactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No interactions yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setIsAddNoteOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add first note
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {interactions.map((interaction) => {
                        const Icon = interactionIcons[interaction.type]
                        return (
                          <div key={interaction.id} className="flex gap-4">
                            <div className="p-2 rounded-lg bg-muted h-fit">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium capitalize">
                                  {interaction.type}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(interaction.occurred_at)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {interaction.body}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  {interactions.filter((i) => i.type === 'note').length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No notes</p>
                  ) : (
                    <div className="space-y-4">
                      {interactions
                        .filter((i) => i.type === 'note')
                        .map((interaction) => (
                          <div key={interaction.id} className="p-3 rounded-lg bg-muted/50">
                            <p className="text-sm">{interaction.body}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDateTime(interaction.occurred_at)}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="calls" className="mt-4">
                  {interactions.filter((i) => i.type === 'call').length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No calls</p>
                  ) : (
                    <div className="space-y-4">
                      {interactions
                        .filter((i) => i.type === 'call')
                        .map((interaction) => (
                          <div key={interaction.id} className="p-3 rounded-lg bg-muted/50">
                            <p className="text-sm">{interaction.body}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDateTime(interaction.occurred_at)}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="meetings" className="mt-4">
                  {interactions.filter((i) => i.type === 'meeting').length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No meetings</p>
                  ) : (
                    <div className="space-y-4">
                      {interactions
                        .filter((i) => i.type === 'meeting')
                        .map((interaction) => (
                          <div key={interaction.id} className="p-3 rounded-lg bg-muted/50">
                            <p className="text-sm">{interaction.body}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDateTime(interaction.occurred_at)}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={editData.company}
                  onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={editData.location}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Input
                  value={editData.source}
                  onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Interaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newNote.type}
                onValueChange={(v) => setNewNote({ ...newNote, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                placeholder="What happened?"
                value={newNote.body}
                onChange={(e) => setNewNote({ ...newNote, body: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddNoteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Follow-up Dialog */}
      <Dialog open={isAddFollowUpOpen} onOpenChange={setIsAddFollowUpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(newFollowUp.date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={newFollowUp.date}
                    onSelect={(d) => d && setNewFollowUp({ ...newFollowUp, date: d })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                placeholder="Why are you following up?"
                value={newFollowUp.reason}
                onChange={(e) => setNewFollowUp({ ...newFollowUp, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFollowUpOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFollowUp}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
