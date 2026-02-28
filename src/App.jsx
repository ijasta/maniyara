import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import PendingPage from './pages/PendingPage'
import Dashboard from './pages/Dashboard'
import MyTask from './pages/MyTask'
import Members from './pages/Members'
import Expenses from './pages/Expenses'
import CommonFund from './pages/CommonFund'
import AdminPanel from './pages/AdminPanel'
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

export default function App() {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />

  return (
    <Routes>
      <Route path="/auth" element={user && profile?.status === 'approved' ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/pending" element={<PendingPage />} />
      <Route path="/" element={<Guard><Layout /></Guard>}>
        <Route index           element={<Dashboard />} />
        <Route path="mytask"   element={<MyTask />} />
        <Route path="members"  element={<Members />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="fund"     element={<CommonFund />} />
        <Route path="admin"    element={<Guard adminOnly><AdminPanel /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
