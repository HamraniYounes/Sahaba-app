import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Profile, UserRole } from '../types/database'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  configured: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) { setProfile(null); return }
    const { data, error } = await supabase.from('profiles')
      .select('id, display_name, avatar_url, role, created_at, contribution_badge')
      .eq('id', userId).maybeSingle()
    if (error) {
      console.error('Impossible de charger le profil Supabase:', error.message)
      setProfile(null)
      return
    }
    setProfile(data as Profile | null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id)
  }, [user, loadProfile])

  useEffect(() => {
    let alive = true
    if (!isSupabaseConfigured) { setLoading(false); return }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (!nextSession) { setProfile(null); setLoading(false) }
      else queueMicrotask(() => {
        if (alive) void loadProfile(nextSession.user.id).finally(() => { if (alive) setLoading(false) })
      })
    })

    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (!alive) return
      if (error) console.error('Impossible de restaurer la session:', error.message)
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) await loadProfile(data.session.user.id)
      else setProfile(null)
      if (alive) setLoading(false)
    }).catch((error: unknown) => {
      console.error('Erreur lors de la restauration de session:', error)
      if (alive) setLoading(false)
    })

    return () => { alive = false; subscription.unsubscribe() }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) throw new Error('Supabase n’est pas configuré.')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return <AuthContext.Provider value={{ user, session, profile, loading, configured: isSupabaseConfigured, signOut, refreshProfile }}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return value
}
export function hasAdminRole(role: UserRole | undefined) { return role === 'admin' || role === 'moderator' }
