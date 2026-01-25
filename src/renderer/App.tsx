import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { Dashboard } from './pages/Dashboard'
import { Contacts } from './pages/Contacts'
import { ContactDetail } from './pages/ContactDetail'
import { FollowUps } from './pages/FollowUps'
import { Import } from './pages/Import'
import { Settings } from './pages/Settings'
import { Toaster } from './components/ui/toaster'

function App() {
  return (
    <>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/followups" element={<FollowUps />} />
          <Route path="/import" element={<Import />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </MainLayout>
      <Toaster />
    </>
  )
}

export default App
