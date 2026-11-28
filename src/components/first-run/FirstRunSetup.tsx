import { useEffect, useState } from 'react'

type FirstRunSetupProps = {
  onComplete: () => void
}

function FirstRunSetup({ onComplete }: FirstRunSetupProps) {
  const [status, setStatus] = useState('Preparing first-run setup...')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function runSetup() {
      try {
        setStatus('Connecting to local database...')
        const result = await window.api.system.runFirstRunSetup()

        if (cancelled) return

        if (!result.success) {
          setError(result.message || 'First-run setup failed.')
          setDone(true)
          return
        }

        setStatus('Creating app_schema_migrations table...')
        await new Promise((resolve) => setTimeout(resolve, 400))
        if (cancelled) return

        setStatus('Creating dts_location table...')
        await new Promise((resolve) => setTimeout(resolve, 400))
        if (cancelled) return

        setStatus('Creating dts_hourly_entry and dts_summary_input tables...')
        await new Promise((resolve) => setTimeout(resolve, 400))
        if (cancelled) return

        setStatus('Seeding store locations...')
        await new Promise((resolve) => setTimeout(resolve, 400))
        if (cancelled) return

        setStatus('First-run setup complete.')
        setDone(true)
        onComplete()
      } catch (setupError) {
        if (cancelled) return
        setError(setupError instanceof Error ? setupError.message : 'First-run setup failed.')
        setDone(true)
      }
    }

    runSetup()

    return () => {
      cancelled = true
    }
  }, [onComplete])

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="text-center p-4 bg-white rounded-4 shadow-sm border" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="mb-4">
          <div className="spinner-border text-primary" role="status" style={{ width: '4rem', height: '4rem' }} />
        </div>

        <h2 className="h5 fw-bold mb-3">First-time setup</h2>

        <p className="text-muted small mb-4">Initializing the local POS database. Please wait...</p>

        <div className="mb-3">
          <div className="d-flex justify-content-between small mb-1">
            <span className="text-secondary">{status}</span>
          </div>
          <div className="progress bg-light" style={{ height: '8px' }}>
            <div
              className="progress-bar bg-primary progress-bar-striped progress-bar-animated"
              role="progressbar"
              style={{ width: done ? '100%' : '50%' }}
            />
          </div>
        </div>

        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      </div>
    </div>
  )
}

export default FirstRunSetup
