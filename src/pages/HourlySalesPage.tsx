import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  BarChart3,
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

import HourlyDailyReport, {
  HourlyProductionSummary,
} from './HourlyDailyReport'

import './HourlySalesPage.css'

type EntryKind = 'produce' | 'waste'

interface EntryDraft {
  id: string
  time: string
  shellQty: string
  ringQty: string
  jpopsQty: string
  remarks: string
}

type EntryField = keyof Omit<EntryDraft, 'id'>

const entryFieldOrder: EntryField[] = [
  'time',
  'shellQty',
  'ringQty',
  'jpopsQty',
  'remarks',
]

const timeSlots = Array.from({ length: 24 }, (_, hour) => {
  function formatHour(value: number) {
    const normalized = value % 24
    const period = normalized === 12 ? 'NN' : normalized < 12 ? 'AM' : 'PM'
    const displayHour = normalized % 12 || 12

    return `${String(displayHour).padStart(2, '0')}:00 ${period}`
  }

  return `${formatHour(hour)} – ${formatHour(hour + 1)}`
})

function normalizeTimeSlot(time: string) {
  return time.trim().toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ')
}

const timeSlotOrder = new Map(
  timeSlots.map((time, index) => [normalizeTimeSlot(time), index]),
)

function getRecordTimeOrder(time: string) {
  const normalizedTime = normalizeTimeSlot(time)
  if (normalizedTime === 'retarding') return -1
  return timeSlotOrder.get(normalizedTime) ?? timeSlots.length
}

function todayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
}

function createDraft(): EntryDraft {
  return {
    id: crypto.randomUUID(),
    time: '',
    shellQty: '',
    ringQty: '',
    jpopsQty: '',
    remarks: '',
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The request could not be completed. Check the database connection and try again.'
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
  const [produceRows, setProduceRows] = useState<EntryDraft[]>(() => [createDraft()])
  const [wasteRows, setWasteRows] = useState<EntryDraft[]>(() => [createDraft()])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const fieldRefs = useRef(new Map<string, HTMLInputElement | HTMLSelectElement>())
  const addButtonRef = useRef<HTMLButtonElement>(null)

  const rows = kind === 'produce' ? produceRows : wasteRows
  const setRows = kind === 'produce' ? setProduceRows : setWasteRows
  const remarksOptions = kind === 'produce'
    ? ['Produced Donuts', 'Received Donuts']
    : ['Proofing', 'Frying', 'Topping']
  const timeOptions = kind === 'produce'
    ? ['Retarding', ...timeSlots]
    : timeSlots
  const shellQuantity = rows.reduce((total, row) => total + Number(row.shellQty || 0), 0)
  const ringQuantity = rows.reduce((total, row) => total + Number(row.ringQty || 0), 0)
  const jpopsQuantity = rows.reduce((total, row) => total + Number(row.jpopsQty || 0), 0)

  function updateRow(id: string, field: EntryField, value: string) {
    setRows((currentRows) => currentRows.map((row) =>
      row.id === id ? { ...row, [field]: value } : row,
    ))
    if (messageType === 'error') setMessage('')
  }

  function focusNextField(rowId: string, field: EntryField) {
    const rowIndex = rows.findIndex((row) => row.id === rowId)
    const fieldIndex = entryFieldOrder.indexOf(field)
    const nextField = entryFieldOrder[fieldIndex + 1]

    if (nextField) {
      fieldRefs.current.get(`${rowId}:${nextField}`)?.focus()
      return
    }

    const nextRow = rows[rowIndex + 1]
    if (nextRow) {
      fieldRefs.current.get(`${nextRow.id}:time`)?.focus()
      return
    }

    addButtonRef.current?.focus()
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
    setRows((currentRows) => [...currentRows, createDraft()])
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

    if (!businessDate) {
      setMessageType('error')
      setMessage('Choose a transaction date before saving.')
      return
    }

    if (rows.length === 0) {
      setMessageType('error')
      setMessage('Add at least one entry before saving.')
      return
    }

    for (const [index, row] of rows.entries()) {
      const requiredField = entryFieldOrder.find((field) =>
        ['time', 'remarks'].includes(field) && !row[field].trim(),
      )

      if (requiredField) {
        setMessageType('error')
        setMessage(`Entry ${index + 1} is missing ${requiredField === 'time' ? 'a time duration' : 'remarks'}.`)
        fieldRefs.current.get(`${row.id}:${requiredField}`)?.focus()
        return
      }

      const quantityFields = ['shellQty', 'ringQty', 'jpopsQty'] as const
      const invalidField = quantityFields.find((field) =>
        row[field] !== '' &&
        (!Number.isSafeInteger(Number(row[field])) || Number(row[field]) < 0),
      )

      if (invalidField) {
        setMessageType('error')
        setMessage(`Entry ${index + 1} quantities must be non-negative whole numbers.`)
        fieldRefs.current.get(`${row.id}:${invalidField}`)?.focus()
        return
      }

      const isReceivedDonuts = kind === 'produce' && row.remarks === 'Received Donuts'
      const hasEnteredQuantity = quantityFields.some((field) => row[field] !== '')
      const hasPositiveQuantity = quantityFields.some((field) => Number(row[field] || 0) > 0)

      if (isReceivedDonuts ? !hasEnteredQuantity : !hasPositiveQuantity) {
        setMessageType('error')
        setMessage(isReceivedDonuts
          ? `Entry ${index + 1} needs at least one quantity field filled for received donuts.`
          : `Entry ${index + 1} needs at least one quantity greater than zero.`)
        fieldRefs.current.get(`${row.id}:shellQty`)?.focus()
        return
      }
    }

    const seenTimes = new Set<string>()
    for (const [index, row] of rows.entries()) {
      const normalizedTime = row.time.trim().toUpperCase()
      if (normalizedTime === 'RETARDING') continue

      if (seenTimes.has(normalizedTime)) {
        setMessageType('error')
        setMessage(`Entry ${index + 1} repeats the ${row.time} time duration. Each duration can only be entered once.`)
        fieldRefs.current.get(`${row.id}:time`)?.focus()
        return
      }
      seenTimes.add(normalizedTime)
    }

    const preparedRows = rows.map((row) => ({
      time: row.time,
      entryDate: businessDate,
      shellQty: row.shellQty === '' ? null : Number(row.shellQty),
      ringQty: row.ringQty === '' ? null : Number(row.ringQty),
      jpopsQty: row.jpopsQty === '' ? null : Number(row.jpopsQty),
      remarks: row.remarks,
    }))

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
      setRows([createDraft()])
      onSaved()
    } catch (error) {
      setMessageType('error')
      setMessage(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="hourly-sales-panel hourly-entry-panel" aria-label="Hourly production and waste entry">
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

        <form onSubmit={handleSubmit} noValidate>
          <div className="hourly-sales-summary">
            <div>
              <span>{kind === 'produce' ? 'Produce entries' : 'Waste entries'}</span>
              <strong>{rows.length}</strong>
            </div>
            <div>
              <span>Shell qty</span>
              <strong>{shellQuantity.toLocaleString()}</strong>
            </div>
            <div>
              <span>Ring qty</span>
              <strong>{ringQuantity.toLocaleString()}</strong>
            </div>
            <div>
              <span>JPops qty</span>
              <strong>{jpopsQuantity.toLocaleString()}</strong>
            </div>
            <div className="hourly-sales-kind-label">
              <Clock3 size={17} aria-hidden="true" />
              <span>{kind === 'produce' ? 'Production log' : 'Waste log'}</span>
            </div>
          </div>

          <div className="hourly-entry-card-list">
            {rows.map((row, index) => (
              <section className="hourly-entry-card" key={row.id} aria-label={`Entry ${index + 1}`}>
                <header className="hourly-entry-card-heading">
                  <strong>Entry {index + 1}</strong>
                  <button
                    className="hourly-sales-icon-button"
                    type="button"
                    onClick={() => removeRow(row.id)}
                    aria-label={`Remove entry ${index + 1}`}
                    title="Remove entry"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </header>

                <div className="hourly-entry-fields">
                  <div className="hourly-entry-field">
                    <label htmlFor={`${row.id}-time`}>{kind === 'produce' ? 'Time mixing' : 'Time waste'}</label>
                    <select
                      id={`${row.id}-time`}
                      aria-label={`Entry ${index + 1} time`}
                      value={row.time}
                      ref={(element) => {
                        if (element) fieldRefs.current.set(`${row.id}:time`, element)
                        else fieldRefs.current.delete(`${row.id}:time`)
                      }}
                      onChange={(event) => {
                        updateRow(row.id, 'time', event.target.value)
                        if (event.target.value) focusNextField(row.id, 'time')
                      }}
                    >
                      <option value="">Select hour</option>
                      {timeOptions.map((timeOption) => {
                        const selectedElsewhere = rows.some((otherRow) =>
                          otherRow.id !== row.id &&
                          timeOption.toUpperCase() !== 'RETARDING' &&
                          otherRow.time.trim().toUpperCase() === timeOption.toUpperCase(),
                        )

                        return (
                          <option key={timeOption} value={timeOption} disabled={selectedElsewhere}>
                            {timeOption}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div className="hourly-entry-field hourly-entry-fixed-date">
                    <span>Entry date</span>
                    <div>
                      <CalendarDays size={15} aria-hidden="true" />
                      <strong>{businessDate || 'Select a transaction date'}</strong>
                    </div>
                  </div>

                  <div className="hourly-entry-quantity-group">
                    {([
                      ['shellQty', 'Shell quantity'],
                      ['ringQty', 'Ring quantity'],
                      ['jpopsQty', 'JPops quantity'],
                    ] as const).map(([field, label]) => (
                      <div className="hourly-entry-field hourly-entry-quantity" key={field}>
                        <label htmlFor={`${row.id}-${field}`}>{label}</label>
                        <input
                          id={`${row.id}-${field}`}
                          aria-label={`Entry ${index + 1} ${field.replace('Qty', '')} quantity`}
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={row[field]}
                          ref={(element) => {
                            if (element) fieldRefs.current.set(`${row.id}:${field}`, element)
                            else fieldRefs.current.delete(`${row.id}:${field}`)
                          }}
                          onChange={(event) => updateRow(row.id, field, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              focusNextField(row.id, field)
                            }
                          }}
                          onBlur={field === 'jpopsQty'
                            ? (event) => normalizeJpopsQuantity(row.id, event.target.value)
                            : undefined}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="hourly-entry-field hourly-entry-remarks">
                    <label htmlFor={`${row.id}-remarks`}>Remarks</label>
                    <select
                      id={`${row.id}-remarks`}
                      aria-label={`Entry ${index + 1} remarks`}
                      value={row.remarks}
                      ref={(element) => {
                        if (element) fieldRefs.current.set(`${row.id}:remarks`, element)
                        else fieldRefs.current.delete(`${row.id}:remarks`)
                      }}
                      onChange={(event) => {
                        updateRow(row.id, 'remarks', event.target.value)
                        if (event.target.value) focusNextField(row.id, 'remarks')
                      }}
                    >
                      <option value="">Select remark</option>
                      {remarksOptions.map((remark) => <option key={remark} value={remark}>{remark}</option>)}
                    </select>
                  </div>
                </div>
              </section>
            ))}
            {rows.length === 0 && (
              <div className="hourly-entry-empty">No entries yet. Add an entry to get started.</div>
            )}
          </div>

          <div className="hourly-sales-actions">
            <button ref={addButtonRef} className="hourly-sales-add" type="button" onClick={addRow}>
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

interface HourlyRecordDraft {
  id: number
  kind: EntryKind
  entryDate: string
  time: string
  shellQty: string
  ringQty: string
  jpopsQty: string
  remarks: string
}

type HourlyRecordData = Awaited<
  ReturnType<typeof window.api.hourlySales.getRecords>
>[number]

function HourlyRecords({
  startDate,
  endDate,
  locationName,
  refreshCount,
}: {
  startDate: string
  endDate: string
  locationName: string | undefined
  refreshCount: number
}) {
  const [records, setRecords] = useState<HourlyRecordData[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<HourlyRecordDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [reloadCount, setReloadCount] = useState(0)
  const [kindFilter, setKindFilter] = useState<'all' | EntryKind>('all')

  useEffect(() => {
    let active = true

    async function loadRecords() {
      setEditingId(null)
      setDraft(null)
      if (!locationName) {
        setRecords([])
        setLoading(false)
        setLoadError('Your account does not have a location assigned.')
        return
      }
      if (!startDate || !endDate || startDate > endDate) {
        setRecords([])
        setLoading(false)
        setLoadError('Choose a valid date range.')
        return
      }

      setLoading(true)
      setLoadError('')
      try {
        const result = await window.api.hourlySales.getRecords({
          startDate,
          endDate,
          locationName,
        })
        if (active) setRecords(result)
      } catch (error) {
        if (active) {
          setRecords([])
          setLoadError(getErrorMessage(error))
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadRecords()
    return () => {
      active = false
    }
  }, [endDate, locationName, refreshCount, reloadCount, startDate])

  function beginEditing(record: HourlyRecordData) {
    setEditingId(`${record.kind}-${record.id}`)
    setDraft({
      ...record,
      shellQty: String(record.shellQty),
      ringQty: String(record.ringQty),
      jpopsQty: String(record.jpopsQty),
    })
    setMessage('')
  }

  function updateDraft(field: keyof Omit<HourlyRecordDraft, 'id' | 'kind'>, value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current)
    if (messageType === 'error') setMessage('')
  }

  function cancelEditing() {
    setEditingId(null)
    setDraft(null)
    setMessage('')
  }

  async function saveRecord() {
    if (!draft || !locationName) return

    const quantityFields = ['shellQty', 'ringQty', 'jpopsQty'] as const
    const invalidQuantity = quantityFields.find((field) =>
      draft[field] === '' ||
      !Number.isSafeInteger(Number(draft[field])) ||
      Number(draft[field]) < 0,
    )
    if (invalidQuantity) {
      setMessageType('error')
      setMessage('Quantities must be non-negative whole numbers.')
      return
    }

    const isReceivedDonuts = draft.kind === 'produce' && draft.remarks === 'Received Donuts'
    if (!isReceivedDonuts && quantityFields.every((field) => Number(draft[field]) === 0)) {
      setMessageType('error')
      setMessage('The record must have at least one quantity greater than zero.')
      return
    }

    setSaving(true)
    setMessageType('success')
    setMessage('')
    try {
      const result = await window.api.hourlySales.updateRecord({
        id: draft.id,
        kind: draft.kind,
        entryDate: draft.entryDate,
        time: draft.time,
        shellQty: Number(draft.shellQty),
        ringQty: Number(draft.ringQty),
        jpopsQty: Number(draft.jpopsQty),
        remarks: draft.remarks,
        locationName,
      })
      setMessage(result.message)
      setEditingId(null)
      setDraft(null)
      setReloadCount((count) => count + 1)
    } catch (error) {
      setMessageType('error')
      setMessage(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const filteredRecords = records
    .filter((record) => kindFilter === 'all' || record.kind === kindFilter)
    .sort((first, second) =>
      second.entryDate.localeCompare(first.entryDate) ||
      getRecordTimeOrder(first.time) - getRecordTimeOrder(second.time),
    )
  const recordTotals = filteredRecords.reduce((totals, record) => ({
    shell: totals.shell + record.shellQty,
    ring: totals.ring + record.ringQty,
    jpops: totals.jpops + record.jpopsQty,
  }), { shell: 0, ring: 0, jpops: 0 })
  const tableColSpan = 8

  return (
    <section className="hourly-sales-panel hourly-records-panel" aria-label="Produce and waste records">
      <header className="hourly-records-heading">
        <div>
          <h2>Produce / Waste Records</h2>
          <p>{locationName || 'Location unavailable'} · {startDate} to {endDate}</p>
        </div>
        <div className="hourly-records-controls">
          <label htmlFor="hourly-record-kind-filter">Show</label>
          <select
            id="hourly-record-kind-filter"
            aria-label="Filter records by type"
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as 'all' | EntryKind)}
          >
            <option value="all">All types</option>
            <option value="produce">Produce</option>
            <option value="waste">Waste</option>
          </select>
          <span>{filteredRecords.length.toLocaleString()} {filteredRecords.length === 1 ? 'record' : 'records'}</span>
        </div>
      </header>

      {loading && <div className="hourly-sales-report-state">Loading Produce and Waste records...</div>}
      {loadError && <div className="hourly-sales-message error" role="alert">{loadError}</div>}
      {!loading && !loadError && (
        <div>
          <div className="hourly-sales-table-wrap">
            <table className="hourly-sales-table hourly-records-table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Entry date</th>
                  <th scope="col">Time</th>
                  <th scope="col">Shell qty</th>
                  <th scope="col">Ring qty</th>
                  <th scope="col">JPops qty</th>
                  <th scope="col">Remarks</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => {
                  const key = `${record.kind}-${record.id}`
                  const isEditing = editingId === key && draft !== null
                  const rowDraft = isEditing ? draft : null
                  const timeOptions = record.kind === 'produce'
                    ? ['Retarding', ...timeSlots]
                    : timeSlots
                  const remarksOptions = record.kind === 'produce'
                    ? ['Produced Donuts', 'Received Donuts']
                    : ['Proofing', 'Frying', 'Topping']

                  return (
                    <tr key={key} className={isEditing ? 'hourly-records-editing' : undefined}>
                      <td>
                        <span className={`hourly-record-kind ${record.kind}`}>
                          {record.kind === 'produce' ? 'Produce' : 'Waste'}
                        </span>
                      </td>
                      <td>
                        {rowDraft
                          ? <input aria-label="Record entry date" type="date" value={rowDraft.entryDate} onChange={(event) => updateDraft('entryDate', event.target.value)} required />
                          : record.entryDate}
                      </td>
                      <td>
                        {rowDraft
                          ? (
                            <select aria-label="Record time" value={rowDraft.time} onChange={(event) => updateDraft('time', event.target.value)} required>
                              <option value="">Select time</option>
                              {!timeOptions.includes(rowDraft.time) && <option value={rowDraft.time}>{rowDraft.time}</option>}
                              {timeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          )
                          : record.time}
                      </td>
                      {(['shellQty', 'ringQty', 'jpopsQty'] as const).map((field) => (
                        <td key={field}>
                          {rowDraft
                            ? <input aria-label={`${field} for record`} type="number" min="0" step="1" value={rowDraft[field]} onChange={(event) => updateDraft(field, event.target.value)} required />
                            : record[field].toLocaleString()}
                        </td>
                      ))}
                      <td>
                        {rowDraft
                          ? (
                            <select aria-label="Record remarks" value={rowDraft.remarks} onChange={(event) => updateDraft('remarks', event.target.value)} required>
                              <option value="">Select remarks</option>
                              {!remarksOptions.includes(rowDraft.remarks) && <option value={rowDraft.remarks}>{rowDraft.remarks}</option>}
                              {remarksOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          )
                          : record.remarks}
                      </td>
                      <td className="hourly-record-actions">
                        {rowDraft
                          ? (
                            <>
                              <button className="hourly-record-action-save" type="button" onClick={() => void saveRecord()} disabled={saving} aria-label="Save record changes" title="Save changes">
                                <Save size={15} aria-hidden="true" />
                              </button>
                              <button className="hourly-record-action-cancel" type="button" disabled={saving} onClick={cancelEditing} aria-label="Cancel editing" title="Cancel">
                                Cancel
                              </button>
                            </>
                          )
                          : (
                            <button className="hourly-record-action-edit" type="button" onClick={() => beginEditing(record)} disabled={editingId !== null} aria-label={`Edit ${record.kind} record ${record.id}`} title="Edit record">
                              <PenLine size={15} aria-hidden="true" />
                              Edit
                            </button>
                          )}
                      </td>
                    </tr>
                  )
                })}
                {filteredRecords.length === 0 && (
                  <tr><td className="hourly-sales-empty" colSpan={tableColSpan}>
                    {records.length === 0
                      ? 'No Produce or Waste records in this date range.'
                      : `No ${kindFilter === 'produce' ? 'Produce' : 'Waste'} records in this date range.`}
                  </td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="hourly-records-total">
                  <th scope="row" colSpan={3}>Total</th>
                  <td>{recordTotals.shell.toLocaleString()}</td>
                  <td>{recordTotals.ring.toLocaleString()}</td>
                  <td>{recordTotals.jpops.toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
          {message && <div className={`hourly-sales-message ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</div>}
        </div>
      )}
    </section>
  )
}

type HourlyDailyReportData = Awaited<
  ReturnType<typeof window.api.hourlySales.getDailyReport>
>

function HourlySalesPage() {
  const { user } = useAuth()
  const [view, setView] = useState<'daily' | 'summary' | 'records' | 'transactions'>('daily')
  const [startDate, setStartDate] = useState(todayString)
  const [endDate, setEndDate] = useState(todayString)
  const [transactionDate, setTransactionDate] = useState(todayString)
  const [reports, setReports] = useState<HourlyDailyReportData[]>([])
  const [reportLoading, setReportLoading] = useState(false)
  const [reportLoadError, setReportLoadError] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)
  const locationName = user?.locationName
  const reportEndDate = endDate
  const invalidDateRange = !startDate || !reportEndDate || startDate > reportEndDate
  const reportError = !locationName
    ? 'Your account does not have a location assigned.'
    : !startDate || !reportEndDate
      ? 'Choose a report date.'
      : startDate > reportEndDate
      ? 'The start date must be on or before the end date.'
      : reportLoadError
  const reportIsLoading = Boolean(
    (view === 'daily' || view === 'summary') &&
    locationName &&
    !invalidDateRange &&
    reportLoading,
  )
  useEffect(() => {
    let active = true

    if (
      view === 'transactions' ||
      view === 'records' ||
      !locationName ||
      !startDate ||
      !reportEndDate ||
      startDate > reportEndDate
    ) {
      return () => {
        active = false
      }
    }

    const selectedLocationName = locationName

    async function loadReports() {
      setReportLoading(true)
      setReportLoadError('')
      setReports([])

      try {
        const dates = getDatesInRange(startDate, reportEndDate)
        const batchSize = 7

        for (let index = 0; index < dates.length; index += batchSize) {
          const batchReports = await Promise.all(
            dates.slice(index, index + batchSize).map((businessDate) =>
              window.api.hourlySales.getDailyReport({
                businessDate,
                locationName: selectedLocationName,
              }),
            ),
          )

          if (!active) return
          setReports((currentReports) => [...currentReports, ...batchReports])
        }
      } catch (error) {
        if (active) {
          setReports([])
          setReportLoadError(getErrorMessage(error))
        }
      } finally {
        if (active) setReportLoading(false)
      }
    }

    void loadReports()

    return () => {
      active = false
    }
  }, [locationName, refreshCount, reportEndDate, startDate, view])

  function handleEntrySaved() {
    setRefreshCount((count) => count + 1)
  }

  return (
    <main className="hourly-sales-page">

      <div className="hourly-sales-navigation-row">
        <div className="hourly-sales-view-tabs" role="tablist" aria-label="Hourly sales view">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'daily'}
            className={view === 'daily' ? 'active' : ''}
            onClick={() => setView('daily')}
          >
            <ClipboardList size={16} aria-hidden="true" />
            Hourly details
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'summary'}
            className={view === 'summary' ? 'active' : ''}
            onClick={() => setView('summary')}
          >
            <BarChart3 size={16} aria-hidden="true" />
            Donut summary
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'records'}
            className={view === 'records' ? 'active' : ''}
            onClick={() => setView('records')}
          >
            <ClipboardList size={16} aria-hidden="true" />
            Records
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'transactions'}
            className={view === 'transactions' ? 'active' : ''}
            onClick={() => setView('transactions')}
          >
            <PenLine size={16} aria-hidden="true" />
            Transactions
          </button>
        </div>

        <div className="hourly-sales-report-controls">
          {view === 'transactions' ? (
            <>
              <div className="hourly-sales-date">
                <CalendarDays size={15} aria-hidden="true" />
                <label htmlFor="hourly-transaction-date">Date</label>
                <input
                  id="hourly-transaction-date"
                  aria-label="Transaction date"
                  type="date"
                  value={transactionDate}
                  onChange={(event) => setTransactionDate(event.target.value)}
                  required
                />
              </div>
              <button
                className="hourly-sales-refresh"
                type="button"
                onClick={() => setRefreshCount((count) => count + 1)}
                title="Refresh transactions"
              >
                <RefreshCw size={16} aria-hidden="true" />
                Refresh
              </button>
            </>
          ) : (
            <>
              <div className="hourly-sales-date">
                <CalendarDays size={15} aria-hidden="true" />
                <label htmlFor="hourly-start-date">From</label>
                <input
                  id="hourly-start-date"
                  aria-label="Report start date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
              </div>
              <div className="hourly-sales-date">
                <CalendarDays size={15} aria-hidden="true" />
                <label htmlFor="hourly-end-date">To</label>
                <input
                  id="hourly-end-date"
                  aria-label="Report end date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                />
              </div>
              <button
                className="hourly-sales-refresh"
                type="button"
                onClick={() => setRefreshCount((count) => count + 1)}
                disabled={reportLoading && (view === 'daily' || view === 'summary')}
                title={view === 'records' ? 'Refresh records' : 'Refresh report'}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {(view === 'daily' || view === 'summary') && (
        <>
          {reportIsLoading && (
            <div className="hourly-sales-report-state">
              {view === 'summary' ? 'Loading summaries for the selected date range...' : 'Loading reports for the selected date range...'}
            </div>
          )}
          {reportError && <div className="hourly-sales-message error" role="alert">{reportError}</div>}
          {!reportIsLoading && !reportError && view === 'daily' && reports.map((report) => (
            <section className="hourly-sales-day-report" key={report.businessDate}>
              <h2>{report.businessDate}</h2>
              <HourlyDailyReport report={report} />
            </section>
          ))}
          {!reportIsLoading && !reportError && view === 'summary' && reports.length > 0 && (
            <HourlyProductionSummary
              key={`${reports[0].locationName}-${reports[0].businessDate}-${reports[reports.length - 1].businessDate}`}
              reports={reports}
            />
          )}
        </>
      )}

      {view === 'records' && (
        <HourlyRecords
          startDate={startDate}
          endDate={endDate}
          locationName={locationName}
          refreshCount={refreshCount}
        />
      )}

      {view === 'transactions' && (
        <div className="hourly-transactions-layout">
          <HourlyEntryForm
            businessDate={transactionDate}
            onSaved={handleEntrySaved}
          />
          <HourlyRecords
            startDate={transactionDate}
            endDate={transactionDate}
            locationName={locationName}
            refreshCount={refreshCount}
          />
        </div>
      )}
    </main>
  )
}

export default HourlySalesPage