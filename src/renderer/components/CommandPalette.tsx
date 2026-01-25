import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Command, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  
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
  }, [isOpen])

  // Search contacts in real-time
  const filteredContacts = search.trim().length > 1
    ? recentContacts.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
      )
    : []

  // Handle item click
  const handleItemClick = (action: () => void) => {
    action()
    close()
  }

  // Handle contact click
  const handleContactClick = (contactId: string) => {
    navigate(`/contacts/${contactId}`)
    close()
  }

  // Group commands by category
  const navigationCommands = commands.filter(c => c.category === 'navigation')
  const actionCommands = commands.filter(c => c.category === 'action')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b px-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
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
        <div className="max-h-80 overflow-y-auto py-2">
          {/* Contacts (if searching) */}
          {filteredContacts.length > 0 && (
            <div className="px-2 pb-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {t('nav.contacts')}
              </div>
              {filteredContacts.map((contact, index) => (
                <button
                  key={contact.id}
                  onClick={() => handleContactClick(contact.id)}
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

          {/* Navigation */}
          {navigationCommands.length > 0 && (
            <div className="px-2 pb-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {t('nav.dashboard')}
              </div>
              {navigationCommands.map((cmd, index) => {
                const adjustedIndex = filteredContacts.length + index
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

          {/* Actions */}
          {actionCommands.length > 0 && (
            <div className="px-2 pb-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {t('common.add')}
              </div>
              {actionCommands.map((cmd, index) => {
                const adjustedIndex = filteredContacts.length + navigationCommands.length + index
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
          {commands.length === 0 && filteredContacts.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              {t('common.noResults')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border bg-muted">↑</kbd>
              <kbd className="px-1 py-0.5 rounded border bg-muted">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border bg-muted">Enter</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border bg-muted">Esc</kbd>
              to close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
