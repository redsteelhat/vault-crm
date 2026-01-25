import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { Dashboard } from './pages/Dashboard'
import { Contacts } from './pages/Contacts'
import { ContactDetail } from './pages/ContactDetail'
import { FollowUps } from './pages/FollowUps'
import { Import } from './pages/Import'
import { Settings } from './pages/Settings'
import { SmartLists } from './pages/SmartLists'
import Pipeline from './pages/Pipeline'
import Tasks from './pages/Tasks'
import Automations from './pages/Automations'
import Reports from './pages/Reports'
import { Unlock } from './pages/Unlock'
import { Toaster } from './components/ui/toaster'
import { CommandPalette } from './components/CommandPalette'

function App() {
  const [isLocked, setIsLocked] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkVaultStatus()
    
    // Listen for lock events from main process
    const unsubscribe = window.api.on('vault:locked', () => {
      setIsLocked(true)
    })
    
    return () => {
      unsubscribe()
    }
  }, [])

  const checkVaultStatus = async () => {
    try {
      const locked = await window.api.vault.isLocked()
      setIsLocked(locked)
    } catch {
      // Vault not initialized yet
      setIsLocked(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlock = () => {
    setIsLocked(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-emerald-500 text-xl font-medium">
          Loading...
        </div>
      </div>
    )
  }

  if (isLocked) {
    return <Unlock onUnlock={handleUnlock} />
  }

  return (
    <>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/automations" element={<Automations />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/followups" element={<FollowUps />} />
          <Route path="/smart-lists" element={<SmartLists />} />
          <Route path="/import" element={<Import />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </MainLayout>
      <CommandPalette />
      <Toaster />
    </>
  )
}

export default App
