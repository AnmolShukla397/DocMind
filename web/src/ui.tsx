import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function Brand({ light = false }: { light?: boolean }) {
  return <Link to="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="DocMind home"><span className="brand-symbol" aria-hidden="true"><i /><i /></span><span>doc<em>mind</em></span></Link>
}

export function Button({ children, busy = false, quiet = false, className = '', ...props }: HTMLMotionProps<'button'> & { children: ReactNode; busy?: boolean; quiet?: boolean }) {
  return <motion.button {...props} className={`button ${quiet ? 'button-quiet' : ''} ${className}`} disabled={busy || props.disabled} aria-busy={busy}>
    <span className="button-content">{busy ? <><i className="button-spinner" /> Working…</> : children}</span><span className="button-leaf" aria-hidden="true"><i /><i /></span>
  </motion.button>
}

export function Notice({ message, type = 'error' }: { message: string; type?: 'error' | 'success' }) {
  return message ? <div className={`notice notice-${type}`} role={type === 'error' ? 'alert' : 'status'}>{message}</div> : null
}
