import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Layers, RotateCw } from 'lucide-react'

type FirstRunSetupProps = {
  onComplete: () => void
}

const INIT_MESSAGES = [
  'Initializing components...',
  'Configuring application modules...',
  'Preparing workspace services...',
  'Finalizing component setup...',
]

function FirstRunSetup({ onComplete }: FirstRunSetupProps) {
  const [status, setStatus] = useState(INIT_MESSAGES[0])
  const [progress, setProgress] = useState(14)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  const handleRetry = useCallback(() => {
    setError('')
    setCompleted(false)
    setProgress(14)
    setStatus(INIT_MESSAGES[0])
    setAttempt((prev) => prev + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    let phaseIndex = 0

    const progressTimer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 86) return prev
        const step = prev < 45 ? 8 : prev < 70 ? 4 : 2
        return Math.min(86, prev + step)
      })
    }, 350)

    const messageTimer = window.setInterval(() => {
      phaseIndex = Math.min(phaseIndex + 1, INIT_MESSAGES.length - 1)
      setStatus(INIT_MESSAGES[phaseIndex])
    }, 1200)

    async function runSetup() {
      try {
        const result = await window.api.system.runFirstRunSetup()

        if (cancelled) return

        window.clearInterval(progressTimer)
        window.clearInterval(messageTimer)

        if (!result.success) {
          setError(result.message || 'Component initialization could not be completed.')
          return
        }

        setStatus('Components initialized')
        setProgress(100)
        setCompleted(true)

        await new Promise((resolve) => window.setTimeout(resolve, 450))
        if (cancelled) return

        onComplete()
      } catch (setupError) {
        if (cancelled) return
        window.clearInterval(progressTimer)
        window.clearInterval(messageTimer)
        setError(
          setupError instanceof Error
            ? setupError.message
            : 'Component initialization could not be completed.',
        )
      }
    }

    void runSetup()

    return () => {
      cancelled = true
      window.clearInterval(progressTimer)
      window.clearInterval(messageTimer)
    }
  }, [attempt, onComplete])

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3 p-md-4 login-page-bootstrap"
      style={{ zIndex: 1800 }}
      role="status"
      aria-live="polite"
      aria-busy={!error && !completed}
    >
      <div className="first-run-card bg-white rounded-4 shadow-sm border p-4 p-md-5 text-center w-100">
        <div className="first-run-loader-wrap mx-auto mb-4">
          {error ? (
            <div className="first-run-state-icon first-run-state-icon-error">
              <AlertCircle size={28} />
            </div>
          ) : completed ? (
            <div className="first-run-state-icon first-run-state-icon-success">
              <CheckCircle2 size={28} />
            </div>
          ) : (
            <div className="modern-orbital-loader" aria-hidden="true">
              <span className="modern-orbital-ring modern-orbital-ring-outer" />
              <span className="modern-orbital-ring modern-orbital-ring-inner" />
              <span className="modern-orbital-core">
                <Layers size={22} />
              </span>
            </div>
          )}
        </div>

        <div className="text-uppercase fw-bold small mb-2 brand-text first-run-kicker">
          First-Time Setup
        </div>

        <h2 className="h4 fw-bold mb-2">
          {error ? 'Initialization Interrupted' : 'Initializing Component'}
        </h2>

        <p className="text-secondary small mb-4">
          {error
            ? 'A required setup step could not be completed. Please try again.'
            : 'Preparing application components for first-time use. Please wait...'}
        </p>

        {!error && (
          <div className="first-run-progress-panel rounded-3 border p-3 mb-2 text-start">
            <div className="d-flex align-items-center justify-content-between gap-2 small mb-2">
              <span className="fw-medium text-secondary">{status}</span>
              <span className="fw-semibold brand-text tabular-nums">{progress}%</span>
            </div>
            <div
              className="modern-progress-track"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`modern-progress-fill ${completed ? 'is-complete' : 'is-animated'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3">
            <div className="alert alert-danger py-2 px-3 small text-start mb-3" role="alert">
              {error}
            </div>
            <button
              type="button"
              className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
              onClick={handleRetry}
            >
              <RotateCw size={16} />
              <span>Retry Initialization</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FirstRunSetup
