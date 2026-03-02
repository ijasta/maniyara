import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from './lib/AuthContext'
import { getSettings } from './lib/supabase'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import PendingPage from './pages/PendingPage'
import Dashboard from './pages/Dashboard'
import MyTask from './pages/MyTask'
import ResetPassword from './pages/ResetPassword'

import Expenses from './pages/Expenses'
import CommonFund from './pages/CommonFund'
import AdminPanel from './pages/AdminPanel'
import TaskAssigner from './pages/TaskAssigner'
import MaintenancePage from './pages/MaintenancePage'
import LoadingScreen from './components/LoadingScreen'

function Guard({ children, adminOnly }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/auth" replace />
  if (profile?.status === 'pending')  return <Navigate to="/pending" replace />
  if (profile?.status === 'rejected') return <Navigate to="/auth" replace />
  if (adminOnly && !profile?.is_admin) return <Navigate to="/" replace />
  return children
}

function PageGuard({ enabled, children }) {
  if (enabled === false) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user, profile, loading } = useAuth()
  const [siteSettings, setSiteSettings] = useState(null)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [adminOverride, setAdminOverride] = useState(false)

  useEffect(() => {
    getSettings()
      .then(s => setSiteSettings(s))
      .catch(() => {})
      .finally(() => setSettingsLoaded(true))
  }, [])

  if (loading || !settingsLoaded) return <LoadingScreen />

  const inMaintenance = siteSettings?.maintenance_mode && !adminOverride
  if (inMaintenance && user) {
    return (
      <MaintenancePage
        message={siteSettings?.maintenance_message}
        isAdmin={profile?.is_admin}
        onExit={() => setAdminOverride(true)}
      />
    )
  }

  const pages = {
    dashboard: siteSettings?.page_dashboard !== false,
    mytask:    siteSettings?.page_mytask    !== false,
    members:   false,
    expenses:  siteSettings?.page_expenses  !== false,
    fund:      siteSettings?.page_fund      !== false,
  }

  // Task assigner: is current user the assigned task assigner?
  const isTaskAssigner = user && siteSettings?.task_assigner_id === user.id

  return (
    <Routes>
      <Route path="/auth" element={user && profile?.status === 'approved' ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/pending" element={<PendingPage />} />
      <Route path="/" element={<Guard><Layout siteSettings={siteSettings} isTaskAssigner={isTaskAssigner}/></Guard>}>
        <Route index          element={<PageGuard enabled={pages.dashboard}><Dashboard /></PageGuard>} />
        <Route path="mytask"  element={<PageGuard enabled={pages.mytask}><MyTask /></PageGuard>} />
        <Route path="reset-password" element={<ResetPassword />} />

        <Route path="expenses"element={<PageGuard enabled={pages.expenses}><Expenses /></PageGuard>} />
        <Route path="fund"    element={<PageGuard enabled={pages.fund}><CommonFund /></PageGuard>} />
        <Route path="assign"  element={<Guard><TaskAssigner /></Guard>} />
        <Route path="admin"   element={<Guard adminOnly><AdminPanel onSettingsChange={()=>getSettings().then(setSiteSettings)}/></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
