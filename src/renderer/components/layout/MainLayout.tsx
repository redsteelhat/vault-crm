import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarOpen } = useUIStore()

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main
          className={cn(
            'min-h-screen transition-all duration-300 ease-in-out',
            sidebarOpen ? 'ml-64' : 'ml-16'
          )}
        >
          {children}
        </main>
      </div>
    </TooltipProvider>
  )
}
