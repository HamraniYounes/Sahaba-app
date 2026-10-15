import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, hasAdminRole } from '../contexts/AuthContext'
import type { ReactNode } from 'react'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="page-wrap"><div className="loading-block">Chargement de votre session…</div></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="page-wrap"><div className="loading-block">Vérification des autorisations…</div></div>
  if (!user) return <Navigate to="/login" replace />
  if (!hasAdminRole(profile?.role)) return <Navigate to="/" replace />
  return children
}