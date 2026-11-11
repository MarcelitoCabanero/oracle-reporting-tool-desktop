import { useEffect, useState } from 'react'

import type {
  ConnectionSettingsView,
  DatabaseConnectionSettingsView,
  DatabaseKey,
  LocationOption,
} from '../../../electron/settings/settings.types.js'

type SettingsMode = 'bootstrap' | 'admin'

interface ConnectionSettingsFormProps {
  mode: SettingsMode
  adminToken?: string
  onSaved: () => void
  onCancel?: () => void
}

const databaseLabels: Record<DatabaseKey, string> = {
  local: 'Local POS database (checkpostingdb)',
  hq: 'HQ server connection (OracleDB)',
  headq: 'HEADQ database',
  hourly: 'Hourly sales / OracleDB source',
}

const editableDatabaseKeys: DatabaseKey[] = ['local', 'hq']
const sharedHqDatabaseKeys: DatabaseKey[] = ['headq', 'hourly']

function ConnectionSettingsForm({
  mode,
  adminToken,
  onSaved,
  onCancel,
}: ConnectionSettingsFormProps) {
  const [settings, setSettings] = useState<ConnectionSettingsView | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([])
  const [selectedLocationIds, setSelectedLocationIds] = useState<number[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [confirmTableReset, setConfirmTableReset] = useState(false)

  useEffect(() => {
    let active = true
    window.api.settings.get()
      .then((result) => {
        if (active) setSettings(result)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  function updateDatabase(
    key: DatabaseKey,
    field: keyof DatabaseConnectionSettingsView,
    value: string | number,
  ) {
    setSettings((current) => current && ({
      ...current,
      databases: {
        ...current.databases,
        [key]: { ...current.databases[key], [field]: value },
      },
    }))
  }

  async function testDatabase(key: DatabaseKey) {
    if (!settings) return
    setTesting(key)
    setError('')
    setMessage('')
    try {
      const result = await window.api.settings.testDatabase(settings, key, adminToken)
      setMessage(result.message)
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : `${databaseLabels[key]} test failed.`)
    } finally {
      setTesting(null)
    }
  }

  async function testFtp() {
    if (!settings) return
    setTesting('ftp')
    setError('')
    setMessage('')
    try {
      const result = await window.api.settings.testFtp(settings, adminToken)
      setMessage(result.message)
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'FTP connection test failed.')
    } finally {
      setTesting(null)
    }
  }

  async function loadLocations() {
    if (!settings) return
    setLoadingLocations(true)
    setError('')
    setMessage('')
    try {
      const result = await window.api.settings.getLocationOptions(settings, adminToken)
      setLocationOptions(result)
      setSelectedLocationIds([])
      setConfirmTableReset(false)
      if (result.length === 0) {
        setError('No active store locations were found in the configured OracleDB dbo.dts_location table.')
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load locations from OracleDB.')
    } finally {
      setLoadingLocations(false)
    }
  }

  async function createLocalTables() {
    if (!settings || selectedLocationIds.length === 0 || !confirmTableReset) return
    setProvisioning(true)
    setError('')
    setMessage('')
    try {
      const result = await window.api.settings.provisionLocalDatabase(
        settings,
        selectedLocationIds,
        adminToken,
      )
      setMessage(result.message)
      setConfirmTableReset(false)
      onSaved()
    } catch (provisionError) {
      setError(provisionError instanceof Error ? provisionError.message : 'Unable to create the local POS tables.')
    } finally {
      setProvisioning(false)
    }
  }

  async function save() {
    if (!settings) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = mode === 'admin' && adminToken
        ? await window.api.settings.saveAdmin(settings, adminToken)
        : await window.api.settings.saveBootstrap(settings)
      setMessage(result.message)
      onSaved()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-secondary mb-0">Loading saved connection settings...</p>
  }

  if (!settings) {
    return <div className="alert alert-danger mb-0">{error || 'Unable to load settings.'}</div>
  }

  return (
    <div>
      <p className="text-secondary">
        Configure only the local POS server and the HQ server. OracleDB, HEADQ, and hourly reporting databases all use the same HQ server, port, username, and password. Connection passwords are encrypted on this device; leave a password blank to keep it.
      </p>

      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      {message && <div className="alert alert-info py-2" role="status">{message}</div>}

      <div className="row g-3">
        {editableDatabaseKeys.map((key) => {
          const connection = settings.databases[key]
          return (
            <section className="col-12 col-xl-6" key={key}>
              <div className="border rounded-3 p-3 h-100">
                <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                  <h3 className="h6 mb-0">{databaseLabels[key]}</h3>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    type="button"
                    disabled={testing !== null}
                    onClick={() => void testDatabase(key)}
                  >
                    {testing === key ? 'Testing...' : 'Test connection'}
                  </button>
                </div>
                <div className="row g-2">
                  <label className="col-12">
                    <span className="form-label">Server / IP</span>
                    <input className="form-control" value={connection.server} onChange={(event) => updateDatabase(key, 'server', event.target.value)} />
                  </label>
                  <label className="col-8">
                    <span className="form-label">Database</span>
                    <input className="form-control" value={connection.database} onChange={(event) => updateDatabase(key, 'database', event.target.value)} />
                  </label>
                  <label className="col-4">
                    <span className="form-label">Port</span>
                    <input className="form-control" type="number" min="1" max="65535" value={connection.port} onChange={(event) => updateDatabase(key, 'port', Number(event.target.value))} />
                  </label>
                  <label className="col-12">
                    <span className="form-label">Username</span>
                    <input className="form-control" value={connection.username} onChange={(event) => updateDatabase(key, 'username', event.target.value)} />
                  </label>
                  <label className="col-12">
                    <span className="form-label">Password {connection.passwordConfigured && <small className="text-success">(saved)</small>}</span>
                    <input
                      className="form-control"
                      type="password"
                      autoComplete="new-password"
                      value={connection.password}
                      placeholder={connection.passwordConfigured ? 'Leave blank to keep saved password' : 'Enter password'}
                      onChange={(event) => updateDatabase(key, 'password', event.target.value)}
                    />
                  </label>
                </div>
              </div>
            </section>
          )
        })}

        <section className="col-12">
          <div className="border rounded-3 p-3">
            <h3 className="h6 mb-1">Other databases on the HQ server</h3>
            <p className="small text-secondary">
              These use the HQ connection credentials above. Test each database to verify it exists and the account has access.
            </p>
            <div className="row g-2">
              {sharedHqDatabaseKeys.map((key) => {
                const connection = settings.databases[key]
                return (
                  <div className="col-12 col-md-6" key={key}>
                    <div className="border rounded-2 p-3">
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <label className="flex-grow-1">
                          <span className="form-label">{databaseLabels[key]}</span>
                          <input
                            className="form-control"
                            value={connection.database}
                            onChange={(event) => updateDatabase(key, 'database', event.target.value)}
                          />
                        </label>
                        <button
                          className="btn btn-outline-secondary btn-sm mt-4"
                          type="button"
                          disabled={testing !== null}
                          onClick={() => void testDatabase(key)}
                        >
                          {testing === key ? 'Testing...' : 'Test'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="col-12 col-xl-6">
          <div className="border rounded-3 p-3 h-100">
            <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
              <h3 className="h6 mb-0">FTP (deposit attachments)</h3>
              <button className="btn btn-outline-secondary btn-sm" type="button" disabled={testing !== null} onClick={() => void testFtp()}>
                {testing === 'ftp' ? 'Testing...' : 'Test connection'}
              </button>
            </div>
            <div className="row g-2">
              <label className="col-12">
                <span className="form-label">Host</span>
                <input className="form-control" value={settings.ftp.host} onChange={(event) => setSettings({ ...settings, ftp: { ...settings.ftp, host: event.target.value } })} />
              </label>
              <label className="col-12">
                <span className="form-label">Username</span>
                <input className="form-control" value={settings.ftp.username} onChange={(event) => setSettings({ ...settings, ftp: { ...settings.ftp, username: event.target.value } })} />
              </label>
              <label className="col-12">
                <span className="form-label">Password {settings.ftp.passwordConfigured && <small className="text-success">(saved)</small>}</span>
                <input
                  className="form-control"
                  type="password"
                  autoComplete="new-password"
                  value={settings.ftp.password}
                  placeholder={settings.ftp.passwordConfigured ? 'Leave blank to keep saved password' : 'Enter password'}
                  onChange={(event) => setSettings({ ...settings, ftp: { ...settings.ftp, password: event.target.value } })}
                />
              </label>
              <label className="col-12 d-flex align-items-center gap-2">
                <input type="checkbox" checked={settings.ftp.secure} onChange={(event) => setSettings({ ...settings, ftp: { ...settings.ftp, secure: event.target.checked } })} />
                Use secure FTP (FTPS)
              </label>
            </div>
          </div>
        </section>

        <section className="col-12">
          <div className="border rounded-3 p-3">
            <h3 className="h6">SQL Server TLS options</h3>
            <div className="d-flex flex-wrap gap-4">
              <label className="d-flex align-items-center gap-2">
                <input type="checkbox" checked={settings.encrypt} onChange={(event) => setSettings({ ...settings, encrypt: event.target.checked })} />
                Encrypt connection
              </label>
              <label className="d-flex align-items-center gap-2">
                <input type="checkbox" checked={settings.trustServerCertificate} onChange={(event) => setSettings({ ...settings, trustServerCertificate: event.target.checked })} />
                Trust server certificate
              </label>
            </div>
          </div>
        </section>

        <section className="col-12">
          <div className="border border-warning rounded-3 p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <h3 className="h6 mb-1">Initialize local POS tables</h3>
                <p className="text-secondary mb-0">
                  Load active store names from the configured OracleDB connection, then select which stores to add to this POS.
                </p>
              </div>
              <button
                className="btn btn-outline-primary"
                type="button"
                disabled={loadingLocations || provisioning}
                onClick={() => void loadLocations()}
              >
                {loadingLocations ? 'Loading stores...' : 'Load store list'}
              </button>
            </div>

            {locationOptions.length > 0 && (
              <>
                <div className="mt-3">
                  <details className="dropdown position-relative">
                    <summary className="btn btn-outline-secondary dropdown-toggle">
                      Select stores ({selectedLocationIds.length} selected)
                    </summary>
                    <div className="dropdown-menu show p-2 mt-1 overflow-auto" style={{ maxHeight: 280, minWidth: 280, maxWidth: 'min(420px, 90vw)', zIndex: 10 }}>
                      <button
                        className="dropdown-item small mb-1"
                        type="button"
                        onClick={() => setSelectedLocationIds(
                          selectedLocationIds.length === locationOptions.length
                            ? []
                            : locationOptions.map((location) => location.locationId),
                        )}
                      >
                        {selectedLocationIds.length === locationOptions.length ? 'Clear selection' : 'Select all stores'}
                      </button>
                      <hr className="dropdown-divider my-1" />
                    {locationOptions.map((location) => (
                      <label className="dropdown-item d-flex align-items-center gap-2 py-2" key={location.locationId}>
                        <input
                          type="checkbox"
                          checked={selectedLocationIds.includes(location.locationId)}
                          onChange={(event) => setSelectedLocationIds((current) => event.target.checked
                            ? [...current, location.locationId]
                            : current.filter((id) => id !== location.locationId))}
                        />
                        <span>{location.locationName}</span>
                      </label>
                    ))}
                    </div>
                  </details>
                </div>
                <div className="alert alert-danger py-2 mt-3 mb-2">
                  Recreating the tables permanently deletes existing data in local dts_location, dts_produce, and dts_waste. The active admin account is copied from OracleDB automatically; only selected active stores are copied.
                </div>
                <label className="d-flex align-items-start gap-2 mb-3">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={confirmTableReset}
                    onChange={(event) => setConfirmTableReset(event.target.checked)}
                  />
                  <span>I understand this will drop and recreate all three tables and delete any existing rows.</span>
                </label>
                <button
                  className="btn btn-danger"
                  type="button"
                  disabled={provisioning || selectedLocationIds.length === 0 || !confirmTableReset}
                  onClick={() => void createLocalTables()}
                >
                  {provisioning ? 'Creating tables...' : 'Drop and recreate POS tables'}
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      <div className="d-flex justify-content-end gap-2 mt-4">
        {onCancel && <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>Cancel</button>}
        <button className="btn btn-primary" type="button" disabled={saving || testing !== null} onClick={() => void save()}>
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}

export default ConnectionSettingsForm
