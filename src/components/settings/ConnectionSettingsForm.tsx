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
  hq: 'HQ server connection',
  headq: 'HEADQ database',
  hourly: 'Hourly sync destination (OracleDB)',
}

const editableDatabaseKeys: DatabaseKey[] = ['local', 'hq', 'hourly']
const sharedHqDatabaseKeys: DatabaseKey[] = ['headq']

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
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [confirmStoreChange, setConfirmStoreChange] = useState(false)

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
    if (!settings || !adminToken) return
    setLoadingLocations(true)
    setError('')
    setMessage('')
    try {
      const result = await window.api.settings.getLocationOptions(settings, adminToken)
      setLocationOptions(result)
      setSelectedLocationId(null)
      setConfirmStoreChange(false)
      if (result.length === 0) {
        setError('No active locations with access set to Store were found in OracleDB dbo.dts_location.')
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load locations from OracleDB.')
    } finally {
      setLoadingLocations(false)
    }
  }

  async function initializeLocalPos() {
    if (!settings || mode !== 'bootstrap') return
    setProvisioning(true)
    setError('')
    setMessage('')
    try {
      const result = await window.api.settings.initializeLocalDatabase(settings)
      setMessage(result.message)
      onSaved()
    } catch (provisionError) {
      setError(provisionError instanceof Error ? provisionError.message : 'Unable to initialize the local POS database.')
    } finally {
      setProvisioning(false)
    }
  }

  async function assignStore() {
    if (!settings || !adminToken || selectedLocationId === null || !confirmStoreChange) return
    setProvisioning(true)
    setError('')
    setMessage('')
    try {
      const result = await window.api.settings.setLocalStore(settings, selectedLocationId, adminToken)
      setMessage(result.message)
      setConfirmStoreChange(false)
      onSaved()
    } catch (storeError) {
      setError(storeError instanceof Error ? storeError.message : 'Unable to set this POS store.')
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
        Hourly entries sync to the configured OracleDB destination (default: 192.168.5.201 / oracledb). Configure its connection separately from HQ and use Test connection to verify access. The HEADQ database uses the HQ server and credentials. Connection passwords are encrypted on this device; leave a password blank to keep it.
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
            <h3 className="h6 mb-1">Other database on the HQ server</h3>
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

        {mode === 'bootstrap' ? (
          <section className="col-12">
            <div className="border border-primary rounded-3 p-3">
              <h3 className="h6 mb-1">Initialize Local POS Database</h3>
              <p className="text-secondary">
                Create the local tables and copy active admin account(s) from OracleDB. After initialization, sign in with an admin account to assign this POS to a store.
              </p>
              <button
                className="btn btn-primary"
                type="button"
                disabled={provisioning}
                onClick={() => void initializeLocalPos()}
              >
                {provisioning ? 'Initializing...' : 'Initialize database and add admin'}
              </button>
            </div>
          </section>
        ) : (
          <section className="col-12">
            <div className="border border-warning rounded-3 p-3">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <h3 className="h6 mb-1">Select this POS store</h3>
                  <p className="text-secondary mb-0">
                    Only active OracleDB locations with access set to Store are listed. Admin accounts are already configured and are not shown.
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
                  <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-2 mt-3">
                    {locationOptions.map((location) => {
                      const selected = selectedLocationId === location.locationId
                      return (
                        <div className="col" key={location.locationId}>
                          <label
                            className={`card h-100 p-3 ${selected ? 'border-primary bg-primary-subtle' : ''}`}
                            style={{ cursor: 'pointer' }}
                          >
                            <span className="d-flex align-items-start gap-3">
                              <input
                                className="form-check-input mt-1"
                                type="radio"
                                name="local-pos-store"
                                value={location.locationId}
                                checked={selected}
                                onChange={() => setSelectedLocationId(location.locationId)}
                              />
                              <span>
                                <span className="fw-semibold d-block">{location.locationName}</span>
                                <span className="small text-secondary">Location ID: {location.locationId}</span>
                              </span>
                            </span>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                  <div className="alert alert-warning py-2 mt-3 mb-2">
                    Setting the POS store replaces its existing non-admin location rows. Admin accounts and existing hourly and summary records are retained.
                  </div>
                  <label className="d-flex align-items-start gap-2 mb-3">
                    <input
                      className="mt-1"
                      type="checkbox"
                      checked={confirmStoreChange}
                      onChange={(event) => setConfirmStoreChange(event.target.checked)}
                    />
                    <span>I understand this will replace the currently configured store.</span>
                  </label>
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={provisioning || selectedLocationId === null || !confirmStoreChange}
                    onClick={() => void assignStore()}
                  >
                    {provisioning ? 'Setting store...' : 'Set this POS store'}
                  </button>
                </>
              )}
            </div>
          </section>
        )}
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
