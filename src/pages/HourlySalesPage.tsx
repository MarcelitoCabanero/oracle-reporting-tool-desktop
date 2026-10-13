import {
  useEffect,
  useState,
} from 'react'

import {
  CalendarDays,
  ClipboardList,
  Clock3,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  PenLine,
} from 'lucide-react'

import {
  useAuth,
} from '../auth/useAuth'

import HourlyDailyReport from './HourlyDailyReport'

import './HourlySalesPage.css'

type EntryKind = 'produce' | 'waste'

interface EntryDraft {
  id: string
  time: string
  entryDate: string
  shellQty: string
  ringQty: string
  jpopsQty: string
  remarks: string
}

const timeSlots = Array.from({ length: 24 }, (_, hour) => {
  function formatHour(value: number) {
    const normalized = value % 24
    const period = normalized === 12 ? 'NN' : normalized < 12 ? 'AM' : 'PM'
    const displayHour = normalized % 12 || 12

    return `${String(displayHour).padStart(2, '0')}:00 ${period}`
  }

  return `${formatHour(hour)} – ${formatHour(hour + 1)}`
})

function todayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createDraft(date: string): EntryDraft {
  return {
    id: crypto.randomUUID(),
    time: '',
    entryDate: date,
    shellQty: '',
    ringQty: '',
    jpopsQty: '',
    remarks: '',
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to save entries. Check the database connection and try again.'
}

function HourlyEntryForm({
  businessDate,
  onSaved,
}: {
  businessDate: string
  onSaved: () => void
}) {
  const { user } = useAuth()
  const [kind, setKind] = useState<EntryKind>('produce')
  const [produceRows, setProduceRows] = useState<EntryDraft[]>(() => [createDraft(businessDate)])
  const [wasteRows, setWasteRows] = useState<EntryDraft[]>(() => [createDraft(businessDate)])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const rows = kind === 'produce' ? produceRows : wasteRows
  const setRows = kind === 'produce' ? setProduceRows : setWasteRows
  const remarksOptions = kind === 'produce'
    ? ['Produced Donuts', 'Received Donuts']
    : ['Proofing', 'Frying', 'Topping']
  const timeOptions = kind === 'produce'
    ? ['Retarding', ...timeSlots]
    : timeSlots
  const totalQuantity = rows.reduce((total, row) =>
    total + Number(row.shellQty || 0) + Number(row.ringQty || 0) + Number(row.jpopsQty || 0),
  0)

  function updateRow(id: string, field: keyof Omit<EntryDraft, 'id'>, value: string) {
    setRows((currentRows) => currentRows.map((row) =>
      row.id === id ? { ...row, [field]: value } : row,
    ))
  }

  function normalizeJpopsQuantity(id: string, value: string) {
    const enteredQuantity = Number(value)
    if (!Number.isFinite(enteredQuantity) || enteredQuantity < 0) {
      return
    }

    const conversionFactor = kind === 'produce' ? (56 * 7) / 35 : (24 * 7) / 35
    updateRow(id, 'jpopsQty', String(Math.round(enteredQuantity * conversionFactor)))
  }

  function addRow() {
    setRows((currentRows) => [...currentRows, createDraft(businessDate)])
    setMessage('')
  }

  function removeRow(id: string) {
    setRows((currentRows) => currentRows.filter((row) => row.id !== id))
    setMessage('')
  }

  function changeKind(nextKind: EntryKind) {
    setKind(nextKind)
    setMessage('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (rows.length === 0) {
      setMessageType('error')
      setMessage('Add at least one entry before saving.')
      return
    }

    const preparedRows = rows.map((row) => ({
      time: row.time,
      entryDate: row.entryDate,
      shellQty: Number(row.shellQty || 0),
      ringQty: Number(row.ringQty || 0),
      jpopsQty: Number(row.jpopsQty || 0),
      remarks: row.remarks,
    }))

    if (preparedRows.some((row) =>
      row.shellQty === 0 && row.ringQty === 0 && row.jpopsQty === 0,
    )) {
      setMessageType('error')
      setMessage('Every entry needs at least one quantity greater than zero.')
      return
    }

    setSaving(true)

    try {
      const result = await window.api.hourlySales.createEntries({
        kind,
        businessDate,
        locationName: user?.locationName ?? '',
        rows: preparedRows,
      })

      setMessageType('success')
      setMessage(result.message)
      setRows([createDraft(businessDate)])
      onSaved()
    } catch (error) {
      setMessageType('error')
      setMessage(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="hourly-sales-panel" aria-label="Hourly production and waste entry">
        <div className="hourly-sales-toolbar">
          <div className="hourly-sales-tabs" role="tablist" aria-label="Entry type">
            <button
              type="button"
              role="tab"
              aria-selected={kind === 'produce'}
              className={kind === 'produce' ? 'active' : ''}
              onClick={() => changeKind('produce')}
            >
              Produce
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={kind === 'waste'}
              className={kind === 'waste' ? 'active' : ''}
              onClick={() => changeKind('waste')}
            >
              Waste
            </button>
          </div>

          <div className="hourly-sales-location">
            <span>Location</span>
            <strong>{user?.locationName || 'Location unavailable'}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="hourly-sales-summary">
            <div>
              <span>{kind === 'produce' ? 'Produce entries' : 'Waste entries'}</span>
              <strong>{rows.length}</strong>
            </div>
            <div>
              <span>Total quantity</span>
              <strong>{totalQuantity.toLocaleString()}</strong>
            </div>
            <div className="hourly-sales-kind-label">
              <Clock3 size={17} aria-hidden="true" />
              <span>{kind === 'produce' ? 'Production log' : 'Waste log'}</span>
            </div>
          </div>

          <div className="hourly-sales-table-wrap">
            <table className="hourly-sales-table">
              <thead>
                <tr>
                  <th scope="col">{kind === 'produce' ? 'Time mixing' : 'Time waste'}</th>
                  <th scope="col">Entry date</th>
                  <th scope="col">Shell qty</th>
                  <th scope="col">Ring qty</th>
                  <th scope="col">JPops qty</th>
                  <th scope="col">Remarks</th>
                  <th scope="col"><span className="visually-hidden">Remove entry</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>
                      <select
                        aria-label={`Entry ${index + 1} time`}
                        value={row.time}
                        onChange={(event) => updateRow(row.id, 'time', event.target.value)}
                        required
                      >
                        <option value="">Select hour</option>
                        {timeOptions.map((timeOption) => (
                          <option key={timeOption} value={timeOption}>{timeOption}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label={`Entry ${index + 1} date`}
                        type="date"
                        value={row.entryDate}
                        onChange={(event) => updateRow(row.id, 'entryDate', event.target.value)}
                        required
                      />
                    </td>
                    {(['shellQty', 'ringQty', 'jpopsQty'] as const).map((field) => (
                      <td key={field}>
                        <input
                          aria-label={`Entry ${index + 1} ${field.replace('Qty', '')} quantity`}
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={row[field]}
                          onChange={(event) => updateRow(row.id, field, event.target.value)}
                          onBlur={field === 'jpopsQty'
                            ? (event) => normalizeJpopsQuantity(row.id, event.target.value)
                            : undefined}
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td>
                      <select
                        aria-label={`Entry ${index + 1} remarks`}
                        value={row.remarks}
                        onChange={(event) => updateRow(row.id, 'remarks', event.target.value)}
                        required
                      >
                        <option value="">Select remark</option>
                        {remarksOptions.map((remark) => <option key={remark} value={remark}>{remark}</option>)}
                      </select>
                    </td>
                    <td className="hourly-sales-remove-cell">
                      <button
                        className="hourly-sales-icon-button"
                        type="button"
                        onClick={() => removeRow(row.id)}
                        aria-label={`Remove entry ${index + 1}`}
                        title="Remove entry"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="hourly-sales-empty" colSpan={7}>No entries yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="hourly-sales-actions">
            <button className="hourly-sales-add" type="button" onClick={addRow}>
              <Plus size={16} aria-hidden="true" />
              Add entry
            </button>
            <button
              className="hourly-sales-save"
              type="submit"
              disabled={saving || rows.length === 0 || !user?.locationName}
            >
              <Save size={16} aria-hidden="true" />
              {saving ? 'Saving entries...' : `Save ${kind === 'produce' ? 'produce' : 'waste'}`}
            </button>
          </div>

          {message && (
            <div className={`hourly-sales-message ${messageType}`} role="status">
              {message}
            </div>
          )}
        </form>
    </section>
  )
}

type HourlyDailyReportData = Awaited<
  ReturnType<typeof window.api.hourlySales.getDailyReport>
>

function HourlySalesPage() {
  const { user } = useAuth()
  const [view, setView] = useState<'report' | 'entry'>('report')
  const [businessDate, setBusinessDate] = useState(todayString)
  const [report, setReport] = useState<HourlyDailyReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    let active = true

    if (!user?.locationName) {
      setReportError('Your account does not have a location assigned.')
      setReport(null)
      return () => {
        active = false
      }
    }

    setReportLoading(true)
    setReportError('')

    window.api.hourlySales.getDailyReport({
      businessDate,
      locationName: user.locationName,
    })
      .then((result) => {
        if (active) setReport(result)
      })
      .catch((error: unknown) => {
        if (active) {
          setReport(null)
          setReportError(getErrorMessage(error))
        }
      })
      .finally(() => {
        if (active) setReportLoading(false)
      })

    return () => {
      active = false
    }
  }, [businessDate, refreshCount, user?.locationName])

  function handleEntrySaved() {
    setView('report')
    setRefreshCount((count) => count + 1)
  }

  return (
    <main className="hourly-sales-page">
      <header className="hourly-sales-heading">
        <div>
          <div className="hourly-sales-eyebrow">HOURLY OPERATIONS</div>
          <h1>Donut production monitoring</h1>
          <p>Daily production, process waste, inventory, and POS sales.</p>
        </div>
        <div className="hourly-sales-report-controls">
          <div className="hourly-sales-date">
            <CalendarDays size={17} aria-hidden="true" />
            <label htmlFor="hourly-business-date">Business date</label>
            <input
              id="hourly-business-date"
              type="date"
              value={businessDate}
              onChange={(event) => setBusinessDate(event.target.value)}
              required
            />
          </div>
          {view === 'report' && (
            <button
              className="hourly-sales-refresh"
              type="button"
              onClick={() => setRefreshCount((count) => count + 1)}
              disabled={reportLoading}
              title="Refresh report"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
          )}
        </div>
      </header>

      <div className="hourly-sales-view-tabs" role="tablist" aria-label="Hourly sales view">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'report'}
          className={view === 'report' ? 'active' : ''}
          onClick={() => setView('report')}
        >
          <ClipboardList size={16} aria-hidden="true" />
          Daily report
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'entry'}
          className={view === 'entry' ? 'active' : ''}
          onClick={() => setView('entry')}
        >
          <PenLine size={16} aria-hidden="true" />
          Enter produce / waste
        </button>
      </div>

      {view === 'report' && (
        <>
          {reportLoading && <div className="hourly-sales-report-state">Loading daily report...</div>}
          {reportError && <div className="hourly-sales-message error" role="alert">{reportError}</div>}
          {report && !reportLoading && <HourlyDailyReport report={report} />}
        </>
      )}

      {view === 'entry' && (
        <HourlyEntryForm
          businessDate={businessDate}
          onSaved={handleEntrySaved}
        />
      )}
    </main>
  )
}

export default HourlySalesPage