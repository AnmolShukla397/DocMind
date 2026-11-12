import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { api, type User } from './api'
import { Brand, Button, Notice } from './ui'

export default function Auth({ onUser }: { onUser: (user: User) => void }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [create, setCreate] = useState(params.has('create'))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return }
    if (create && name.trim().length < 2) { setError('Enter your name.'); return }
    if (create && password.length < 8) { setError('Use a password of at least 8 characters.'); return }
    if (!password) { setError('Enter your password.'); return }
    setBusy(true)
    try {
      const user = await api<User>(create ? '/auth/signup' : '/auth/login',
        create ? { name, email, password } : { email, password })
      onUser(user)
      navigate('/app', { replace: true })
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return <div className="auth-page">
    <div className="auth-art"><div className="auth-art-head"><Brand light /><span>YOUR PRIVATE LIBRARY</span></div><div className="auth-art-orbit" aria-hidden="true"><i /><i /><i /><span>DM</span></div><div className="auth-art-copy"><p>READ WITH A WAY BACK</p><h1>Every thought<br /><em>has a source.</em></h1><div className="auth-art-citation"><span>↗</span><p>Ask freely. Follow each finding to the page that supports it.</p><small>DOCMIND / DOCUMENT RESEARCH</small></div></div></div>
    <div className="auth-form-side"><Link to="/" className="auth-back">← Back to the story</Link><div className="auth-form-inner"><div className="auth-title"><span>YOUR PRIVATE RESEARCH SPACE</span><h2>{create ? 'Start with your curiosity.' : 'Welcome back.'}</h2><p>{create ? 'Create a place for your documents, questions, and discoveries.' : 'Sign in to continue your work.'}</p></div><div className="auth-tabs" role="tablist" aria-label="Account action"><button type="button" role="tab" aria-selected={!create} className={!create ? 'active' : ''} onClick={() => { setCreate(false); setError('') }}>Sign in</button><button type="button" role="tab" aria-selected={create} className={create ? 'active' : ''} onClick={() => { setCreate(true); setError('') }}>Create account</button></div><AnimatePresence mode="wait"><motion.form key={create ? 'create' : 'login'} className="auth-form" onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .22 }}>{create && <label><span>Full name</span><input autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Your name" required /></label>}<label><span>Email address</span><input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" required /></label><label><span>Password</span><span className="password-field"><input aria-label="Password" type={visible ? 'text' : 'password'} autoComplete={create ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder={create ? 'At least 8 characters' : 'Your password'} minLength={create ? 8 : undefined} required /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(value => !value)}>{visible ? 'Hide' : 'Show'}</button></span></label><Notice message={error} /><Button type="submit" busy={busy}>{create ? 'Create account' : 'Sign in'}</Button></motion.form></AnimatePresence><p className="auth-privacy">Your password is stored as a salted hash. Your library and conversations remain tied to your account on this installation. <Link to="/privacy">Read how DocMind handles data</Link>.</p></div></div>
  </div>
}
