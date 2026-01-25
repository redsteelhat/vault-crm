import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Sparkles,
  Upload,
  Settings,
  Lock,
  UserPlus,
  Search,
  Bell,
  type LucideIcon
} from 'lucide-react'

export interface Command {
  id: string
  label: string
  keywords: string[]
  icon: LucideIcon
  action: () => void
  shortcut?: string
  category: 'navigation' | 'action' | 'contact'
}

export interface CommandPaletteState {
  isOpen: boolean
  search: string
  selectedIndex: number
  commands: Command[]
  filteredCommands: Command[]
  recentContacts: Array<{ id: string; name: string; company?: string }>
}

export function useCommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentContacts, setRecentContacts] = useState<Array<{ id: string; name: string; company?: string }>>([])

  // Build command list
  const commands: Command[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: t('nav.dashboard'),
      keywords: ['home', 'dashboard', 'ana sayfa', 'übersicht'],
      icon: LayoutDashboard,
      action: () => navigate('/'),
      shortcut: 'G D',
      category: 'navigation'
    },
    {
      id: 'nav-contacts',
      label: t('nav.contacts'),
      keywords: ['contacts', 'people', 'kişiler', 'kontakte'],
      icon: Users,
      action: () => navigate('/contacts'),
      shortcut: 'G C',
      category: 'navigation'
    },
    {
      id: 'nav-followups',
      label: t('nav.followups'),
      keywords: ['followups', 'follow-ups', 'tasks', 'due', 'takipler', 'aufgaben'],
      icon: CalendarClock,
      action: () => navigate('/followups'),
      shortcut: 'G F',
      category: 'navigation'
    },
    {
      id: 'nav-smart-lists',
      label: t('nav.smartLists'),
      keywords: ['smart lists', 'stale', 'overdue', 'akıllı listeler', 'intelligente listen'],
      icon: Sparkles,
      action: () => navigate('/smart-lists'),
      shortcut: 'G S',
      category: 'navigation'
    },
    {
      id: 'nav-import',
      label: t('nav.import'),
      keywords: ['import', 'csv', 'upload', 'içe aktar', 'importieren'],
      icon: Upload,
      action: () => navigate('/import'),
      shortcut: 'G I',
      category: 'navigation'
    },
    {
      id: 'nav-settings',
      label: t('nav.settings'),
      keywords: ['settings', 'preferences', 'config', 'ayarlar', 'einstellungen'],
      icon: Settings,
      action: () => navigate('/settings'),
      shortcut: 'G ,',
      category: 'navigation'
    },
    // Actions
    {
      id: 'action-add-contact',
      label: t('contacts.addContact'),
      keywords: ['add', 'new', 'create', 'contact', 'ekle', 'yeni', 'hinzufügen'],
      icon: UserPlus,
      action: () => {
        navigate('/contacts')
        // Will trigger add contact dialog via URL param or event
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('command-palette:add-contact'))
        }, 100)
      },
      shortcut: 'N',
      category: 'action'
    },
    {
      id: 'action-search',
      label: t('common.search'),
      keywords: ['search', 'find', 'ara', 'suchen'],
      icon: Search,
      action: () => {
        navigate('/contacts')
        setTimeout(() => {
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
          if (searchInput) searchInput.focus()
        }, 100)
      },
      shortcut: '/',
      category: 'action'
    },
    {
      id: 'action-due-today',
      label: t('smartLists.dueToday'),
      keywords: ['due today', 'bugün', 'heute fällig'],
      icon: Bell,
      action: () => navigate('/followups'),
      category: 'action'
    },
    {
      id: 'action-lock',
      label: t('nav.lock'),
      keywords: ['lock', 'vault', 'secure', 'kilitle', 'sperren'],
      icon: Lock,
      action: async () => {
        await window.api.vault.lock()
      },
      shortcut: 'Ctrl+L',
      category: 'action'
    }
  ]

  // Filter commands based on search
  const filteredCommands = search.trim()
    ? commands.filter((cmd) => {
        const searchLower = search.toLowerCase()
        return (
          cmd.label.toLowerCase().includes(searchLower) ||
          cmd.keywords.some((k) => k.toLowerCase().includes(searchLower))
        )
      })
    : commands

  // Load recent contacts for search
  const loadRecentContacts = useCallback(async () => {
    try {
      const contacts = await window.api.contacts.getAll()
      setRecentContacts(
        contacts.slice(0, 5).map((c) => ({
          id: c.id,
          name: c.name,
          company: c.company || undefined
        }))
      )
    } catch (error) {
      console.error('Failed to load recent contacts:', error)
    }
  }, [])

  // Open command palette
  const open = useCallback(() => {
    setIsOpen(true)
    setSearch('')
    setSelectedIndex(0)
    loadRecentContacts()
  }, [loadRecentContacts])

  // Close command palette
  const close = useCallback(() => {
    setIsOpen(false)
    setSearch('')
    setSelectedIndex(0)
  }, [])

  // Toggle command palette
  const toggle = useCallback(() => {
    if (isOpen) {
      close()
    } else {
      open()
    }
  }, [isOpen, open, close])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action()
            close()
          }
          break
        case 'Escape':
          e.preventDefault()
          close()
          break
      }
    },
    [isOpen, filteredCommands, selectedIndex, close]
  )

  // Global keyboard shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // CMD/CTRL + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [toggle])

  // Keyboard navigation when open
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  return {
    isOpen,
    search,
    setSearch,
    selectedIndex,
    setSelectedIndex,
    commands: filteredCommands,
    recentContacts,
    open,
    close,
    toggle
  }
}
