import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { api, type User } from './api'
import Landing from './Landing'
import Auth from './Auth'
import SiteInfo from './SiteInfo'
import { Brand } from './ui'

const Workspace = lazy(() => import('./Workspace'))

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    api<User>('/auth/session').then(setUser).catch(() => setUser(null)).finally(() => setReady(true))
  }, [])
  useEffect(() => {
    function expired() { setUser(null); navigate('/auth', { replace: true }) }
    window.addEventListener('docmind:expired', expired)
    return () => window.removeEventListener('docmind:expired', expired)
  }, [navigate])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  if (!ready) return <div className="boot"><Brand /><span className="loading-orbit" /><p>Opening your library…</p></div>
  return <AnimatePresence mode="wait"><Routes>
    <Route path="/" element={<Landing user={user} />} />
    <Route path="/privacy" element={<SiteInfo kind="privacy" />} />
    <Route path="/terms" element={<SiteInfo kind="terms" />} />
    <Route path="/accessibility" element={<SiteInfo kind="accessibility" />} />
    <Route path="/auth" element={user ? <Navigate to="/app" replace /> : <Auth onUser={setUser} />} />
    <Route path="/app" element={user ? <Suspense fallback={<div className="boot"><Brand /><span className="loading-orbit" /><p>Opening your library…</p></div>}><Workspace user={user} onUser={setUser} /></Suspense> : <Navigate to="/auth" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AnimatePresence>
}
