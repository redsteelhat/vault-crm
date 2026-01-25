import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Mail, 
  Phone, 
  Building2, 
  Users, 
  Linkedin, 
  ChevronDown,
  LayoutGrid,
  List,
  Trash2,
  Tag,
  ArrowUpDown
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useContactStore } from '@/stores/contactStore'
import { formatRelativeDate, parseEmails, parsePhones, getInitials, debounce } from '@/lib/utils'

// Type assertion for window.api
declare global {
  interface Window {
    api: typeof import('../../preload/index').default
  }
}
import { useToast } from '@/hooks/useToast'
import { DuplicateMergeDialog } from '@/components/DuplicateMergeDialog'
import { LinkedInParser } from '@/components/LinkedInParser'
import { UpgradePrompt } from '@/components/UpgradePrompt'
import { FilterPanel, type ContactFilters } from '@/components/FilterPanel'
import { ContactsTable } from '@/components/ContactsTable'

type SortOption = 'name' | 'company' | 'created_at' | 'last_contact_at' | 'updated_at'
type SortOrder = 'asc' | 'desc'
type ViewMode = 'grid' | 'table'

const emptyFilters: ContactFilters = {
  tags: [],
  companies: [],
  sources: [],
  locations: [],
  createdFrom: null,
  createdTo: null,
  lastContactFrom: null,
  lastContactTo: null
}

export function Contacts() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    contacts,
    tags,
    isLoading,
    searchQuery,
    fetchContacts,
    fetchTags,
    createContact,
    deleteContact,
    setSearchQuery
  } = useContactStore()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)
  const [isLinkedInOpen, setIsLinkedInOpen] = useState(false)
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false)
  const [_tierInfo, setTierInfo] = useState<{ tier: 'free' | 'pro'; contactsRemaining: number } | null>(null)
  const [localSearch, setLocalSearch] = useState(searchQuery)
  
  // Filter state
  const [filters, setFilters] = useState<ContactFilters>(emptyFilters)
  const [uniqueCompanies, setUniqueCompanies] = useState<string[]>([])
  const [uniqueSources, setUniqueSources] = useState<string[]>([])
  const [uniqueLocations, setUniqueLocations] = useState<string[]>([])
  
  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>('updated_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('contactsViewMode') as ViewMode) || 'grid'
  })
  
  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false)
  const [bulkTagAction, setBulkTagAction] = useState<'add' | 'remove'>('add')
  const [selectedTagId, setSelectedTagId] = useState<string>('')

  // Filtered contacts
  const [filteredContacts, setFilteredContacts] = useState(contacts)

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
    loadTierInfo()
    loadFilterOptions()
  }, [fetchContacts, fetchTags])

  useEffect(() => {
    applyFiltersAndSort()
  }, [contacts, filters, sortBy, sortOrder, searchQuery])

  useEffect(() => {
    localStorage.setItem('contactsViewMode', viewMode)
  }, [viewMode])

  const loadTierInfo = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const info = await (window as any).api.tier.getInfo()
      setTierInfo(info)
    } catch (error) {
      console.error('Failed to load tier info:', error)
    }
  }

  const loadFilterOptions = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).api
      const [companies, sources, locations] = await Promise.all([
        api.contacts.getUniqueCompanies(),
        api.contacts.getUniqueSources(),
        api.contacts.getUniqueLocations()
      ])
      setUniqueCompanies(companies)
      setUniqueSources(sources)
      setUniqueLocations(locations)
    } catch (error) {
      console.error('Failed to load filter options:', error)
    }
  }

  const applyFiltersAndSort = async () => {
    const hasFilters = 
      filters.tags.length > 0 ||
      filters.companies.length > 0 ||
      filters.sources.length > 0 ||
      filters.locations.length > 0 ||
      filters.createdFrom ||
      filters.createdTo ||
      filters.lastContactFrom ||
      filters.lastContactTo

    if (hasFilters || searchQuery) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (window as any).api.contacts.getWithFilters({
          search: searchQuery || undefined,
          tags: filters.tags.length > 0 ? filters.tags : undefined,
          companies: filters.companies.length > 0 ? filters.companies : undefined,
          sources: filters.sources.length > 0 ? filters.sources : undefined,
          locations: filters.locations.length > 0 ? filters.locations : undefined,
          createdFrom: filters.createdFrom || undefined,
          createdTo: filters.createdTo || undefined,
          lastContactFrom: filters.lastContactFrom || undefined,
          lastContactTo: filters.lastContactTo || undefined,
          sortBy,
          sortOrder
        })
        setFilteredContacts(result)
      } catch (error) {
        console.error('Failed to apply filters:', error)
        setFilteredContacts(contacts)
      }
    } else {
      // Sort locally
      const sorted = [...contacts].sort((a, b) => {
        let aVal: string | null = null
        let bVal: string | null = null

        switch (sortBy) {
          case 'name':
            aVal = a.name.toLowerCase()
            bVal = b.name.toLowerCase()
            break
          case 'company':
            aVal = (a.company || '').toLowerCase()
            bVal = (b.company || '').toLowerCase()
            break
          case 'created_at':
            aVal = a.created_at
            bVal = b.created_at
            break
          case 'last_contact_at':
            aVal = a.last_contact_at
            bVal = b.last_contact_at
            break
          case 'updated_at':
            aVal = a.updated_at
            bVal = b.updated_at
            break
        }

        if (aVal === null && bVal === null) return 0
        if (aVal === null) return sortOrder === 'asc' ? 1 : -1
        if (bVal === null) return sortOrder === 'asc' ? -1 : 1

        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return sortOrder === 'asc' ? comparison : -comparison
      })
      setFilteredContacts(sorted)
    }
  }

  const checkCanAddContact = async (): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).api.tier.canAddContact()
      if (!result.allowed) {
        setIsUpgradeOpen(true)
        return false
      }
      return true
    } catch {
      return true
    }
  }

  const debouncedSearch = useCallback(
    debounce((...args: unknown[]) => {
      const query = args[0] as string
      setSearchQuery(query)
    }, 300),
    [setSearchQuery]
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalSearch(value)
    debouncedSearch(value)
  }

  const handleCreateContact = async () => {
    if (!newContact.name.trim()) {
      toast({ title: t('contacts.fields.name') + ' ' + t('common.error'), variant: 'destructive' })
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

      toast({ title: t('contacts.contactCreated'), variant: 'success' })
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
      toast({ title: t('errors.saveFailed'), variant: 'destructive' })
    }
  }

  const handleDeleteContact = async (id: string, _name: string) => {
    if (confirm(t('contacts.deleteConfirm'))) {
      try {
        await deleteContact(id)
        toast({ title: t('contacts.contactDeleted') })
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        // Refresh contacts list to ensure UI is updated
        await fetchContacts()
      } catch (error) {
        console.error('Failed to delete contact:', error)
        toast({ title: t('errors.deleteFailed'), variant: 'destructive' })
      }
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    
    const count = selectedIds.size
    if (confirm(t('bulk.confirmDelete', { count }) + (count > 1 ? t('bulk.confirmDelete_plural', { count }) : ''))) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (window as any).api.contacts.bulkDelete(Array.from(selectedIds))
        toast({ 
          title: count === 1 
            ? t('bulk.deleteSuccess', { count }) 
            : t('bulk.deleteSuccess_plural', { count })
        })
        setSelectedIds(new Set())
        fetchContacts()
      } catch {
        toast({ title: t('errors.deleteFailed'), variant: 'destructive' })
      }
    }
  }

  const handleBulkTag = async () => {
    if (selectedIds.size === 0 || !selectedTagId) return

    try {
      const count = selectedIds.size
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).api
      if (bulkTagAction === 'add') {
        await api.contacts.bulkAddTag(Array.from(selectedIds), selectedTagId)
        toast({ 
          title: count === 1 
            ? t('bulk.tagAdded', { count }) 
            : t('bulk.tagAdded_plural', { count })
        })
      } else {
        await api.contacts.bulkRemoveTag(Array.from(selectedIds), selectedTagId)
        toast({ 
          title: count === 1 
            ? t('bulk.tagRemoved', { count }) 
            : t('bulk.tagRemoved_plural', { count })
        })
      }
      setIsBulkTagOpen(false)
      setSelectedTagId('')
      fetchContacts()
    } catch {
      toast({ title: t('errors.saveFailed'), variant: 'destructive' })
    }
  }

  const handleSelectContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const _handleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)))
    }
  }

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name', label: t('sort.name') },
    { value: 'company', label: t('sort.company') },
    { value: 'created_at', label: t('sort.createdAt') },
    { value: 'last_contact_at', label: t('sort.lastContact') },
    { value: 'updated_at', label: t('sort.updatedAt') }
  ]

  return (
    <div className="flex flex-col h-screen">
      <Header title={t('contacts.title')} description={`${filteredContacts.length} ${t('contacts.title').toLowerCase()}`} />

      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('contacts.searchPlaceholder')}
                className="pl-9"
                value={localSearch}
                onChange={handleSearchChange}
              />
            </div>
            
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              tags={tags}
              companies={uniqueCompanies}
              sources={uniqueSources}
              locations={uniqueLocations}
            />

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  {t('sort.sortBy')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => {
                      if (sortBy === option.value) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy(option.value)
                        setSortOrder('asc')
                      }
                    }}
                  >
                    {option.label}
                    {sortBy === option.value && (
                      <span className="ml-auto text-muted-foreground">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Toggle */}
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <Badge variant="secondary">
                  {t('bulk.selected', { count: selectedIds.size })}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => {
                  setBulkTagAction('add')
                  setIsBulkTagOpen(true)
                }}>
                  <Tag className="h-4 w-4 mr-1" />
                  {t('bulk.addTagToSelected')}
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('bulk.deleteSelected')}
                </Button>
              </div>
            )}

            <Button variant="outline" onClick={() => setIsDuplicateOpen(true)}>
              <Users className="h-4 w-4 mr-2" /> {t('contacts.findDuplicates')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> {t('contacts.addContact')}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={async () => {
                  if (await checkCanAddContact()) setIsCreateOpen(true)
                }}>
                  <Plus className="h-4 w-4 mr-2" /> {t('contacts.addContact')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  if (await checkCanAddContact()) setIsLinkedInOpen(true)
                }}>
                  <Linkedin className="h-4 w-4 mr-2 text-[#0A66C2]" /> {t('linkedin.title')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Contact List */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">{t('contacts.noContacts')}</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? t('common.noResults')
                    : t('contacts.noContactsDesc')}
                </p>
                {!searchQuery && (
                  <Button onClick={async () => {
                    if (await checkCanAddContact()) setIsCreateOpen(true)
                  }}>
                    <Plus className="h-4 w-4 mr-2" /> {t('contacts.addContact')}
                  </Button>
                )}
              </div>
            ) : viewMode === 'table' ? (
              <ContactsTable
                contacts={filteredContacts}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onDelete={handleDeleteContact}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredContacts.map((contact) => {
                  const emails = parseEmails(contact.emails)
                  const phones = parsePhones(contact.phones)
                  const isSelected = selectedIds.has(contact.id)

                  return (
                    <Card
                      key={contact.id}
                      className={`group hover:shadow-md transition-all duration-200 border-none shadow-sm ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="relative">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleSelectContact(contact.id)}
                                className="absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background"
                              />
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                                {getInitials(contact.name)}
                              </div>
                            </div>
                            <Link
                              to={`/contacts/${contact.id}`}
                              className="min-w-0 flex-1"
                            >
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
                            </Link>
                          </div>
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
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteContact(contact.id, contact.name)}
                              >
                                {t('common.delete')}
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
            <DialogTitle>{t('contacts.addContact')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('contacts.fields.name')} *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('contacts.fields.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('contacts.fields.phone')}</Label>
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
                <Label htmlFor="company">{t('contacts.fields.company')}</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc"
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">{t('contacts.fields.title')}</Label>
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
                <Label htmlFor="location">{t('contacts.fields.location')}</Label>
                <Input
                  id="location"
                  placeholder="New York, NY"
                  value={newContact.location}
                  onChange={(e) => setNewContact({ ...newContact, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">{t('contacts.fields.source')}</Label>
                <Input
                  id="source"
                  placeholder="LinkedIn, Conference..."
                  value={newContact.source}
                  onChange={(e) => setNewContact({ ...newContact, source: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{t('contacts.fields.notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('contacts.fields.notes') + '...'}
                value={newContact.notes}
                onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateContact}>{t('common.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Tag Dialog */}
      <Dialog open={isBulkTagOpen} onOpenChange={setIsBulkTagOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {bulkTagAction === 'add' ? t('bulk.addTagToSelected') : t('bulk.removeTagFromSelected')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>{t('filters.tags')}</Label>
            <Select value={selectedTagId} onValueChange={setSelectedTagId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={t('filters.selectTags')} />
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkTagOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleBulkTag} disabled={!selectedTagId}>
              {bulkTagAction === 'add' ? t('common.add') : t('common.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Merge Dialog */}
      <DuplicateMergeDialog
        open={isDuplicateOpen}
        onOpenChange={setIsDuplicateOpen}
        onMergeComplete={() => fetchContacts()}
      />

      {/* LinkedIn Parser Dialog */}
      <LinkedInParser
        open={isLinkedInOpen}
        onOpenChange={setIsLinkedInOpen}
        onImport={async (data) => {
          try {
            await createContact({
              name: data.name,
              company: data.company || null,
              title: data.title || null,
              emails: data.emails ? JSON.stringify(data.emails) : '[]',
              phones: '[]',
              location: data.location || null,
              source: data.source,
              notes: data.notes || null,
              last_contact_at: null
            })
            toast({ title: t('contacts.contactCreated'), variant: 'success' })
            fetchContacts()
            loadTierInfo()
          } catch {
            toast({ title: t('errors.saveFailed'), variant: 'destructive' })
          }
        }}
      />

      {/* Upgrade Prompt Dialog */}
      <UpgradePrompt
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        feature="maxContacts"
        title={t('pricing.limitReached')}
        message={t('pricing.limitReachedDesc', { limit: 50 })}
      />
    </div>
  )
}
