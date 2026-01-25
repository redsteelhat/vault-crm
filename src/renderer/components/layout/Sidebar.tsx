import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Upload,
  Settings,
  Shield,
  ChevronLeft,
  Sparkles,
  Kanban,
  CheckSquare,
  Zap,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useUIStore } from '@/stores/uiStore'
import { useFollowUpStore } from '@/stores/followupStore'
import { useEffect } from 'react'

export function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { dueToday, overdue, fetchDueToday, fetchOverdue } = useFollowUpStore()

  useEffect(() => {
    fetchDueToday()
    fetchOverdue()
  }, [fetchDueToday, fetchOverdue])

  const followupCount = dueToday.length + overdue.length

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/contacts', icon: Users, label: t('nav.contacts') },
    { path: '/pipeline', icon: Kanban, label: t('nav.pipeline') },
    { path: '/tasks', icon: CheckSquare, label: t('nav.tasks') },
    { path: '/followups', icon: CalendarClock, label: t('nav.followups') },
    { path: '/automations', icon: Zap, label: t('nav.automations') },
    { path: '/reports', icon: BarChart3, label: t('nav.reports') },
    { path: '/smart-lists', icon: Sparkles, label: t('nav.smartLists') },
    { path: '/import', icon: Upload, label: t('nav.import') },
    { path: '/settings', icon: Settings, label: t('nav.settings') }
  ]

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-border transition-all duration-300 ease-in-out flex flex-col',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center w-full')}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight">VaultCRM</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Local-First
              </span>
            </div>
          )}
        </div>
        {sidebarOpen && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSidebar}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const showBadge = item.path === '/followups' && followupCount > 0

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/70',
                !sidebarOpen && 'justify-center px-2'
              )}
            >
              <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
              {sidebarOpen && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {showBadge && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-destructive text-destructive-foreground">
                      {followupCount}
                    </span>
                  )}
                </>
              )}
              {!sidebarOpen && showBadge && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Separator className="mb-3" />
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5',
            !sidebarOpen && 'justify-center px-2'
          )}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {sidebarOpen && (
            <span className="text-xs text-muted-foreground">{t('vault.localOnly', 'Data stored locally')}</span>
          )}
        </div>
      </div>

      {/* Collapse button when sidebar is closed */}
      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 -right-3 h-6 w-6 rounded-full border bg-background shadow-sm"
          onClick={toggleSidebar}
        >
          <ChevronLeft className="h-3 w-3 rotate-180" />
        </Button>
      )}
    </aside>
  )
}
