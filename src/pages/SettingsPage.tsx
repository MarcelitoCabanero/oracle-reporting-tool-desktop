import { useState } from 'react'

import ConnectionSettingsForm from '../components/settings/ConnectionSettingsForm'

function SettingsPage() {
  const [adminPassword, setAdminPassword] = useState('')
  const [adminToken, setAdminToken] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  async function unlockSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setChecking(true)
    setError('')
    try {
      const token = await window.api.settings.unlockAdmin(adminPassword)
      setAdminToken(token)
      setAdminPassword('')
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : 'Admin password validation failed.')
    } finally {
      setChecking(false)
    }
  }

  if (!adminToken) {
    return (
      <section className="mx-auto" style={{ maxWidth: 520 }}>
        <h1 className="h4 fw-bold">Settings authorization</h1>
        <p className="text-secondary">Enter an active admin account password to access connection settings.</p>
        <form className="card card-body" onSubmit={(event) => void unlockSettings(event)}>
          <label className="form-label" htmlFor="settings-admin-password">Admin password</label>
          <input
            id="settings-admin-password"
            className="form-control mb-3"
            type="password"
            autoComplete="current-password"
            value={adminPassword}
            onChange={(event) => setAdminPassword(event.target.value)}
            required
          />
          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={checking}>
            {checking ? 'Checking...' : 'Continue'}
          </button>
        </form>
      </section>
    )
  }

  return (
    <section>
      <h1 className="h4 fw-bold mb-1">Connection settings</h1>
      <p className="text-secondary">Manage and test database and FTP connections.</p>
      <ConnectionSettingsForm
        mode="admin"
        adminToken={adminToken}
        onSaved={() => undefined}
      />
    </section>
  )
}

export default SettingsPage
