import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, MoreVertical, Mail, Phone, Building2, Users } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useContactStore } from '@/stores/contactStore'
import { formatRelativeDate, parseEmails, parsePhones, getInitials, debounce } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { useCallback } from 'react'
import { DuplicateMergeDialog } from '@/components/DuplicateMergeDialog'

export function Contacts() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    contacts,
    tags,
    isLoading,
    searchQuery,
    fetchContacts,
    fetchTags,
    searchContacts,
    createContact,
    deleteContact,
    setSearchQuery
  } = useContactStore()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    company: '',
    title: '',
    phone: '',
    location: '',
    source: '',
    notes: ''
  })

  useEffect(() => {
    fetchContacts()
    fetchTags()
  }, [fetchContacts, fetchTags])

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query)
      searchContacts(query)
    }, 300),
    [searchContacts, setSearchQuery]
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalSearch(value)
    debouncedSearch(value)
  }

  const handleCreateContact = async () => {
    if (!newContact.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' })
      return
    }

    try {
      const contact = await createContact({
        name: newContact.name,
        company: newContact.company || null,
        title: newContact.title || null,
        emails: newContact.email ? JSON.stringify([newContact.email]) : '[]',
        phones: newContact.phone ? JSON.stringify([newContact.phone]) : '[]',
        location: newContact.location || null,
        source: newContact.source || 'Manual',
        notes: newContact.notes || null,
        last_contact_at: null
      })

      toast({ title: 'Contact created', variant: 'success' })
      setIsCreateOpen(false)
      setNewContact({
        name: '',
        email: '',
        company: '',
        title: '',
        phone: '',
        location: '',
        source: '',
        notes: ''
      })
      navigate(`/contacts/${contact.id}`)
    } catch {
      toast({ title: 'Failed to create contact', variant: 'destructive' })
    }
  }

  const handleDeleteContact = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteContact(id)
        toast({ title: 'Contact deleted' })
      } catch {
        toast({ title: 'Failed to delete contact', variant: 'destructive' })
      }
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title="Contacts" description={`${contacts.length} contacts in your network`} />

      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, company, or notes..."
                className="pl-9"
                value={localSearch}
                onChange={handleSearchChange}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsDuplicateOpen(true)}>
              <Users className="h-4 w-4 mr-2" /> Find Duplicates
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Contact
            </Button>
          </div>
        </div>

        {/* Contact List */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">No contacts found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Add your first contact to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {contacts.map((contact) => {
                  const emails = parseEmails(contact.emails)
                  const phones = parsePhones(contact.phones)

                  return (
                    <Card
                      key={contact.id}
                      className="group hover:shadow-md transition-all duration-200 border-none shadow-sm"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <Link
                            to={`/contacts/${contact.id}`}
                            className="flex items-start gap-3 flex-1"
                          >
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                              {getInitials(contact.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold truncate hover:text-primary transition-colors">
                                {contact.name}
                              </h3>
                              {contact.title && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {contact.title}
                                </p>
                              )}
                              {contact.company && (
                                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                                  <Building2 className="h-3 w-3" /> {contact.company}
                                </p>
                              )}
                            </div>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/contacts/${contact.id}`)}
                              >
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteContact(contact.id, contact.name)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {emails[0] && (
                              <span className="flex items-center gap-1 truncate max-w-[120px]">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{emails[0]}</span>
                              </span>
                            )}
                            {phones[0] && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {phones[0]}
                              </span>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {formatRelativeDate(contact.last_contact_at)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Create Contact Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 555 123 4567"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc"
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="CEO"
                  value={newContact.title}
                  onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="New York, NY"
                  value={newContact.location}
                  onChange={(e) => setNewContact({ ...newContact, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  placeholder="LinkedIn, Conference..."
                  value={newContact.source}
                  onChange={(e) => setNewContact({ ...newContact, source: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this contact..."
                value={newContact.notes}
                onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateContact}>Create Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Merge Dialog */}
      <DuplicateMergeDialog
        open={isDuplicateOpen}
        onOpenChange={setIsDuplicateOpen}
        onMergeComplete={() => fetchContacts()}
      />
    </div>
  )
}
