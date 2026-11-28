import {
  useEffect,
  useState,
} from 'react'

import {
  LockKeyhole,
  UserRound,
} from 'lucide-react'

import logo from '../assets/jco-logo.png'
import ConnectionSettingsForm from '../components/settings/ConnectionSettingsForm'
import FirstRunSetup from '../components/first-run/FirstRunSetup'
import type { LocationOption } from '../../electron/settings/settings.types.js'

import {
  useAuth,
} from '../auth/useAuth'

function LoginPage() {
  const {
    login,
  } = useAuth()

  const [
    username,
    setUsername,
  ] = useState('')

  const [
    password,
    setPassword,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    systemReady,
    setSystemReady,
  ] = useState(false)

  const [
    systemStatus,
    setSystemStatus,
  ] =
    useState(
      'Checking system...',
    )

  const [
    checkingSystem,
    setCheckingSystem,
  ] = useState(true)
  const [appVersion, setAppVersion] = useState('')

  const [showConnectionSettings, setShowConnectionSettings] = useState(false)
  const [requiresStoreSelection, setRequiresStoreSelection] = useState(false)
  const [setupStores, setSetupStores] = useState<LocationOption[]>([])
  const [setupStoreId, setSetupStoreId] = useState<number | null>(null)
  const [setupError, setSetupError] = useState('')
  const [setupBusy, setSetupBusy] = useState(false)
  const [showFirstRunSetup, setShowFirstRunSetup] = useState(false)

  useEffect(() => {
    void window.api.app.getVersion()
      .then(setAppVersion)
      .catch((versionError: unknown) => {
        console.error('Unable to read application version:', versionError)
      })

    async function runStartupChecks() {
      try {
        setCheckingSystem(
          true,
        )

        setSystemStatus(
          'Connecting to database...',
        )

        const health =
          await window.api.system
            .healthCheck()

        setRequiresStoreSelection(health.requiresStoreSelection)
        if (health.requiresStoreSelection) {
          setSystemReady(false)
          setSystemStatus(health.message)
          setSetupError(health.localSetupError ?? '')
          try {
            setSetupStores(await window.api.settings.getFirstRunStoreOptions())
          } catch (error) {
            setSetupError(error instanceof Error ? error.message : 'Unable to load available stores.')
          }
          return
        }

        if (!health.localDbConnected) {
          setSystemReady(
            false,
          )

          setSystemStatus(
            health.message,
          )

          return
        }

        if (!health.localLocationTableExists) {
          setShowFirstRunSetup(true)
          return
        }

        if (!health.hqDbConnected) {
          setSystemReady(true)
          setSystemStatus(
            health.message,
          )
          return
        }

        setSystemStatus(
          'Checking application version...',
        )

        const version =
          await window.api.system
            .checkVersion()

        console.log(
          'Version check:',
          version,
        )

        if (
          version.success &&
          version.updateAvailable
        ) {
          setSystemStatus(
            `Update available: v${version.latestVersion}`,
          )
        } else {
          setSystemStatus(
            'System Ready',
          )
        }

        setSystemReady(
          true,
        )
      } catch (error) {
        console.error(
          'Startup check failed:',
          error,
        )

        setSystemReady(
          false,
        )

        setSystemStatus(
          'System startup check failed.',
        )
      } finally {
        setCheckingSystem(
          false,
        )
      }
    }

    runStartupChecks()
  }, [])

  async function refreshFirstRunStores() {
    setSetupBusy(true)
    setSetupError('')
    try {
      setSetupStores(await window.api.settings.getFirstRunStoreOptions())
      setSetupStoreId(null)
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Unable to load available stores.')
    } finally {
      setSetupBusy(false)
    }
  }

  async function finishFirstRunSetup() {
    if (setupStoreId === null) {
      setSetupError('Select a store for this POS to continue.')
      return
    }

    setSetupBusy(true)
    setSetupError('')
    try {
      await window.api.settings.setFirstRunStore(setupStoreId)
      const health = await window.api.system.healthCheck()
      setRequiresStoreSelection(health.requiresStoreSelection)
      setSystemReady(health.ready)
      setSystemStatus(health.message)
      setSetupStores([])
      setSetupStoreId(null)
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Unable to assign this POS to the selected store.')
    } finally {
      setSetupBusy(false)
    }
  }

  async function handleFirstRunSetupComplete() {
    setShowFirstRunSetup(false)
    setCheckingSystem(true)
    try {
      const health = await window.api.system.healthCheck()
      setRequiresStoreSelection(health.requiresStoreSelection)
      setSystemReady(health.ready)
      setSystemStatus(health.message)
      if (health.requiresStoreSelection) {
        try {
          setSetupStores(await window.api.settings.getFirstRunStoreOptions())
        } catch (storeError) {
          setSetupError(storeError instanceof Error ? storeError.message : 'Unable to load available stores.')
        }
      }
    } catch (healthError) {
      setSystemReady(false)
      setSystemStatus(healthError instanceof Error ? healthError.message : 'Unable to check database connections.')
    } finally {
      setCheckingSystem(false)
    }
  }

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')

    if (
      !username.trim() ||
      !password.trim()
    ) {
      setError(
        'Please enter your username and password.',
      )

      return
    }

    setLoading(true)

    const result =
      await login(
        username,
        password,
      )

    if (result.success) {
      return
    }

    setLoading(false)

    setError(
      result.message || 'Login failed.',
    )
  }

  const statusClass =
    systemReady
      ? systemStatus.startsWith('Unable to connect')
        ? 'text-warning'
        : 'text-success'
      : checkingSystem
        ? 'text-secondary'
        : 'text-danger'

  return (
    <>
      {showFirstRunSetup && <FirstRunSetup onComplete={handleFirstRunSetupComplete} />}
    <div
      className="
        min-vh-100
        d-flex
        align-items-center
        justify-content-center
        p-3
        p-md-4
        login-page-bootstrap
      "
    >
      <div
        className="
          bg-white
          rounded-4
          shadow-sm
          border
          overflow-hidden
          w-100
        "
        style={{
          maxWidth: '440px',
        }}
      >
        {/* Brand */}

        <div
          className="
            border-bottom
            px-4
            py-4
            d-flex
            align-items-center
            gap-3
          "
        >
          <img
            src={logo}
            alt="Oracle Reporting Tool"
            className="login-logo-bootstrap"
          />

          <div>
            <h1 className="h5 fw-bold mb-1">
              Oracle Reporting Tool
            </h1>

            <p className="small text-secondary mb-0">
              Contemporain Foods Inc.
            </p>
          </div>
        </div>

        {/* Content */}

        <div className="p-4">

          <div className="mb-4">

            <div
              className="
                text-uppercase
                fw-bold
                small
                mb-2
                brand-text
              "
            >
              {requiresStoreSelection ? 'First-time setup' : 'Welcome'}
            </div>

            <h2 className="h4 fw-bold mb-2">
              {requiresStoreSelection ? 'Choose this POS store' : 'Sign in'}
            </h2>

            <p className="text-secondary small mb-0">
              {requiresStoreSelection
                ? 'Select the store assigned to this computer. It will be saved in CheckPostingDB before sign-in is enabled.'
                : 'Access reports, transactions, finance modules, and system tools.'}
            </p>

          </div>

          {requiresStoreSelection ? (
            <div>
              {setupError && <div className="alert alert-danger py-2" role="alert">{setupError}</div>}
              <label className="form-label fw-semibold" htmlFor="first-run-store">Store location</label>
              <select
                id="first-run-store"
                className="form-select mb-3"
                value={setupStoreId ?? ''}
                onChange={(event) => setSetupStoreId(event.target.value ? Number(event.target.value) : null)}
                disabled={setupBusy || setupStores.length === 0}
              >
                <option value="">Select a store</option>
                {setupStores.map((store) => (
                  <option key={store.locationId} value={store.locationId}>{store.locationName}</option>
                ))}
              </select>
              {setupStores.length === 0 && !setupError && (
                <p className="small text-secondary">No active Store locations were returned by OracleDB.</p>
              )}
              <button type="button" className="btn btn-primary w-100 mb-2" onClick={() => void finishFirstRunSetup()} disabled={setupBusy || setupStoreId === null}>
                {setupBusy ? 'Saving store...' : 'Save store and continue'}
              </button>
              <button type="button" className="btn btn-outline-secondary w-100 mb-2" onClick={() => void refreshFirstRunStores()} disabled={setupBusy}>
                {setupBusy ? 'Loading...' : 'Refresh store list'}
              </button>
              <button type="button" className="btn btn-link w-100" onClick={() => setShowConnectionSettings(true)}>
                Configure database connections
              </button>
            </div>
          ) : (
          <form
            onSubmit={
              handleSubmit
            }
          >
            {/* Username */}

            <div className="mb-3">

              <label
                htmlFor="username"
                className="form-label fw-semibold"
              >
                Username
              </label>

              <div className="input-group">

                <span className="input-group-text bg-light">
                  <UserRound
                    size={18}
                  />
                </span>

                <input
                  id="username"
                  type="text"
                  className="form-control"
                  value={
                    username
                  }
                  onChange={(
                    event,
                  ) =>
                    setUsername(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Enter username"
                  autoComplete="username"
                  disabled={
                    loading
                  }
                />

              </div>

            </div>

            {/* Password */}

            <div className="mb-3">

              <label
                htmlFor="password"
                className="form-label fw-semibold"
              >
                Password
              </label>

              <div className="input-group">

                <span className="input-group-text bg-light">
                  <LockKeyhole
                    size={18}
                  />
                </span>

                <input
                  id="password"
                  type="password"
                  className="form-control"
                  value={
                    password
                  }
                  onChange={(
                    event,
                  ) =>
                    setPassword(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={
                    loading
                  }
                />

              </div>

            </div>

            {/* Login error */}

            {error && (
              <div
                className="
                  alert
                  alert-danger
                  py-2
                  small
                  mb-3
                "
                role="alert"
              >
                {error}
              </div>
            )}

            {/* System status */}

            <div
              className="
                bg-light
                border
                rounded-3
                px-3
                py-2
                mb-3
                d-flex
                align-items-center
                gap-2
                small
              "
            >
              {checkingSystem ? (
                <span
                  className="
                    spinner-border
                    spinner-border-sm
                    text-secondary
                  "
                  role="status"
                  aria-hidden="true"
                />
              ) : (
                <span
                  className={`
                    login-status-dot
                    ${
                      systemReady
                        ? systemStatus.startsWith('Unable to connect')
                          ? 'bg-warning'
                          : 'bg-success'
                        : 'bg-danger'
                    }
                  `}
                />
              )}

              <span
                className={
                  statusClass
                }
              >
                {systemStatus}
              </span>
              {appVersion && <span className="text-secondary">· v{appVersion}</span>}

            </div>

            {!checkingSystem && !systemReady && (
              <button
                type="button"
                className="btn btn-outline-primary w-100 mb-3"
                onClick={() => setShowConnectionSettings(true)}
              >
                Configure database connections
              </button>
            )}

            {/* Submit */}

            <button
              type="submit"
              className="
                btn
                btn-primary
                w-100
                py-2
                fw-semibold
              "
              disabled={
                loading ||
                checkingSystem
              }
            >
              {checkingSystem
                ? 'Checking system...'
                : loading
                  ? 'Signing in...'
                  : 'Sign In'}
            </button>

          </form>
          )}

        </div>

        {/* Footer */}

        <div
          className="
            border-top
            bg-light
            px-4
            py-3
            text-center
            small
            text-secondary
          "
        >
          Oracle Reporting Tool
          <span className="mx-2">
            •
          </span>
          Secure Desktop Access
        </div>

      </div>
    </div>
    {showConnectionSettings && (
      <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center p-3" style={{ zIndex: 1050 }}>
        <div className="bg-white rounded-3 shadow p-4 w-100 overflow-auto" style={{ maxWidth: 1100, maxHeight: '95vh' }}>
          <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
            <div>
              <h2 className="h5 mb-1">Connection setup</h2>
              <p className="text-secondary mb-0">Configure and test database connections to enable login.</p>
            </div>
            <button type="button" className="btn-close" aria-label="Close settings" onClick={() => setShowConnectionSettings(false)} />
          </div>
          <ConnectionSettingsForm
            mode="bootstrap"
            onCancel={() => setShowConnectionSettings(false)}
            onSaved={() => {
              setShowConnectionSettings(false)
              setCheckingSystem(true)
              void window.api.system.healthCheck()
                .then((health) => {
                  setRequiresStoreSelection(health.requiresStoreSelection)
                  setSystemReady(health.ready && !health.requiresStoreSelection)
                  setSystemStatus(health.message)
                  if (health.requiresStoreSelection) {
                    void window.api.settings.getFirstRunStoreOptions()
                      .then(setSetupStores)
                      .catch((storeError: unknown) => setSetupError(storeError instanceof Error ? storeError.message : 'Unable to load available stores.'))
                  }
                  if (health.localLocationTableExists) {
                    setShowConnectionSettings(false)
                  }
                })
                .catch((healthError: unknown) => {
                  setSystemReady(false)
                  setSystemStatus(healthError instanceof Error ? healthError.message : 'Unable to check database connections.')
                })
                .finally(() => setCheckingSystem(false))
            }}
          />
        </div>
      </div>
    )}
    </>
  )
}

export default LoginPage
