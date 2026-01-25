import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Command, User, MessageSquare, CalendarClock, Mail, Phone, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface SearchResult {
  id: string
  type: 'contact' | 'interaction' | 'followup'
  title: string
  subtitle?: string
  contactId?: string
}

export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  
  const {
    isOpen,
    search,
    setSearch,
    selectedIndex,
    setSelectedIndex,
    commands,
    recentContacts,
    close
  } = useCommandPalette()

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
    // Reset search when closed
    if (!isOpen) {
      setSearchResults([])
    }
  }, [isOpen])

  // Perform global search
  useEffect(() => {
    const performSearch = async () => {
      if (search.trim().length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const query = search.toLowerCase()

        // Search contacts
        const contacts = await window.api.contacts.search(search)
        const contactResults: SearchResult[] = contacts.slice(0, 5).map((c) => ({
          id: `contact-${c.id}`,
          type: 'contact' as const,
          title: c.name,
          subtitle: c.company || undefined,
          contactId: c.id
        }))

        // Search recent interactions for matching text
        const interactions = await window.api.interactions.getRecent(50)
        const interactionResults: SearchResult[] = interactions
          .filter((i) => 
            i.body.toLowerCase().includes(query) ||
            (i as any).contact_name?.toLowerCase().includes(query)
          )
          .slice(0, 3)
          .map((i) => ({
            id: `interaction-${i.id}`,
            type: 'interaction' as const,
            title: (i as any).contact_name || 'Unknown',
            subtitle: i.body.slice(0, 60) + (i.body.length > 60 ? '...' : ''),
            contactId: i.contact_id
          }))

        // Search followups
        const [overdue, dueToday, upcoming] = await Promise.all([
          window.api.followups.getOverdue(),
          window.api.followups.getDueToday(),
          window.api.followups.getUpcoming(30)
        ])
        const allFollowups = [...overdue, ...dueToday, ...upcoming]
        const followupResults: SearchResult[] = allFollowups
          .filter((f) =>
            (f as any).contact_name?.toLowerCase().includes(query) ||
            (f.reason && f.reason.toLowerCase().includes(query))
          )
          .slice(0, 3)
          .map((f) => ({
            id: `followup-${f.id}`,
            type: 'followup' as const,
            title: (f as any).contact_name || 'Unknown',
            subtitle: f.reason || new Date(f.due_at).toLocaleDateString(),
            contactId: f.contact_id
          }))

        setSearchResults([...contactResults, ...interactionResults, ...followupResults])
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(performSearch, 200)
    return () => clearTimeout(debounce)
  }, [search])

  // All items for navigation
  const allItems = useMemo(() => {
    if (searchResults.length > 0) {
      return searchResults
    }
    
    // Show recent contacts when no search
    return recentContacts.slice(0, 5).map((c) => ({
      id: `contact-${c.id}`,
      type: 'contact' as const,
      title: c.name,
      subtitle: c.company || undefined,
      contactId: c.id
    }))
  }, [searchResults, recentContacts])

  // Handle item click
  const handleItemClick = (action: () => void) => {
    action()
    close()
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    if (result.contactId) {
      navigate(`/contacts/${result.contactId}`)
    }
    close()
  }

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const totalItems = allItems.length + commands.length
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex < allItems.length) {
          const item = allItems[selectedIndex]
          handleResultClick(item)
        } else {
          const cmdIndex = selectedIndex - allItems.length
          if (commands[cmdIndex]) {
            handleItemClick(commands[cmdIndex].action)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, allItems, commands])

  // Group commands by category
  const navigationCommands = commands.filter(c => c.category === 'navigation')
  const actionCommands = commands.filter(c => c.category === 'action')

  // Get icon for result type
  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'contact':
        return User
      case 'interaction':
        return MessageSquare
      case 'followup':
        return CalendarClock
    }
  }

  // Get badge for result type
  const getResultBadge = (type: SearchResult['type']) => {
    switch (type) {
      case 'contact':
        return null
      case 'interaction':
        return <Badge variant="outline" className="text-xs ml-2">{t('interactions.note')}</Badge>
      case 'followup':
        return <Badge variant="outline" className="text-xs ml-2">{t('followups.title')}</Badge>
    }
  }

  // Group search results by type
  const contactResults = searchResults.filter(r => r.type === 'contact')
  const interactionResults = searchResults.filter(r => r.type === 'interaction')
  const followupResults = searchResults.filter(r => r.type === 'followup')

  const hasSearchResults = searchResults.length > 0
  const showingQuickResults = search.trim().length < 2 && recentContacts.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b px-4">
          <Search className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            isSearching ? "text-primary animate-pulse" : "text-muted-foreground"
          )} />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('commandPalette.placeholder')}
            className="flex-1 h-14 px-3 bg-transparent border-0 outline-none text-base placeholder:text-muted-foreground"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:flex h-6 items-center gap-1 rounded border bg-muted px-2 font-mono text-xs text-muted-foreground">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-2">
          {/* Search Results - Contacts */}
          {contactResults.length > 0 && (
            <div className="px-2 pb-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {t('commandPalette.contacts')}
              </div>
              {contactResults.map((result, index) => {
                const Icon = getResultIcon(result.type)
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left',
                      'hover:bg-muted/50 transition-colors',
                      selectedIndex === index && 'bg-muted'
                    )}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Search Results - Interactions */}
          {interactionResults.length > 0 && (
            <div className="px-2 pb-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {t('contactDetail.interactions')}
              </div>
              {interactionResults.map((result, index) => {
                const adjustedIndex = contactResults.length + index
                const Icon = getResultIcon(result.type)
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    onMouseEnter={() => setSelectedIndex(adjustedIndex)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left',
                      'hover:bg-muted/50 transition-colors',
                      selectedIndex === adjustedIndex && 'bg-muted'
                    )}
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate flex items-center">
                        {result.title}
                        {getResultBadge(result.type)}
                      </p>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Search Results - Follow-ups */}
          {followupResults.length > 0 && (
            <div className="px-2 pb-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {t('followups.title')}
              </div>
              {followupResults.map((result, index) => {
                const adjustedIndex = contactResults.length + interactionResults.length + index
                const Icon = getResultIcon(result.type)
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    onMouseEnter={() => setSelectedIndex(adjustedIndex)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left',
                      'hover:bg-muted/50 transition-colors',
                      selectedIndex === adjustedIndex && 'bg-muted'
                    )}
                  >
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate flex items-center">
                        {result.title}
                        {getResultBadge(result.type)}
                      </p>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Recent Contacts (when not searching) */}
          {showingQuickResults && (
            <div className="px-2 pb-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {t('dashboard.recentContacts')}
              </div>
              {recentContacts.slice(0, 5).map((contact, index) => (
                <button
                  key={contact.id}
                  onClick={() => {
                    navigate(`/contacts/${contact.id}`)
                    close()
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left',
                    'hover:bg-muted/50 transition-colors',
                    selectedIndex === index && 'bg-muted'
                  )}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contact.name}</p>
                    {contact.company && (
                      <p className="text-sm text-muted-foreground truncate">{contact.company}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Navigation Commands */}
          {navigationCommands.length > 0 && !hasSearchResults && (
            <div className="px-2 pb-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {t('commandPalette.navigation')}
              </div>
              {navigationCommands.map((cmd, index) => {
                const adjustedIndex = (showingQuickResults ? recentContacts.slice(0, 5).length : 0) + index
                const Icon = cmd.icon
                return (
                  <button
                    key={cmd.id}
                    onClick={() => handleItemClick(cmd.action)}
                    onMouseEnter={() => setSelectedIndex(adjustedIndex)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-left',
                      'hover:bg-muted/50 transition-colors',
                      selectedIndex === adjustedIndex && 'bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{cmd.label}</span>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="hidden sm:flex px-1.5 py-0.5 rounded border bg-muted font-mono text-xs text-muted-foreground">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Action Commands */}
          {actionCommands.length > 0 && !hasSearchResults && (
            <div className="px-2 pb-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {t('commandPalette.actions')}
              </div>
              {actionCommands.map((cmd, index) => {
                const adjustedIndex = (showingQuickResults ? recentContacts.slice(0, 5).length : 0) + navigationCommands.length + index
                const Icon = cmd.icon
                return (
                  <button
                    key={cmd.id}
                    onClick={() => handleItemClick(cmd.action)}
                    onMouseEnter={() => setSelectedIndex(adjustedIndex)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-left',
                      'hover:bg-muted/50 transition-colors',
                      selectedIndex === adjustedIndex && 'bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{cmd.label}</span>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="hidden sm:flex px-1.5 py-0.5 rounded border bg-muted font-mono text-xs text-muted-foreground">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Empty State */}
          {!hasSearchResults && !showingQuickResults && commands.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              {t('commandPalette.noResults')}
            </div>
          )}

          {/* No results while searching */}
          {search.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
            <div className="py-8 text-center text-muted-foreground">
              {t('commandPalette.noResults')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border bg-muted">↑</kbd>
              <kbd className="px-1 py-0.5 rounded border bg-muted">↓</kbd>
              {t('commandPalette.toNavigate')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border bg-muted">Enter</kbd>
              {t('commandPalette.toSelect')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border bg-muted">Esc</kbd>
              {t('commandPalette.toClose')}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
