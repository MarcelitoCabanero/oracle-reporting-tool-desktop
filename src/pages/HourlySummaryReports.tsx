import {
  useState,
} from 'react'

import {
  BarChart3,
} from 'lucide-react'

import {
  manualFieldLabels,
  readManualSummaryInputs,
} from './hourlySummaryInputs'
import type {
  ManualSummaryInputs,
} from './hourlySummaryInputs'

import './HourlySummaryReports.css'

type HourlyDailyReportData = Awaited<
  ReturnType<typeof window.api.hourlySales.getDailyReport>
>

type ReportName = 'MSSD' | 'MSWD' | 'MPPAR'

interface ProductAmounts {
  ring: number
  shell: number
}

const bufferJpopsConversionFactor = (24 * 7) / 35

interface WasteLine {
  label: string
  amounts: ProductAmounts
}

interface AllocationRow {
  report: HourlyDailyReportData
  produced: number
  sold: number
  foc: number
  waste: number
  buffer: number
  variance: number
  transferred: number
  excessWaste: number
  wasteEquivalent: number
}

const reportNames: ReportName[] = ['MSSD', 'MSWD', 'MPPAR']

function quantity(value: number) {
  return value.toLocaleString('en-PH', {
    maximumFractionDigits: 2,
  })
}

function percentage(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function savedManualInputs(report: HourlyDailyReportData) {
  return readManualSummaryInputs(
    `hourly-sales-summary:${report.locationName}:${report.businessDate}`,
  )
}

function sumManual(
  manual: ManualSummaryInputs,
  keys: (keyof typeof manual)[],
) {
  return keys.reduce((sum, key) => {
    const ring = Number(manual[key].ring || 0)
    const shell = Number(manual[key].shell || 0)
    return sum + ring + shell
  }, 0)
}

function amounts(ring: number, shell: number): ProductAmounts {
  return { ring, shell }
}

function total(amount: ProductAmounts) {
  return amount.ring + amount.shell
}

function dailyBatchOutput(report: HourlyDailyReportData) {
  const batchCount = (ring: number, shell: number) => Math.ceil((ring + shell) / 240)
  const retarding = batchCount(report.retardingProduced.ring, report.retardingProduced.shell)
  const hourly = report.rows.reduce(
    (count, row) => count + batchCount(row.produced.ring, row.produced.shell),
    0,
  )
  return (retarding + hourly) * 248
}

function MssdReport({ reports }: { reports: HourlyDailyReportData[] }) {
  const hours = reports[0]?.rows ?? []
  const totalsByReport = reports.map((report) =>
    report.rows.reduce((totals, row) => ({
      ring: totals.ring + row.sold.ring,
      shell: totals.shell + row.sold.shell + row.sold.jpops,
    }), amounts(0, 0)),
  )

  return (
    <div className="hourly-summary-table-scroll">
      <table className="hourly-summary-table hourly-summary-wide-table">
        <thead>
          <tr>
            <th scope="col" rowSpan={2}>Hour</th>
            {reports.map((report) => (
              <th scope="colgroup" colSpan={2} key={report.businessDate}>{report.businessDate}</th>
            ))}
          </tr>
          <tr>
            {reports.flatMap((report) => [
              <th scope="col" key={`${report.businessDate}-ring`}>Ring</th>,
              <th scope="col" key={`${report.businessDate}-shell`}>Shell</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour, hourIndex) => (
            <tr key={hour.hourRange}>
              <th scope="row">{hour.hourRange}</th>
              {reports.flatMap((report) => {
                const row = report.rows[hourIndex]
                return [
                  <td key={`${report.businessDate}-ring-${hourIndex}`}>{quantity(row?.sold.ring ?? 0)}</td>,
                  <td key={`${report.businessDate}-shell-${hourIndex}`}>{quantity(
                    (row?.sold.shell ?? 0) + (row?.sold.jpops ?? 0),
                  )}</td>,
                ]
              })}
            </tr>
          ))}
          <tr className="hourly-summary-subtotal-row">
            <th scope="row">TOTAL (Ring / Shell)</th>
            {totalsByReport.flatMap((dayTotal, index) => [
              <td key={`${reports[index].businessDate}-ring-subtotal`}>{quantity(dayTotal.ring)}</td>,
              <td key={`${reports[index].businessDate}-shell-subtotal`}>{quantity(dayTotal.shell)}</td>,
            ])}
          </tr>
          <tr className="hourly-summary-total-row">
            <th scope="row">TOTAL DONUTS SOLD</th>
            {totalsByReport.map((dayTotal, index) => (
              <td colSpan={2} key={`${reports[index].businessDate}-donut-total`}>
                {quantity(dayTotal.ring + dayTotal.shell)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function manualAmount(
  manual: ManualSummaryInputs,
  key: keyof typeof manual,
) {
  return amounts(Number(manual[key].ring || 0), Number(manual[key].shell || 0))
}

function wasteLines(report: HourlyDailyReportData): WasteLine[] {
  const manual = savedManualInputs(report).values
  const doughGrams = sumManual(manual, ['wasteDoughGrams'])

  return [
    {
      label: 'Waste Product',
      amounts: amounts(
        report.summary.fryingWaste.ring,
        report.summary.fryingWaste.shell + report.summary.fryingWaste.jpops,
      ),
    },
    {
      label: 'Waste Topping',
      amounts: amounts(
        report.summary.toppingWaste.ring,
        report.summary.toppingWaste.shell + report.summary.toppingWaste.jpops,
      ),
    },
    { label: 'Waste Dough', amounts: amounts(0, doughGrams / 35) },
    {
      label: 'Raw Waste',
      amounts: amounts(
        report.summary.proofingWaste.ring,
        report.summary.proofingWaste.shell + report.summary.proofingWaste.jpops,
      ),
    },
    { label: 'Waste Frozen Dough', amounts: manualAmount(manual, 'wasteFrozenDough') },
  ]
}

function bufferLines(report: HourlyDailyReportData): WasteLine[] {
  const manual = savedManualInputs(report).values

  return [
    {
      label: 'Waste Estimate',
      amounts: amounts(
        report.summary.proofingWaste.ring,
        report.summary.proofingWaste.shell + report.summary.proofingWaste.jpops,
      ),
    },
    {
      label: 'Waste Plain',
      amounts: amounts(
        report.summary.fryingWaste.ring,
        report.summary.fryingWaste.shell + report.summary.fryingWaste.jpops,
      ),
    },
    {
      label: 'Waste Sales',
      amounts: amounts(
        report.summary.toppingWaste.ring,
        report.summary.toppingWaste.shell + report.summary.toppingWaste.jpops,
      ),
    },
    {
      label: 'Waste JPops',
      amounts: amounts(0, sumManual(manual, ['bufferJpops']) * bufferJpopsConversionFactor),
    },
  ]
}

function MswdReport({ reports }: { reports: HourlyDailyReportData[] }) {
  const wasteByDate = new Map(reports.map((report) => [report.businessDate, wasteLines(report)]))
  const bufferByDate = new Map(reports.map((report) => [report.businessDate, bufferLines(report)]))

  function renderSection(title: string, rows: { label: string; getLines: (report: HourlyDailyReportData) => WasteLine[] }[]) {
    function getLines(report: HourlyDailyReportData) {
      return (title === 'WASTE' ? wasteByDate : bufferByDate).get(report.businessDate) ?? []
    }

    return (
      <tbody key={title}>
        <tr className="hourly-summary-section-row">
          <th scope="rowgroup" colSpan={reports.length * 2 + 1}>{title}</th>
        </tr>
        {rows.map(({ label, getLines }) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            {reports.flatMap((report) => {
              const line = getLines(report).find((item) => item.label === label)
              const value = line?.amounts ?? amounts(0, 0)
              return [
                <td key={`${report.businessDate}-ring`}>{quantity(value.ring)}</td>,
                <td key={`${report.businessDate}-shell`}>{quantity(value.shell)}</td>,
              ]
            })}
          </tr>
        ))}
        <tr className="hourly-summary-subtotal-row">
          <th scope="row">TOTAL (Ring / Shell)</th>
          {reports.flatMap((report) => {
            const lines = getLines(report)
            const subtotal = lines.reduce((sum, line) => ({
              ring: sum.ring + line.amounts.ring,
              shell: sum.shell + line.amounts.shell,
            }), amounts(0, 0))
            return [
              <td key={`${report.businessDate}-ring-subtotal`}>{quantity(subtotal.ring)}</td>,
              <td key={`${report.businessDate}-shell-subtotal`}>{quantity(subtotal.shell)}</td>,
            ]
          })}
        </tr>
        <tr className="hourly-summary-total-row">
          <th scope="row">{title === 'WASTE' ? 'TOTAL WASTE DONUTS' : 'TOTAL BUFFER DONUTS'}</th>
          {reports.map((report) => {
            const sum = getLines(report).reduce((value, line) => value + total(line.amounts), 0)
            return <td key={`${report.businessDate}-total`} colSpan={2}>{quantity(sum)}</td>
          })}
        </tr>
      </tbody>
    )
  }

  const wasteRows = [
    ...wasteByDate.values(),
  ]
  const bufferRows = [
    ...bufferByDate.values(),
  ]
  const wasteLabels = wasteRows[0]?.map(({ label }) => label) ?? []
  const bufferLabels = bufferRows[0]?.map(({ label }) => label) ?? []

  return (
    <div className="hourly-summary-table-scroll">
      <table className="hourly-summary-table hourly-summary-wide-table">
        <thead>
          <tr>
            <th scope="col" rowSpan={2}>Category</th>
            {reports.map((report) => (
              <th scope="colgroup" colSpan={2} key={report.businessDate}>{report.businessDate}</th>
            ))}
          </tr>
          <tr>
            {reports.flatMap((report) => [
              <th scope="col" key={`${report.businessDate}-ring`}>Ring</th>,
              <th scope="col" key={`${report.businessDate}-shell`}>Shell</th>,
            ])}
          </tr>
        </thead>
        {renderSection('WASTE', wasteLabels.map((label) => ({
          label,
          getLines: (report) => wasteByDate.get(report.businessDate) ?? [],
        })))}
        {renderSection('BUFFER', bufferLabels.map((label) => ({
          label,
          getLines: (report) => bufferByDate.get(report.businessDate) ?? [],
        })))}
      </table>
      <p className="hourly-summary-note">
        Waste dough uses grams ÷ 35; Waste JPops uses quantity × 24 × 7 ÷ 35. Daily manual values are read from the saved Donut summary for each date.
      </p>
    </div>
  )
}

function allocationRows(reports: HourlyDailyReportData[]): AllocationRow[] {
  return reports.map((report) => {
    const manual = savedManualInputs(report).values
    const produced = report.summary.produced.total
    const sold = report.summary.netProducedSales.total
    const foc = report.posFoc.ring + report.posFoc.shell + report.posFoc.jpops + report.posFoc.jclub +
      sumManual(manual, ['promotions', 'training', 'staffMeal'])
    const doughGrams = sumManual(manual, ['wasteDoughGrams'])
    const waste = report.summary.totalWaste.total +
      doughGrams / 35 +
      sumManual(manual, ['wasteFrozenDough'])
    const buffer = report.summary.totalWaste.total +
      sumManual(manual, ['bufferJpops']) * bufferJpopsConversionFactor
    const transferred = sumManual(manual, ['transferred'])
    const variance = produced - sold - foc - waste - buffer - transferred
    const excessWaste = waste - produced * 0.01

    return {
      report,
      produced,
      sold,
      foc,
      waste,
      buffer,
      variance,
      transferred,
      excessWaste,
      wasteEquivalent: excessWaste * 27,
    }
  })
}

function MpparReport({ reports }: { reports: HourlyDailyReportData[] }) {
  const rows = allocationRows(reports)
  const totals = rows.reduce((sum, row) => ({
    produced: sum.produced + row.produced,
    sold: sum.sold + row.sold,
    foc: sum.foc + row.foc,
    waste: sum.waste + row.waste,
    buffer: sum.buffer + row.buffer,
    variance: sum.variance + row.variance,
    transferred: sum.transferred + row.transferred,
    excessWaste: sum.excessWaste + row.excessWaste,
    wasteEquivalent: sum.wasteEquivalent + row.wasteEquivalent,
  }), {
    produced: 0,
    sold: 0,
    foc: 0,
    waste: 0,
    buffer: 0,
    variance: 0,
    transferred: 0,
    excessWaste: 0,
    wasteEquivalent: 0,
  })

  function allocation(value: number, produced: number) {
    return produced === 0 ? '—' : percentage(value / produced)
  }

  return (
    <div className="hourly-summary-table-scroll">
      <table className="hourly-summary-table hourly-mppar-table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Produced</th>
            <th scope="col">Total allocation %</th>
            <th scope="col">Sold</th>
            <th scope="col">Sold %</th>
            <th scope="col">FOC</th>
            <th scope="col">FOC %</th>
            <th scope="col">Waste</th>
            <th scope="col">Waste %</th>
            <th scope="col">Buffer</th>
            <th scope="col">Buffer %</th>
            <th scope="col">Variance</th>
            <th scope="col">Variance %</th>
            <th scope="col">Transferred</th>
            <th scope="col">Transferred %</th>
            <th scope="col">Excess waste</th>
            <th scope="col">Excess waste equivalent (₱27/pc)</th>
            <th scope="col">Efficiency of baker</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const batchOutput = dailyBatchOutput(row.report)
            return (
              <tr key={row.report.businessDate}>
                <th scope="row">{row.report.businessDate}</th>
                <td>{quantity(row.produced)}</td>
                <td>{allocation(
                  row.sold + row.foc + row.waste + row.buffer + row.variance + row.transferred,
                  row.produced,
                )}</td>
                <td>{quantity(row.sold)}</td>
                <td>{allocation(row.sold, row.produced)}</td>
                <td>{quantity(row.foc)}</td>
                <td>{allocation(row.foc, row.produced)}</td>
                <td>{quantity(row.waste)}</td>
                <td>{allocation(row.waste, row.produced)}</td>
                <td>{quantity(row.buffer)}</td>
                <td>{allocation(row.buffer, row.produced)}</td>
                <td>{quantity(row.variance)}</td>
                <td>{allocation(row.variance, row.produced)}</td>
                <td>{quantity(row.transferred)}</td>
                <td>{allocation(row.transferred, row.produced)}</td>
                <td>{quantity(row.excessWaste)}</td>
                <td>{quantity(row.wasteEquivalent)}</td>
                <td>{batchOutput === 0 ? '—' : percentage(row.produced / batchOutput)}</td>
              </tr>
            )
          })}
           <tr className="hourly-summary-total-row">
            <th scope="row">TOTAL</th>
            <td>{quantity(totals.produced)}</td>
            <td>{percentage(1)}</td>
            <td>{quantity(totals.sold)}</td>
            <td>{allocation(totals.sold, totals.produced)}</td>
            <td>{quantity(totals.foc)}</td>
            <td>{allocation(totals.foc, totals.produced)}</td>
            <td>{quantity(totals.waste)}</td>
            <td>{allocation(totals.waste, totals.produced)}</td>
            <td>{quantity(totals.buffer)}</td>
            <td>{allocation(totals.buffer, totals.produced)}</td>
            <td>{quantity(totals.variance)}</td>
            <td>{allocation(totals.variance, totals.produced)}</td>
            <td>{quantity(totals.transferred)}</td>
            <td>{allocation(totals.transferred, totals.produced)}</td>
            <td>{quantity(totals.excessWaste)}</td>
            <td>{quantity(totals.wasteEquivalent)}</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>
      <p className="hourly-summary-note">
        Percentages use the workbook formula allocation ÷ produced. Variance is produced − sold − FOC − waste − buffer − transferred. Tolerable waste is 1% of produced; excess waste is actual waste − tolerable waste, multiplied by ₱27 per piece. Manual FOC, waste, buffer, and transfer values use saved per-date Donut summary inputs. {manualFieldLabels.wasteDoughGrams} uses grams ÷ 35; manual Waste JPops uses quantity × 24 × 7 ÷ 35.
      </p>
    </div>
  )
}

export default function HourlySummaryReports({ reports }: { reports: HourlyDailyReportData[] }) {
  const [selectedReport, setSelectedReport] = useState<ReportName>('MSSD')
  const locationName = reports[0]?.locationName ?? ''
  const manualError = reports
    .map((report) => savedManualInputs(report).error)
    .find(Boolean)
  const dateRange = reports.length === 1
    ? reports[0].businessDate
    : `${reports[0]?.businessDate ?? ''} – ${reports.at(-1)?.businessDate ?? ''}`

  return (
    <section className="hourly-summary-reports" aria-label="Monthly hourly summary reports">
      <header className="hourly-summary-reports-heading">
        <div>
          <span><BarChart3 size={16} aria-hidden="true" /> WORKBOOK SUMMARY REPORTS</span>
          <h2>{locationName} · {dateRange}</h2>
          <p>MSSD, MSWD, and MPPAR calculations from the selected hourly-report dates.</p>
        </div>
      </header>
      <div className="hourly-summary-report-tabs" role="tablist" aria-label="Summary report">
        {reportNames.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={selectedReport === name}
            className={selectedReport === name ? 'active' : ''}
            onClick={() => setSelectedReport(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {manualError && (
        <p className="hourly-summary-error" role="alert">
          {manualError} Manual report inputs could not be loaded; calculations may omit them.
        </p>
      )}
      {selectedReport === 'MSSD' && <MssdReport reports={reports} />}
      {selectedReport === 'MSWD' && <MswdReport reports={reports} />}
      {selectedReport === 'MPPAR' && <MpparReport reports={reports} />}
    </section>
  )
}
