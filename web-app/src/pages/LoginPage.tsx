import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LockKeyhole, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import jcoLogo from '../../assets/jco-logo.png'
import { useAuth } from '../auth/useAuth'

interface SystemHealth {
  ready: boolean
  localDbConnected: boolean
  hqDbConnected: boolean
  message: string
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [checkingSystem, setCheckingSystem] = useState(true)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()
    async function checkSystem() {
      setCheckingSystem(true)
      try {
        const response = await fetch('/api/system/health', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })
        const result = await response.json() as SystemHealth
        setHealth(result)
      } catch {
        if (!controller.signal.aborted) {
          setHealth({ ready: false, localDbConnected: false, hqDbConnected: false, message: 'System startup check failed.' })
        }
      } finally {
        if (!controller.signal.aborted) setCheckingSystem(false)
      }
    }
    void checkSystem()
    return () => controller.abort()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('Please enter your username and password.')
      return
    }

    setSubmitting(true)
    try {
      await signIn(username, password)
      navigate('/dashboard', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Invalid username or password.')
    } finally {
      setSubmitting(false)
    }
  }

  const statusText = checkingSystem ? 'Connecting to databases…' : health?.message ?? 'System startup check failed.'
  const statusClass = health?.ready ? 'login-status-ready' : checkingSystem ? 'login-status-checking' : 'login-status-failed'

  return (
    <main className="login-page">
      <section className="login-form-panel" aria-label="Sign in">
        <div className="login-card login-desktop-card">
          <header className="login-desktop-brand">
            <img className="login-logo" src={jcoLogo} alt="Oracle Reporting Tool" />
            <div><h1>Oracle Reporting Tool</h1><p>Contemporain Foods Inc.</p></div>
          </header>

          <div className="login-welcome">
            <div className="eyebrow">WELCOME BACK</div>
            <h2>Sign in to continue</h2>
            <p>Access reports, transactions, finance modules, and system tools.</p>
          </div>

          <form className="login-form login-desktop-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="field">
              <label htmlFor="username">Username</label>
              <div className="input-with-icon"><UserRound size={18} /><input id="username" name="username" type="text" autoComplete="username" placeholder="Enter username" value={username} onChange={(event) => setUsername(event.target.value)} disabled={submitting} required autoFocus /></div>
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon"><LockKeyhole size={18} /><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={submitting} required /></div>
            </div>

            {error && <div className="login-error" role="alert">{error}</div>}

            <div className={`login-system-status ${statusClass}`} role="status" aria-live="polite">
              {checkingSystem ? <span className="button-spinner" aria-hidden="true" /> : <span className="login-status-dot" />}
              <span>{statusText}</span>
            </div>

            <button type="submit" className="login-submit" disabled={submitting || checkingSystem || !health?.ready}>
              {checkingSystem ? 'Checking system…' : submitting ? <><span className="button-spinner" />Signing in…</> : 'Sign In'}
            </button>
          </form>

          <footer className="login-desktop-footer">Oracle Reporting Tool <span>•</span> Secure Desktop Access</footer>
        </div>
      </section>
    </main>
  )
}
