import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, getMemberProfile } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const loggedRef = useRef(false) // prevent duplicate login logs

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      setUser(session?.user ?? null)
      session?.user ? loadProfile(session.user.id) : setLoading(false)
    }).catch(() => { clearTimeout(timeout); setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        loadProfile(session.user.id, event)
      } else {
        setProfile(null)
        setLoading(false)
        loggedRef.current = false
      }
    })

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  async function loadProfile(userId, event) {
    try {
      const p = await getMemberProfile(userId)
      setProfile(p)

      // Log sign in — only once per session, only for SIGNED_IN event
      if ((event === 'SIGNED_IN') && !loggedRef.current && p?.status === 'approved') {
        loggedRef.current = true
        await supabase.from('logs').insert({
          action:  `${p.name} logged in`,
          actor:   p.name,
          details: `${p.is_admin ? 'Admin' : 'Member'} · ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
        }).then(() => {}).catch(() => {}) // silent fail — don't block login
      }
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = () => user && loadProfile(user.id)

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
