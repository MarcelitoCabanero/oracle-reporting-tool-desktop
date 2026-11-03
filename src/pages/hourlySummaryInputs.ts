type HourlyDailyReportData = Awaited<
  ReturnType<typeof window.api.hourlySales.getDailyReport>
>

export type ManualFieldKey =
  | 'promotions'
  | 'training'
  | 'staffMeal'
  | 'wasteDoughGrams'
  | 'wasteFrozenDough'
  | 'bufferJpops'
  | 'transferred'

export type ManualSummaryInputs = Record<ManualFieldKey, { ring: string; shell: string }>

export const manualFieldLabels: Record<ManualFieldKey, string> = {
  promotions: 'Promotions (donuts)',
  training: 'Training',
  staffMeal: 'Staff meal',
  wasteDoughGrams: 'Waste Dough (Grams)',
  wasteFrozenDough: 'Waste Frozen Dough',
  bufferJpops: 'Waste JPops',
  transferred: 'Transferred to other stores',
}

export function emptyManualSummaryInputs(): ManualSummaryInputs {
  return {
    promotions: { ring: '', shell: '' },
    training: { ring: '', shell: '' },
    staffMeal: { ring: '', shell: '' },
    wasteDoughGrams: { ring: '', shell: '' },
    wasteFrozenDough: { ring: '', shell: '' },
    bufferJpops: { ring: '', shell: '' },
    transferred: { ring: '', shell: '' },
  }
}

export function readManualSummaryInputs(storageKey: string, reports: HourlyDailyReportData[] = []): {
  values: ManualSummaryInputs
  error: string
} {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored) {
      const parsed: unknown = JSON.parse(stored)
      if (!parsed || typeof parsed !== 'object') {
        return { values: emptyManualSummaryInputs(), error: 'Saved manual inputs are invalid and could not be loaded.' }
      }

      const defaults = emptyManualSummaryInputs()
      const values = { ...defaults }
      for (const key of Object.keys(manualFieldLabels) as ManualFieldKey[]) {
        const row = (parsed as Record<string, unknown>)[key]
        if (!row || typeof row !== 'object') continue
        const record = row as Record<string, unknown>
        values[key] = {
          ring: typeof record.ring === 'string' ? record.ring : '',
          shell: typeof record.shell === 'string' ? record.shell : '',
        }
      }

      return { values, error: '' }
    }

    if (reports.length === 0) return { values: emptyManualSummaryInputs(), error: '' }

    const dailyInputs = reports.map((report) => readManualSummaryInputs(
      `hourly-sales-summary:${report.locationName}:${report.businessDate}`,
    ))
    const values = emptyManualSummaryInputs()
    for (const key of Object.keys(manualFieldLabels) as ManualFieldKey[]) {
      for (const part of ['ring', 'shell'] as const) {
        const enteredValues = dailyInputs
          .map(({ values: dailyValues }) => dailyValues[key][part])
          .filter((value) => value !== '')
          .map(Number)
        values[key][part] = enteredValues.length > 0
          ? String(enteredValues.reduce((total, value) => total + value, 0))
          : ''
      }
    }
    return {
      values,
      error: dailyInputs.find(({ error }) => error)?.error ?? '',
    }
  } catch {
    return {
      values: emptyManualSummaryInputs(),
      error: 'Unable to load saved manual inputs from this device.',
    }
  }
}
