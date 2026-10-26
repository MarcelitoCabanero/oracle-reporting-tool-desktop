import {
  AlertCircle,
} from 'lucide-react'
import {
  Fragment,
  useState,
} from 'react'

import './HourlyDailyReport.css'

type HourlyDailyReportData = Awaited<
  ReturnType<typeof window.api.hourlySales.getDailyReport>
>

interface HourlyDailyReportProps {
  report: HourlyDailyReportData
}

function quantity(value: number) {
  return value.toLocaleString('en-PH', {
    maximumFractionDigits: 2,
  })
}

function percent(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function roundAwayFromZero(value: number) {
  return Math.sign(value) * Math.floor(Math.abs(value) + 0.5)
}

const jpopsProduceConversionFactor = (56 * 7) / 35

function jpopsTrayCount(shellConversion: number) {
  return Math.round(shellConversion / jpopsProduceConversionFactor)
}

function batchCount(ring: number, shell: number) {
  return Math.ceil((ring + shell) / 240)
}

function dailyBatchCount(report: HourlyDailyReportData) {
  return batchCount(report.retardingProduced.ring, report.retardingProduced.shell) +
    report.rows.reduce((total, row) => total + batchCount(row.produced.ring, row.produced.shell), 0)
}

function dailyBatchOutput(report: HourlyDailyReportData) {
  return dailyBatchCount(report) * 248
}

type ComparisonCategory = 'ring' | 'shell' | 'jpops'

const comparisonCategories: { key: ComparisonCategory; label: string }[] = [
  { key: 'ring', label: 'Ring' },
  { key: 'shell', label: 'Shell' },
  { key: 'jpops', label: 'JPops' },
]

function normalizeHourRange(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/NN/g, 'PM')
    .replace(/[\s–—-]+/g, '')
}

function HourlyPosComparison({ report }: HourlyDailyReportProps) {
  const [category, setCategory] = useState<ComparisonCategory>('ring')
  const posSalesByHour = new Map<string, number>()

  for (const sale of report.posSales ?? []) {
    const key = normalizeHourRange(sale.hourRange)
    const sold = category === 'shell'
      ? sale.shellSold + sale.jclubSold
      : sale[`${category}Sold`]
    posSalesByHour.set(
      key,
      (posSalesByHour.get(key) ?? 0) + sold,
    )
  }

  const rows = report.rows.map((row) => {
    const processWaste =
      row.proofingWaste[category] +
      row.fryingWaste[category] +
      row.toppingWaste[category]

    return {
      hourRange: row.hourRange,
      produced: row.produced[category],
      sold: posSalesByHour.get(normalizeHourRange(row.hourRange)) ?? 0,
      waste: processWaste,
    }
  }).filter((row) => row.produced > 0 || row.sold > 0 || row.waste > 0)
  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => [row.produced, row.sold, row.waste]),
  )
  const categoryLabel = comparisonCategories.find((item) => item.key === category)?.label ?? category

  function renderQuantityCell(value: number, label: string) {
    return (
      <td>
        <div className="hourly-pos-comparison-value">
          <span>{quantity(value)}</span>
          <span className="hourly-pos-comparison-track" aria-hidden="true">
            <span
              className={`hourly-pos-comparison-bar ${label}`}
              style={{ width: `${(value / maxValue) * 100}%` }}
            />
          </span>
        </div>
      </td>
    )
  }

  return (
    <section className="hourly-pos-comparison" aria-label="Hourly POS sales, production, and waste comparison">
      <div className="hourly-pos-comparison-heading">
        <div>
          <h2>POS sold vs production &amp; waste</h2>
          <p>
            {categoryLabel} quantities by hour · POS actuals compared with hourly production and recorded process waste
          </p>
        </div>
        <div className="hourly-pos-comparison-categories" role="group" aria-label="Product category">
          {comparisonCategories.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={category === item.key}
              className={category === item.key ? 'active' : ''}
              onClick={() => setCategory(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hourly-pos-comparison-scroll">
        <table className="hourly-pos-comparison-table">
          <thead>
            <tr>
              <th scope="col">Hour</th>
              <th scope="col">Produced</th>
              <th scope="col">POS sold</th>
              <th scope="col">Process waste</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.hourRange}>
                <th scope="row">{row.hourRange}</th>
                {renderQuantityCell(row.produced, 'produced')}
                {renderQuantityCell(row.sold, 'sold')}
                {renderQuantityCell(row.waste, 'waste')}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="hourly-pos-comparison-empty">
                  No {categoryLabel.toLowerCase()} production, POS sales, or process waste recorded for this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="hourly-pos-comparison-note">
        Bars use a shared scale for the selected product. Hours with no activity are hidden. Shell POS sales include J.Club. JPops values follow the conversion returned by v_donutsold; POS sales can include stock produced earlier or received.
      </p>
    </section>
  )
}

interface SummaryQuantities {
  ring: number | null
  shell: number | null
  total: number | null
}

interface SummaryLine {
  label: string
  quantities: SummaryQuantities
  percentage?: number | null
  kind?: 'subtotal' | 'emphasis'
  manualKey?: ManualFieldKey
  posSalesKey?: 'jclubSold' | 'jpopsSold'
}

interface HourlyPercentageAllocation {
  sold: number
  foc: number
  waste: number
  buffer: number
  variance: number
  transfer: number
  produced: number
}

type ManualFieldKey =
  | 'promotions'
  | 'training'
  | 'staffMeal'
  | 'wasteDoughGrams'
  | 'wasteFrozenDough'
  | 'bufferJpops'
  | 'transferred'

type ManualSummaryInputs = Record<ManualFieldKey, { ring: string; shell: string }>

const manualFieldLabels: Record<ManualFieldKey, string> = {
  promotions: 'Promotions (donuts)',
  training: 'Training',
  staffMeal: 'Staff meal',
  wasteDoughGrams: 'Waste Dough (Grams)',
  wasteFrozenDough: 'Waste Frozen Dough',
  bufferJpops: 'Waste JPops',
  transferred: 'Transferred to other stores',
}

function emptyManualSummaryInputs(): ManualSummaryInputs {
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

function readManualSummaryInputs(storageKey: string, reports: HourlyDailyReportData[] = []): {
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

function addQuantities(
  left: HourlyDailyReportData['summary']['produced'],
  right: HourlyDailyReportData['summary']['produced'],
) {
  return {
    ring: left.ring + right.ring,
    shell: left.shell + right.shell,
    jpops: left.jpops + right.jpops,
    total: left.total + right.total,
  }
}

export function HourlyProductionSummary({ reports }: { reports: HourlyDailyReportData[] }) {
  const firstReport = reports[0]!
  const lastReport = reports[reports.length - 1]!
  const dateRange = reports.length === 1
    ? firstReport.businessDate
    : `${firstReport.businessDate} – ${lastReport.businessDate}`
  const storageDate = reports.length === 1
    ? firstReport.businessDate
    : `${firstReport.businessDate}..${lastReport.businessDate}`
  const storageKey = `hourly-sales-summary:${firstReport.locationName}:${storageDate}`
  const [storedInputs, setStoredInputs] = useState(() => readManualSummaryInputs(storageKey, reports))
  const manualInputs = storedInputs.values
  const manualError = storedInputs.error
  const rangeSummary = reports.reduce((total, report) => ({
    produced: addQuantities(total.produced, report.summary.produced),
    received: addQuantities(total.received, report.summary.received),
    sold: addQuantities(total.sold, report.summary.sold),
    netProducedSales: addQuantities(total.netProducedSales, report.summary.netProducedSales),
    variance: addQuantities(total.variance, report.summary.variance),
    tolerableVariance: total.tolerableVariance + report.summary.tolerableVariance,
    proofingWaste: addQuantities(total.proofingWaste, report.summary.proofingWaste),
    fryingWaste: addQuantities(total.fryingWaste, report.summary.fryingWaste),
    toppingWaste: addQuantities(total.toppingWaste, report.summary.toppingWaste),
    totalWaste: addQuantities(total.totalWaste, report.summary.totalWaste),
    tolerableWaste: total.tolerableWaste + report.summary.tolerableWaste,
    excessWaste: total.excessWaste + report.summary.excessWaste,
    excessWasteEquivalent: total.excessWasteEquivalent + report.summary.excessWasteEquivalent,
    endingInventory: report.summary.endingInventory,
    salesAllocation: 0,
    wasteAllocation: 0,
    varianceAllocation: 0,
  }), {
    produced: { ring: 0, shell: 0, jpops: 0, total: 0 },
    received: { ring: 0, shell: 0, jpops: 0, total: 0 },
    sold: { ring: 0, shell: 0, jpops: 0, total: 0 },
    netProducedSales: { ring: 0, shell: 0, jpops: 0, total: 0 },
    variance: { ring: 0, shell: 0, jpops: 0, total: 0 },
    tolerableVariance: 0,
    proofingWaste: { ring: 0, shell: 0, jpops: 0, total: 0 },
    fryingWaste: { ring: 0, shell: 0, jpops: 0, total: 0 },
    toppingWaste: { ring: 0, shell: 0, jpops: 0, total: 0 },
    totalWaste: { ring: 0, shell: 0, jpops: 0, total: 0 },
    tolerableWaste: 0,
    excessWaste: 0,
    excessWasteEquivalent: 0,
    endingInventory: firstReport.summary.endingInventory,
    salesAllocation: 0,
    wasteAllocation: 0,
    varianceAllocation: 0,
  })
  rangeSummary.salesAllocation = rangeSummary.produced.total === 0 ? 0 : rangeSummary.netProducedSales.total / rangeSummary.produced.total
  rangeSummary.wasteAllocation = rangeSummary.produced.total === 0 ? 0 : rangeSummary.totalWaste.total / rangeSummary.produced.total
  rangeSummary.varianceAllocation = rangeSummary.produced.total === 0 ? 0 : rangeSummary.variance.total / rangeSummary.produced.total
  const report = {
    ...firstReport,
    businessDate: dateRange,
    summary: rangeSummary,
    posSales: reports.flatMap((dailyReport) => dailyReport.posSales ?? []),
    posWaste: reports.reduce((total, dailyReport) => ({
      ring: total.ring + (dailyReport.posWaste?.ring ?? 0),
      shell: total.shell + (dailyReport.posWaste?.shell ?? 0),
      jpops: total.jpops + (dailyReport.posWaste?.jpops ?? 0),
    }), { ring: 0, shell: 0, jpops: 0 }),
    posFoc: reports.reduce((total, dailyReport) => ({
      ring: total.ring + (dailyReport.posFoc?.ring ?? 0),
      shell: total.shell + (dailyReport.posFoc?.shell ?? 0),
      jpops: total.jpops + (dailyReport.posFoc?.jpops ?? 0),
      jclub: total.jclub + (dailyReport.posFoc?.jclub ?? 0),
    }), { ring: 0, shell: 0, jpops: 0, jclub: 0 }),
  }

  function updateManualInput(
    field: ManualFieldKey,
    part: 'ring' | 'shell',
    value: string,
  ) {
    const numericValue = value === '' ? null : Number(value)
    if (
      numericValue !== null &&
      (!Number.isFinite(numericValue) || numericValue < 0)
    ) {
      setStoredInputs((current) => ({
        ...current,
        error: 'Manual quantities must be zero or greater.',
      }))
      return
    }

    const updated: ManualSummaryInputs = {
      ...manualInputs,
      [field]: { ...manualInputs[field], [part]: value },
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(updated))
      setStoredInputs({ values: updated, error: '' })
    } catch {
      setStoredInputs({
        values: updated,
        error: 'Manual inputs are visible but could not be saved on this device.',
      })
    }
  }

  function manualValue(key: ManualFieldKey, part: 'ring' | 'shell') {
    const value = manualInputs[key][part]
    return value === '' ? null : Number(value)
  }

  function manualTotal(key: ManualFieldKey) {
    const ring = manualValue(key, 'ring')
    const shell = manualValue(key, 'shell')
    return ring === null && shell === null ? null : (ring ?? 0) + (shell ?? 0)
  }

  const { summary } = report
  const batchResult = reports.reduce((total, dailyReport) => total + dailyBatchOutput(dailyReport), 0)
  const posSales = report.posSales ?? []
  const posJclubSold = posSales.reduce((total, row) => total + row.jclubSold, 0)
  const posJpopsSold = posSales.reduce((total, row) => total + row.jpopsSold, 0)
  const quantities = (
    ring: number,
    shell: number,
    total: number,
  ): SummaryQuantities => ({ ring, shell, total })
  const unavailable: SummaryQuantities = { ring: null, shell: null, total: null }
  const manualFocKeys: ManualFieldKey[] = ['promotions', 'training', 'staffMeal']

  function sumManual(keys: ManualFieldKey[], part: 'ring' | 'shell'): number | null {
    const values = keys.map((key) => manualValue(key, part))
    return values.every((value) => value === null)
      ? null
      : values.reduce<number>((total, value) => total + (value ?? 0), 0)
  }

  function wasteQuantities(waste: typeof report.summary.proofingWaste): SummaryQuantities {
    return quantities(waste.ring, waste.shell + waste.jpops, waste.total)
  }

  const bufferJpopsRing = manualValue('bufferJpops', 'ring') ?? 0
  const bufferJpopsShell = manualValue('bufferJpops', 'shell') ?? 0
  const bufferTotals = quantities(
    summary.proofingWaste.ring + summary.fryingWaste.ring + summary.toppingWaste.ring + bufferJpopsRing,
    summary.proofingWaste.shell + summary.proofingWaste.jpops +
      summary.fryingWaste.shell + summary.fryingWaste.jpops +
      summary.toppingWaste.shell + summary.toppingWaste.jpops +
      bufferJpopsShell,
    summary.proofingWaste.total + summary.fryingWaste.total + summary.toppingWaste.total +
      bufferJpopsRing + bufferJpopsShell,
  )
  const focRing = (sumManual(manualFocKeys, 'ring') ?? 0) + report.posFoc.ring
  const focShell = (sumManual(manualFocKeys, 'shell') ?? 0) +
    report.posFoc.shell + report.posFoc.jpops + report.posFoc.jclub
  const transferredRing = manualValue('transferred', 'ring') ?? 0
  const transferredShell = manualValue('transferred', 'shell') ?? 0
  const totalRing =
    summary.sold.ring - summary.received.ring +
    focRing +
    summary.proofingWaste.ring + summary.fryingWaste.ring + summary.toppingWaste.ring +
    (bufferTotals.ring ?? 0) +
    transferredRing
  const totalShell =
    summary.sold.shell + summary.sold.jpops - summary.received.shell - summary.received.jpops +
    focShell +
    summary.proofingWaste.shell + summary.proofingWaste.jpops +
    summary.fryingWaste.shell + summary.fryingWaste.jpops +
    summary.toppingWaste.shell + summary.toppingWaste.jpops +
    (bufferTotals.shell ?? 0) +
    transferredShell
  const summaryRangeTotal = totalRing + totalShell
  const sections: { title: string; lines: SummaryLine[] }[] = [
    {
      title: 'SALES',
      lines: [
        {
          label: 'POS donuts sold (combined)',
          quantities: quantities(summary.sold.ring, summary.sold.shell + summary.sold.jpops, summary.sold.total),
        },
        {
          label: 'J.Club sold',
          quantities: { ring: null, shell: posJclubSold, total: posJclubSold },
          posSalesKey: 'jclubSold',
        },
        {
          label: 'J.Pops sold',
          quantities: { ring: null, shell: posJpopsSold, total: posJpopsSold },
          posSalesKey: 'jpopsSold',
        },
        { label: 'J.Pops KIT sold', quantities: unavailable },
        {
          label: 'Received donuts (less)',
          quantities: quantities(-summary.received.ring, -(summary.received.shell + summary.received.jpops), -summary.received.total),
        },
        {
          label: 'Total produced sold',
          quantities: quantities(summary.netProducedSales.ring, summary.netProducedSales.shell, summary.netProducedSales.total),
          kind: 'subtotal',
        },
      ],
    },
    {
      title: 'FOC',
      lines: [
        ...(['promotions', 'training', 'staffMeal'] as const).map((key) => ({
          label: manualFieldLabels[key],
          quantities: unavailable,
          manualKey: key,
        })),
        {
          label: 'FOC - Donuts',
          quantities: quantities(
            report.posFoc.ring,
            report.posFoc.shell,
            report.posFoc.ring + report.posFoc.shell,
          ),
        },
        {
          label: 'FOC - J.Pops',
          quantities: { ring: null, shell: report.posFoc.jpops, total: report.posFoc.jpops },
        },
        {
          label: 'FOC - J.Club',
          quantities: { ring: null, shell: report.posFoc.jclub, total: report.posFoc.jclub },
        },
        {
          label: 'Total free of charge',
          quantities: quantities(focRing, focShell, focRing + focShell),
          kind: 'subtotal',
        },
      ],
    },
    {
      title: 'WASTE',
      lines: [
        {
          label: 'WP',
          quantities: quantities(summary.fryingWaste.ring, summary.fryingWaste.shell + summary.fryingWaste.jpops, summary.fryingWaste.total),
        },
        {
          label: 'WT',
          quantities: quantities(summary.toppingWaste.ring, summary.toppingWaste.shell + summary.toppingWaste.jpops, summary.toppingWaste.total),
        },
        { label: manualFieldLabels.wasteDoughGrams, quantities: unavailable, manualKey: 'wasteDoughGrams' },
        {
          label: 'Raw Waste',
          quantities: quantities(summary.proofingWaste.ring, summary.proofingWaste.shell + summary.proofingWaste.jpops, summary.proofingWaste.total),
        },
        { label: manualFieldLabels.wasteFrozenDough, quantities: unavailable, manualKey: 'wasteFrozenDough' },
        {
          label: 'Total actual wastages (tracked)',
          quantities: quantities(summary.totalWaste.ring, summary.totalWaste.shell + summary.totalWaste.jpops, summary.totalWaste.total),
          kind: 'subtotal',
        },
      ],
    },
    {
      title: 'BUFFER',
      lines: [
        { label: 'WE', quantities: wasteQuantities(summary.proofingWaste) },
        { label: 'WPL', quantities: wasteQuantities(summary.fryingWaste) },
        { label: 'WS', quantities: wasteQuantities(summary.toppingWaste) },
        { label: manualFieldLabels.bufferJpops, quantities: unavailable, manualKey: 'bufferJpops' },
        { label: 'Total buffer', quantities: bufferTotals, kind: 'subtotal' },
      ],
    },
    {
      title: 'TRANSFER',
      lines: [
        { label: manualFieldLabels.transferred, quantities: unavailable, manualKey: 'transferred' },
        { label: 'Total', quantities: quantities(totalRing, totalShell, summaryRangeTotal), kind: 'subtotal' },
      ],
    },
  ]
  const metrics: SummaryLine[] = [
    {
      label: 'Produced donuts',
      quantities: quantities(summary.produced.ring, summary.produced.shell + summary.produced.jpops, summary.produced.total),
      kind: 'emphasis',
    },
    {
      label: 'Variance (produced versus sold)',
      quantities: { ring: null, shell: null, total: summary.produced.total - summaryRangeTotal },
      kind: 'emphasis',
    },
    {
      label: 'Tolerable variance (3%)',
      quantities: { ring: null, shell: null, total: summary.produced.total * 0.03 },
    },
    {
      label: 'Efficiency of baker',
      quantities: unavailable,
      percentage: batchResult === 0 ? null : summary.produced.total / batchResult,
    },
    {
      label: 'Tolerable wastages (1%)',
      quantities: { ring: null, shell: null, total: summary.tolerableWaste },
    },
    {
      label: 'Total actual wastages',
      quantities: quantities(summary.totalWaste.ring, summary.totalWaste.shell + summary.totalWaste.jpops, summary.totalWaste.total),
    },
    {
      label: 'Excess wastages',
      quantities: { ring: null, shell: null, total: summary.excessWaste },
    },
    {
      label: 'Excess waste equivalent (₱27 per piece)',
      quantities: { ring: null, shell: null, total: summary.excessWasteEquivalent },
    },
  ]

  function display(value: number | null) {
    return value === null ? '—' : quantity(value)
  }

  function renderLine(line: SummaryLine) {
    const manual = line.manualKey
      ? {
        ring: manualValue(line.manualKey, 'ring'),
        shell: manualValue(line.manualKey, 'shell'),
        total: manualTotal(line.manualKey),
      }
      : null

    function renderManualInput(
      key: ManualFieldKey,
      part: 'ring' | 'shell',
      value: string,
      label: string,
    ) {
      return (
        <input
          aria-label={`${line.label} ${label}`}
          className="hourly-production-manual-input"
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(event) => updateManualInput(key, part, event.target.value)}
        />
      )
    }

    const posSalesValue = line.posSalesKey === 'jclubSold'
      ? posJclubSold
      : line.posSalesKey === 'jpopsSold'
        ? posJpopsSold
        : null

    return (
      <tr className={line.kind ? `hourly-production-summary-${line.kind}` : undefined} key={line.label}>
        <th scope="row">{line.label}</th>
        {line.posSalesKey ? (
          <>
            <td></td>
            <td>{quantity(posSalesValue ?? 0)}</td>
            <td>{quantity(posSalesValue ?? 0)}</td>
          </>
        ) : manual && line.manualKey ? (
          <>
            <td>{renderManualInput(line.manualKey, 'ring', manualInputs[line.manualKey].ring, 'ring quantity')}</td>
            <td>{renderManualInput(line.manualKey, 'shell', manualInputs[line.manualKey].shell, 'shell quantity')}</td>
            <td>{display(manual.total)}</td>
          </>
        ) : line.percentage !== undefined ? (
          <>
            <td>—</td>
            <td>—</td>
            <td>{line.percentage === null ? '—' : `${Math.round(line.percentage * 100)}%`}</td>
          </>
        ) : (
          <>
            <td>{display(line.quantities.ring)}</td>
            <td>{display(line.quantities.shell)}</td>
            <td>{display(line.quantities.total)}</td>
          </>
        )}
      </tr>
    )
  }

  return (
    <div className="hourly-production-summary-layout">
      <section className="hourly-production-summary" aria-label="Donut production summary">
      <div className="hourly-production-summary-heading">
        <div>
          <h2>Donut production summary</h2>
          <p>{report.locationName} · {dateRange}</p>
        </div>
        <span>Date-range summary · manual rows are saved per location and selected range</span>
      </div>
      <div className="hourly-production-summary-scroll">
        <table className="hourly-production-summary-table">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Ring</th>
              <th scope="col">Shell</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          {sections.map((section) => (
            <tbody key={section.title}>
              <tr className="hourly-production-summary-section">
                <th scope="rowgroup" colSpan={4}>{section.title}</th>
              </tr>
              {section.lines.map(renderLine)}
            </tbody>
          ))}
          <tbody className="hourly-production-summary-totals">
            {metrics.map(renderLine)}
          </tbody>
        </table>
      </div>
      </section>
      <HourlyPosReport
        reports={reports}
        allocation={{
          sold: summary.netProducedSales.total ?? 0,
          foc: focRing + focShell,
          waste: summary.totalWaste.total ?? 0,
          buffer: bufferTotals.total ?? 0,
          variance: summary.produced.total - summaryRangeTotal,
          transfer: transferredRing + transferredShell,
          produced: summary.produced.total,
        }}
      />
      <p className="hourly-production-summary-note">

      </p>
      {manualError && <p className="hourly-production-summary-note error" role="alert">{manualError}</p>}
    </div>
  )
}

export function HourlyPosReport({
  reports,
  allocation,
}: {
  reports: HourlyDailyReportData[]
  allocation: HourlyPercentageAllocation
}) {
  const productionTotals = reports.reduce((total, report) => ({
    producedRing: total.producedRing + report.summary.produced.ring,
    producedShell: total.producedShell + report.summary.produced.shell,
    producedJpops: total.producedJpops + report.summary.produced.jpops,
    receivedRing: total.receivedRing + report.summary.received.ring,
    receivedShell: total.receivedShell + report.summary.received.shell,
    receivedJpops: total.receivedJpops + report.summary.received.jpops,
    wasteRing: total.wasteRing + report.summary.totalWaste.ring,
    wasteShell: total.wasteShell + report.summary.totalWaste.shell,
    wasteJpops: total.wasteJpops + report.summary.totalWaste.jpops,
    posWasteRing: total.posWasteRing + (report.posWaste?.ring ?? 0),
    posWasteShell: total.posWasteShell + (report.posWaste?.shell ?? 0),
    posWasteJpops: total.posWasteJpops + (report.posWaste?.jpops ?? 0),
  }), {
    producedRing: 0,
    producedShell: 0,
    producedJpops: 0,
    receivedRing: 0,
    receivedShell: 0,
    receivedJpops: 0,
    wasteRing: 0,
    wasteShell: 0,
    wasteJpops: 0,
    posWasteRing: 0,
    posWasteShell: 0,
    posWasteJpops: 0,
  })
  const posSales = reports.flatMap((report) =>
    (report.posSales ?? []).map((sale, index) => ({
      ...sale,
      businessDate: report.businessDate,
      rowKey: `${report.businessDate}-${sale.hourRange}-${index}`,
    })),
  )
  const posSalesTotals = posSales.reduce((total, row) => ({
    ring: total.ring + row.ringSold,
    shell: total.shell + row.shellSold,
    jpops: total.jpops + row.jpopsSold,
    jclub: total.jclub + row.jclubSold,
  }), { ring: 0, shell: 0, jpops: 0, jclub: 0 })
  const posWasteJpops = roundAwayFromZero(productionTotals.posWasteJpops * 24 * 7 / 35)
  const dateRange = reports.length === 0
    ? ''
    : reports.length === 1
      ? reports[0].businessDate
      : `${reports[0].businessDate} – ${reports[reports.length - 1].businessDate}`
  const productionReceivedRows = reports.flatMap((report) => {
    const rows: {
      key: string
      dateTime: string
      type: 'PRODUCED' | 'RECEIVED'
      ring: number
      shell: number
      jpops: number
    }[] = []

    function appendRow(
      dateTime: string,
      type: 'PRODUCED' | 'RECEIVED',
      values: HourlyDailyReportData['summary']['produced'],
    ) {
      if (values.total === 0) return
      rows.push({
        key: `${report.businessDate}-${dateTime}-${type}`,
        dateTime: `${report.businessDate} · ${dateTime}`,
        type,
        ring: values.ring,
        shell: values.shell,
        jpops: values.jpops,
      })
    }

    appendRow('Retarding', 'PRODUCED', report.retardingProduced)
    appendRow('Retarding', 'RECEIVED', report.retardingReceived)
    for (const row of report.rows) {
      appendRow(row.hourRange, 'PRODUCED', row.produced)
      appendRow(row.hourRange, 'RECEIVED', row.received)
    }

    return rows
  })

  return (
    <div className="hourly-production-pos-report">
      <aside className="hourly-production-pos" aria-label="POS report">
        <div className="hourly-production-pos-heading">
          <div>
            <h2>POS &amp; waste report</h2>
            <span>{reports[0]?.locationName}</span>
          </div>
          <span>{dateRange}</span>
        </div>
        <section className="hourly-production-pos-section" aria-label="Production and received totals">
          <h3>Production &amp; received</h3>
          <div className="hourly-production-summary-scroll">
            <table className="hourly-production-pos-table">
              <thead>
                <tr>
                  <th scope="col">Date / time</th>
                  <th scope="col">Type</th>
                  <th scope="col">Ring Qty</th>
                  <th scope="col">Shell Qty</th>
                  <th scope="col">JPops Qty</th>
                </tr>
              </thead>
              <tbody>
                {productionReceivedRows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.dateTime}</th>
                    <td>{row.type}</td>
                    <td>{quantity(row.ring)}</td>
                    <td>{quantity(row.shell)}</td>
                    <td>{quantity(row.jpops)}</td>
                  </tr>
                ))}
                {productionReceivedRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="hourly-production-pos-empty">
                      No production or received records for this date range.
                    </td>
                  </tr>
                )}
                <tr className="hourly-production-pos-total hourly-production-pos-waste-total">
                  <th scope="row" colSpan={2}>TOTAL PRODUCED</th>
                  <td>{quantity(productionTotals.producedRing)}</td>
                  <td>{quantity(productionTotals.producedShell)}</td>
                  <td>{quantity(productionTotals.producedJpops)}</td>
                </tr>
                <tr className="hourly-production-pos-total">
                  <th scope="row" colSpan={2}>TOTAL RECEIVED</th>
                  <td>{quantity(productionTotals.receivedRing)}</td>
                  <td>{quantity(productionTotals.receivedShell)}</td>
                  <td>{quantity(productionTotals.receivedJpops)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className="hourly-production-pos-section" aria-label="Waste totals">
          <h3>Waste totals</h3>
          <p>Process waste is from hourly waste entries. POS waste is from dbo.v_itemdetail records with rvc_type = FOC Waste; its JPops quantity is converted to shell-equivalent pieces.</p>
          <div className="hourly-production-summary-scroll">
            <table className="hourly-production-pos-table">
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Ring Qty</th>
                  <th scope="col">Shell Qty</th>
                  <th scope="col">JPops Qty / eq.</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">PROCESS WASTE</th>
                  <td>{quantity(productionTotals.wasteRing)}</td>
                  <td>{quantity(productionTotals.wasteShell)}</td>
                  <td>{quantity(productionTotals.wasteJpops)}</td>
                </tr>
                <tr className="hourly-production-pos-total">
                  <th scope="row">POS WASTE</th>
                  <td>{quantity(productionTotals.posWasteRing)}</td>
                  <td>{quantity(productionTotals.posWasteShell)}</td>
                  <td>{quantity(posWasteJpops)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className="hourly-production-pos-section hourly-production-pos-sales" aria-label="POS donuts sold">
          <h3>POS donuts sold</h3>
          <div className="hourly-production-summary-scroll">
            <table className="hourly-production-pos-table">
              <thead>
                <tr>
                  <th scope="col">Date / time sold</th>
                  <th scope="col">Ring Qty</th>
                  <th scope="col">Shell Qty</th>
                  <th scope="col">JPops Qty</th>
                  <th scope="col">J.Club Qty</th>
                </tr>
              </thead>
              <tbody>
                {posSales.map((row) => (
                  <tr key={row.rowKey}>
                    <th scope="row">{row.businessDate} · {row.hourRange}</th>
                    <td>{quantity(row.ringSold)}</td>
                    <td>{quantity(row.shellSold)}</td>
                    <td>{quantity(row.jpopsSold)}</td>
                    <td>{quantity(row.jclubSold)}</td>
                  </tr>
                ))}
                {posSales.length === 0 && (
                  <tr><td colSpan={5} className="hourly-production-pos-empty">No POS sales for this date range.</td></tr>
                )}
                <tr className="hourly-production-pos-total">
                  <th scope="row">TOTAL SOLD</th>
                  <td>{quantity(posSalesTotals.ring)}</td>
                  <td>{quantity(posSalesTotals.shell)}</td>
                  <td>{quantity(posSalesTotals.jpops)}</td>
                  <td>{quantity(posSalesTotals.jclub)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className="hourly-production-pos-section" aria-label="Percentage allocation">
          <h3>Percentage Allocation</h3>
          <div className="hourly-production-summary-scroll">
            <table className="hourly-production-pos-table hourly-production-allocation-table">
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Total</th>
                  <th scope="col">Allocation</th>
                  <th scope="col">Calculation</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['SOLD', allocation.sold, 'Total produced sold / Produced donuts × 100'],
                  ['FOC', allocation.foc, 'Sum of FOC donuts / Produced donuts × 100'],
                  ['WASTE', allocation.waste, 'Sum of waste donuts / Produced donuts × 100'],
                  ['BUFFER', allocation.buffer, 'Sum of buffer donuts / Produced donuts × 100'],
                  ['VARIANCE', allocation.variance, 'Variance / Produced donuts × 100'],
                  ['TRANSFER', allocation.transfer, 'Transferred donuts / Produced × 100'],
                  ['PRODUCED', allocation.produced, 'Total actual donuts produced'],
                ] as const).map(([label, value, calculation]) => (
                  <tr
                    className={label === 'PRODUCED' ? 'hourly-production-allocation-produced' : undefined}
                    key={label}
                  >
                    <th scope="row">{label}</th>
                    <td>{quantity(value)}</td>
                    <td>
                      {allocation.produced === 0
                        ? '0.00%'
                        : `${((value / allocation.produced) * 100).toFixed(2)}%`}
                    </td>
                    <td className="hourly-production-allocation-calculation">{calculation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </aside>
    </div>
  )
}

function HourlyDailyReportView({ report }: HourlyDailyReportProps) {
  const { summary } = report
  const rows = report.rows
  const proofingGoodRing = rows.reduce((total, row) => total + row.proofingGood.ring, 0)
  const proofingGoodShell = rows.reduce((total, row) => total + row.proofingGood.shell, 0)
  const proofingGood = rows.reduce((total, row) => total + row.proofingGood.total, 0)
  const fryingGoodRing = rows.reduce((total, row) => total + row.fryingGood.ring, 0)
  const fryingGoodShell = rows.reduce((total, row) => total + row.fryingGood.shell, 0)
  const fryingGood = rows.reduce((total, row) => total + row.fryingGood.total, 0)
  const toppingGoodRing = rows.reduce((total, row) => total + row.toppingGood.ring, 0)
  const toppingGoodShell = rows.reduce((total, row) => total + row.toppingGood.shell, 0)
  const toppingGood = rows.reduce((total, row) => total + row.toppingGood.total, 0)
  const totalBatches = dailyBatchCount(report)

  return (
    <section className="hourly-report" aria-label="Hourly production monitoring report">
      <div className="hourly-report-kpis">
        <article className="hourly-report-kpi produced">
          <span>Produced donuts</span>
          <strong>{quantity(summary.produced.total)}</strong>
          <small>Ring and shell-equivalent quantity</small>
        </article>
        <article className="hourly-report-kpi sold">
          <span>POS donuts sold</span>
          <strong>{quantity(summary.sold.total)}</strong>
          <small>Hourly sales including converted JPops</small>
        </article>
        <article className="hourly-report-kpi variance">
          <span>Variance vs. produced</span>
          <strong>{quantity(summary.variance.total)}</strong>
          <small>{percent(summary.varianceAllocation)} of production</small>
        </article>
        <article className="hourly-report-kpi waste">
          <span>Total process waste</span>
          <strong>{quantity(summary.totalWaste.total)}</strong>
          <small>{percent(summary.wasteAllocation)} of production</small>
        </article>
      </div>

      <HourlyPosComparison report={report} />

      <div className="hourly-report-retarding">
        <div>
          <span>Retarding start</span>
          <small>Opening balance from the Retarding entry</small>
        </div>
        <div><span>Produced</span><strong>{quantity(report.retardingProduced.ring)} ring</strong><strong>{quantity(report.retardingProduced.shell + report.retardingProduced.jpops)} shell eq.</strong></div>
        <div><span>Received</span><strong>{quantity(report.retardingReceived.ring)} ring</strong><strong>{quantity(report.retardingReceived.shell + report.retardingReceived.jpops)} shell eq.</strong></div>
        <div><span>Tolerable variance (3%)</span><strong>{quantity(summary.tolerableVariance)}</strong></div>
        <div><span>Tolerable waste (1%)</span><strong>{quantity(summary.tolerableWaste)}</strong></div>
        <div><span>Excess waste × ₱27</span><strong>₱{quantity(summary.excessWasteEquivalent)}</strong></div>
      </div>

      <div className="hourly-report-manual-note" role="note">
        <AlertCircle size={16} aria-hidden="true" />
        <span>Batch output and baker efficiency are calculated from produced quantities. FOC, transfers, and buffer are manual fields in the Excel template and are not stored in the produce, waste, or POS source tables.</span>
      </div>

      <div className="hourly-report-table-wrap">
        <table className="hourly-report-table">
          <thead>
            <tr className="hourly-report-groups">
              <th rowSpan={3} scope="col">Hour</th>
              <th colSpan={2} scope="colgroup">Opening</th>
              <th colSpan={2} scope="colgroup">Received</th>
              <th colSpan={2} scope="colgroup">Produced</th>
              <th rowSpan={3} scope="col">JPOPS Tray</th>
              <th rowSpan={3} scope="col">SHELL Conversion</th>
              <th rowSpan={3} scope="col">Batch</th>
              <th colSpan={5} scope="colgroup">Proofing</th>
              <th colSpan={5} scope="colgroup">Frying</th>
              <th colSpan={5} scope="colgroup">Topping</th>
              <th colSpan={2} scope="colgroup">POS sold</th>
              <th colSpan={2} scope="colgroup">Ending balance</th>
            </tr>
            <tr>
              <th rowSpan={2} scope="col">Ring</th>
              <th rowSpan={2} scope="col">Shell eq.</th>
              <th rowSpan={2} scope="col">Ring</th>
              <th rowSpan={2} scope="col">Shell eq.</th>
              <th rowSpan={2} scope="col">Ring</th>
              <th rowSpan={2} scope="col">Shell</th>
              <th className="hourly-report-good-heading" colSpan={2} scope="colgroup">Good</th>
              <th className="hourly-report-waste-heading" colSpan={2} scope="colgroup">Bad/Waste</th>
              <th className="hourly-report-waste-heading" rowSpan={2} scope="col">Waste %</th>
              <th className="hourly-report-good-heading" colSpan={2} scope="colgroup">Good</th>
              <th className="hourly-report-waste-heading" colSpan={2} scope="colgroup">Bad/Waste</th>
              <th className="hourly-report-waste-heading" rowSpan={2} scope="col">Waste %</th>
              <th className="hourly-report-good-heading" colSpan={2} scope="colgroup">Good</th>
              <th className="hourly-report-waste-heading" colSpan={2} scope="colgroup">Bad/Waste</th>
              <th className="hourly-report-waste-heading" rowSpan={2} scope="col">Waste %</th>
              <th rowSpan={2} scope="col">Ring</th>
              <th rowSpan={2} scope="col">Shell eq.</th>
              <th rowSpan={2} scope="col">Ring</th>
              <th rowSpan={2} scope="col">Shell eq.</th>
            </tr>
            <tr>
              {Array.from({ length: 6 }, (_, index) => (
                <Fragment key={`waste-stage-${index}`}>
                  <th className={index % 2 === 1 ? 'hourly-report-waste-subheader' : 'hourly-report-good-subheader'} scope="col">Ring</th>
                  <th className={index % 2 === 1 ? 'hourly-report-waste-subheader' : 'hourly-report-good-subheader'} scope="col">Shell</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="hourly-report-retarding-row">
              <th scope="row">Retarding balance</th>
              <td>—</td>
              <td>—</td>
              <td>{quantity(report.retardingReceived.ring)}</td>
              <td>{quantity(report.retardingReceived.shell + report.retardingReceived.jpops)}</td>
              <td>{quantity(report.retardingProduced.ring)}</td>
              <td>{quantity(report.retardingProduced.shell)}</td>
              <td>{quantity(jpopsTrayCount(report.retardingProduced.jpops))}</td>
              <td>{quantity(report.retardingProduced.jpops)}</td>
              <td>{quantity(Math.ceil((report.retardingProduced.ring + report.retardingProduced.shell) / 240))}</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>{quantity(report.retardingProduced.ring)}</td>
              <td>{quantity(report.retardingProduced.shell + report.retardingProduced.jpops)}</td>
            </tr>
            {rows.map((row) => (
              <tr key={row.hourRange}>
                <th scope="row">{row.hourRange}</th>
                <td>{quantity(row.opening.ring)}</td>
                <td>{quantity(row.opening.shell)}</td>
                <td>{quantity(row.received.ring)}</td>
                <td>{quantity(row.received.shell + row.received.jpops)}</td>
                <td>{quantity(row.produced.ring)}</td>
                <td>{quantity(row.produced.shell)}</td>
                <td>{quantity(jpopsTrayCount(row.produced.jpops))}</td>
                <td>{quantity(row.produced.jpops)}</td>
                <td>{quantity(Math.ceil((row.produced.ring + row.produced.shell) / 240))}</td>
                <td className="hourly-report-good-cell">{quantity(row.proofingGood.ring)}</td>
                <td className="hourly-report-good-cell">{quantity(row.proofingGood.shell)}</td>
                <td className="hourly-report-waste-cell">{quantity(row.proofingWaste.ring)}</td>
                <td className="hourly-report-waste-cell">{quantity(row.proofingWaste.shell + row.proofingWaste.jpops)}</td>
                <td className="hourly-report-waste-cell">{percent(row.proofingWasteRate)}</td>
                <td className="hourly-report-good-cell">{quantity(row.fryingGood.ring)}</td>
                <td className="hourly-report-good-cell">{quantity(row.fryingGood.shell)}</td>
                <td className="hourly-report-waste-cell">{quantity(row.fryingWaste.ring)}</td>
                <td className="hourly-report-waste-cell">{quantity(row.fryingWaste.shell + row.fryingWaste.jpops)}</td>
                <td className="hourly-report-waste-cell">{percent(row.fryingWasteRate)}</td>
                <td className="hourly-report-good-cell">{quantity(row.toppingGood.ring)}</td>
                <td className="hourly-report-good-cell">{quantity(row.toppingGood.shell)}</td>
                <td className="hourly-report-waste-cell">{quantity(row.toppingWaste.ring)}</td>
                <td className="hourly-report-waste-cell">{quantity(row.toppingWaste.shell + row.toppingWaste.jpops)}</td>
                <td className="hourly-report-waste-cell">{percent(row.toppingWasteRate)}</td>
                <td>{quantity(row.sold.ring)}</td>
                <td>{quantity(row.sold.shell + row.sold.jpops)}</td>
                <td>{quantity(row.ending.ring)}</td>
                <td>{quantity(row.ending.shell)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Daily total / ending</th>
              <td>{quantity(rows[0]?.opening.ring ?? 0)}</td>
              <td>{quantity(rows[0]?.opening.shell ?? 0)}</td>
              <td>{quantity(summary.received.ring)}</td>
              <td>{quantity(summary.received.shell + summary.received.jpops)}</td>
              <td>{quantity(summary.produced.ring)}</td>
              <td>{quantity(summary.produced.shell)}</td>
              <td>{quantity(jpopsTrayCount(summary.produced.jpops))}</td>
              <td>{quantity(summary.produced.jpops)}</td>
              <td>{quantity(totalBatches * 248)}</td>
              <td className="hourly-report-good-cell">{quantity(proofingGoodRing)}</td>
              <td className="hourly-report-good-cell">{quantity(proofingGoodShell)}</td>
              <td className="hourly-report-waste-cell">{quantity(summary.proofingWaste.ring)}</td>
              <td className="hourly-report-waste-cell">{quantity(summary.proofingWaste.shell + summary.proofingWaste.jpops)}</td>
              <td className="hourly-report-waste-cell">{percent(summary.proofingWaste.total / (proofingGood + summary.proofingWaste.total || 1))}</td>
              <td className="hourly-report-good-cell">{quantity(fryingGoodRing)}</td>
              <td className="hourly-report-good-cell">{quantity(fryingGoodShell)}</td>
              <td className="hourly-report-waste-cell">{quantity(summary.fryingWaste.ring)}</td>
              <td className="hourly-report-waste-cell">{quantity(summary.fryingWaste.shell + summary.fryingWaste.jpops)}</td>
              <td className="hourly-report-waste-cell">{percent(summary.fryingWaste.total / (fryingGood + summary.fryingWaste.total || 1))}</td>
              <td className="hourly-report-good-cell">{quantity(toppingGoodRing)}</td>
              <td className="hourly-report-good-cell">{quantity(toppingGoodShell)}</td>
              <td className="hourly-report-waste-cell">{quantity(summary.toppingWaste.ring)}</td>
              <td className="hourly-report-waste-cell">{quantity(summary.toppingWaste.shell + summary.toppingWaste.jpops)}</td>
              <td className="hourly-report-waste-cell">{percent(summary.toppingWaste.total / (toppingGood + summary.toppingWaste.total || 1))}</td>
              <td>{quantity(summary.sold.ring)}</td>
              <td>{quantity(summary.sold.shell + summary.sold.jpops)}</td>
              <td>{quantity(summary.endingInventory.ring)}</td>
              <td>{quantity(summary.endingInventory.shell)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="hourly-report-summary">
        <div><span>Net produced sales (POS less received)</span><strong>{quantity(summary.netProducedSales.total)}</strong><small>{percent(summary.salesAllocation)} of produced quantity</small></div>
        <div><span>Variance</span><strong>{quantity(summary.variance.total)}</strong><small>Produced less net produced sales</small></div>
        <div><span>Actual waste</span><strong>{quantity(summary.totalWaste.total)}</strong><small>Proofing + frying + topping</small></div>
        <div><span>Excess waste</span><strong>{quantity(summary.excessWaste)}</strong><small>Actual less 1% allowance, positive only</small></div>
        <div><span>Ending inventory</span><strong>{quantity(summary.endingInventory.total)}</strong><small>Ready quantity less POS sales</small></div>
      </div>
    </section>
  )
}

export default HourlyDailyReportView
