import {
  AlertCircle,
} from 'lucide-react'

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

interface SummaryQuantities {
  ring: number | null
  shell: number | null
  total: number | null
}

interface SummaryLine {
  label: string
  quantities: SummaryQuantities
  kind?: 'subtotal' | 'emphasis'
}

export function HourlyProductionSummary({ report }: HourlyDailyReportProps) {
  const { summary } = report
  const quantities = (
    ring: number,
    shell: number,
    total: number,
  ): SummaryQuantities => ({ ring, shell, total })
  const unavailable: SummaryQuantities = { ring: null, shell: null, total: null }
  const sections: { title: string; lines: SummaryLine[] }[] = [
    {
      title: 'SALES',
      lines: [
        {
          label: 'POS donuts sold (combined)',
          quantities: quantities(summary.sold.ring, summary.sold.shell + summary.sold.jpops, summary.sold.total),
        },
        { label: 'J.Club / J.Pops breakdown', quantities: unavailable },
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
        { label: 'Promotions, training and other FOC', quantities: unavailable },
        { label: 'Total free of charge', quantities: unavailable, kind: 'subtotal' },
      ],
    },
    {
      title: 'WASTE',
      lines: [
        {
          label: 'Proofing',
          quantities: quantities(summary.proofingWaste.ring, summary.proofingWaste.shell + summary.proofingWaste.jpops, summary.proofingWaste.total),
        },
        {
          label: 'Frying',
          quantities: quantities(summary.fryingWaste.ring, summary.fryingWaste.shell + summary.fryingWaste.jpops, summary.fryingWaste.total),
        },
        {
          label: 'Topping',
          quantities: quantities(summary.toppingWaste.ring, summary.toppingWaste.shell + summary.toppingWaste.jpops, summary.toppingWaste.total),
        },
        { label: 'Other waste types', quantities: unavailable },
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
        { label: 'Buffer entries', quantities: unavailable },
        { label: 'Total buffer', quantities: unavailable, kind: 'subtotal' },
      ],
    },
    {
      title: 'TRANSFER',
      lines: [
        { label: 'Transferred to other stores', quantities: unavailable },
        { label: 'Total transferred', quantities: unavailable, kind: 'subtotal' },
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
      quantities: quantities(summary.variance.ring, summary.variance.shell, summary.variance.total),
      kind: 'emphasis',
    },
    {
      label: 'Tolerable variance (3%)',
      quantities: { ring: null, shell: null, total: summary.tolerableVariance },
    },
    {
      label: 'Efficiency of baker',
      quantities: unavailable,
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
    return (
      <tr className={line.kind ? `hourly-production-summary-${line.kind}` : undefined} key={line.label}>
        <th scope="row">{line.label}</th>
        <td>{display(line.quantities.ring)}</td>
        <td>{display(line.quantities.shell)}</td>
        <td>{display(line.quantities.total)}</td>
      </tr>
    )
  }

  const posSales = report.posSales ?? []
  const posSalesTotals = posSales.reduce((total, row) => ({
    ring: total.ring + row.ringSold,
    shell: total.shell + row.shellSold,
    jpops: total.jpops + row.jpopsSold,
  }), { ring: 0, shell: 0, jpops: 0 })
  const posWaste = report.posWaste ?? { ring: 0, shell: 0, jpops: 0 }
  const posWasteJpops = roundAwayFromZero(posWaste.jpops * 24 * 7 / 35)

  return (
    <div className="hourly-production-summary-layout">
      <section className="hourly-production-summary" aria-label="Donut production summary">
      <div className="hourly-production-summary-heading">
        <div>
          <h2>Donut production summary</h2>
          <p>{report.locationName} · {report.businessDate}</p>
        </div>
        <span>Shell includes JPops equivalents</span>
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

      <aside className="hourly-production-pos" aria-label="POS report">
        <div className="hourly-production-pos-heading">
          <h2>POS report</h2>
          <span>{report.businessDate}</span>
        </div>
        <section className="hourly-production-pos-section" aria-label="Produce totals">
          <h3>Produce</h3>
          <div className="hourly-production-summary-scroll">
            <table className="hourly-production-pos-table">
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Ring Qty</th>
                  <th scope="col">Shell Qty</th>
                  <th scope="col">Jpops Qty</th>
                  <th scope="col">Remarks</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hourly-production-pos-total hourly-production-pos-waste-total">
                  <th scope="row">TOTAL PRODUCED</th>
                  <td>{quantity(summary.produced.ring)}</td>
                  <td>{quantity(summary.produced.shell)}</td>
                  <td>{quantity(summary.produced.jpops)}</td>
                  <td>—</td>
                </tr>
                <tr className="hourly-production-pos-total">
                  <th scope="row">TOTAL RECEIVED</th>
                  <td>{quantity(summary.received.ring)}</td>
                  <td>{quantity(summary.received.shell)}</td>
                  <td>{quantity(summary.received.jpops)}</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className="hourly-production-pos-section" aria-label="POS waste totals">
          <h3>Waste totals</h3>
          <p>POS waste comes from dbo.v_itemdetail records with rvc_type = FOC Waste.</p>
          <div className="hourly-production-summary-scroll">
            <table className="hourly-production-pos-table">
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Ring Qty</th>
                  <th scope="col">Shell Qty</th>
                  <th scope="col">Jpops Qty</th>
                  <th scope="col">Remarks</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">TOTAL WASTE</th>
                  <td>{quantity(summary.totalWaste.ring)}</td>
                  <td>{quantity(summary.totalWaste.shell)}</td>
                  <td>{quantity(summary.totalWaste.jpops)}</td>
                  <td>—</td>
                </tr>
                <tr className="hourly-production-pos-total">
                  <th scope="row">TOTAL POS WASTE</th>
                  <td>{quantity(posWaste.ring)}</td>
                  <td>{quantity(posWaste.shell)}</td>
                  <td>{quantity(posWasteJpops)}</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="hourly-production-pos-section hourly-production-pos-sales" aria-label="POS sales by hour">
          <h3>POS donuts sold</h3>
          <div className="hourly-production-summary-scroll">
            <table className="hourly-production-pos-table">
              <thead>
                <tr>
                  <th scope="col">Time sold</th>
                  <th scope="col">Ring Qty</th>
                  <th scope="col">Shell Qty</th>
                  <th scope="col">Jpops Qty</th>
                </tr>
              </thead>
              <tbody>
                {posSales.map((row, index) => (
                  <tr key={`${row.businessDate}-${row.hourRange}-${index}`}>
                    <th scope="row">
                      {report.businessDate.includes(' – ') &&
                        `${row.businessDate} · `}
                      {row.hourRange}
                    </th>
                    <td>{quantity(row.ringSold)}</td>
                    <td>{quantity(row.shellSold)}</td>
                    <td>{quantity(row.jpopsSold)}</td>
                  </tr>
                ))}
                {posSales.length === 0 && (
                  <tr><td colSpan={4} className="hourly-production-pos-empty">No POS sales for this date range.</td></tr>
                )}
                <tr className="hourly-production-pos-total">
                  <th scope="row">TOTAL SOLD</th>
                  <td>{quantity(posSalesTotals.ring)}</td>
                  <td>{quantity(posSalesTotals.shell)}</td>
                  <td>{quantity(posSalesTotals.jpops)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </aside>

      <p className="hourly-production-summary-note">
        A dash indicates a category that is not available in the current report data. FOC, buffer, transfers, and baker efficiency are not currently captured by the app. POS waste is read from dbo.v_itemdetail, filtered to FOC Waste, with JPops converted using 24 × 7 ÷ 35 and rounded to the nearest whole piece.
      </p>
    </div>
  )
}

function HourlyDailyReportView({ report }: HourlyDailyReportProps) {
  const { summary } = report
  const rows = report.rows
  const proofingGood = rows.reduce((total, row) => total + row.proofingGood.total, 0)
  const fryingGood = rows.reduce((total, row) => total + row.fryingGood.total, 0)
  const toppingGood = rows.reduce((total, row) => total + row.toppingGood.total, 0)

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
        <span>Batch count, FOC, transfers, and buffer are manual fields in the Excel template and are not stored in the produce, waste, or POS source tables. Baker efficiency and those totals are therefore not calculated here.</span>
      </div>

      <div className="hourly-report-table-wrap">
        <table className="hourly-report-table">
          <thead>
            <tr className="hourly-report-groups">
              <th rowSpan={2} scope="col">Hour</th>
              <th colSpan={2} scope="colgroup">Opening</th>
              <th colSpan={2} scope="colgroup">Received</th>
              <th colSpan={2} scope="colgroup">Produced</th>
              <th colSpan={3} scope="colgroup">Proofing</th>
              <th colSpan={2} scope="colgroup">After proofing</th>
              <th colSpan={3} scope="colgroup">Frying</th>
              <th colSpan={2} scope="colgroup">After frying</th>
              <th colSpan={3} scope="colgroup">Topping</th>
              <th colSpan={2} scope="colgroup">Ready</th>
              <th colSpan={2} scope="colgroup">POS sold</th>
              <th colSpan={2} scope="colgroup">Ending balance</th>
            </tr>
            <tr>
              {[
                ['opening', false],
                ['received', false],
                ['produced', false],
                ['proofing', true],
                ['after-proofing', false],
                ['frying', true],
                ['after-frying', false],
                ['topping', true],
                ['ready', false],
                ['sold', false],
                ['ending', false],
              ].flatMap(([section, hasRate]) => [
                <th key={`${section}-ring`}>Ring</th>,
                <th key={`${section}-shell`}>Shell eq.</th>,
                ...(hasRate ? [<th key={`${section}-rate`}>Loss %</th>] : []),
              ])}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.hourRange}>
                <th scope="row">{row.hourRange}</th>
                <td>{quantity(row.opening.ring)}</td>
                <td>{quantity(row.opening.shell)}</td>
                <td>{quantity(row.received.ring)}</td>
                <td>{quantity(row.received.shell + row.received.jpops)}</td>
                <td>{quantity(row.produced.ring)}</td>
                <td>{quantity(row.produced.shell + row.produced.jpops)}</td>
                <td>{quantity(row.proofingWaste.ring)}</td>
                <td>{quantity(row.proofingWaste.shell + row.proofingWaste.jpops)}</td>
                <td>{percent(row.proofingWasteRate)}</td>
                <td>{quantity(row.proofingGood.ring)}</td>
                <td>{quantity(row.proofingGood.shell)}</td>
                <td>{quantity(row.fryingWaste.ring)}</td>
                <td>{quantity(row.fryingWaste.shell + row.fryingWaste.jpops)}</td>
                <td>{percent(row.fryingWasteRate)}</td>
                <td>{quantity(row.fryingGood.ring)}</td>
                <td>{quantity(row.fryingGood.shell)}</td>
                <td>{quantity(row.toppingWaste.ring)}</td>
                <td>{quantity(row.toppingWaste.shell + row.toppingWaste.jpops)}</td>
                <td>{percent(row.toppingWasteRate)}</td>
                <td>{quantity(row.toppingGood.ring)}</td>
                <td>{quantity(row.toppingGood.shell)}</td>
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
              <td>{quantity(summary.produced.shell + summary.produced.jpops)}</td>
              <td>{quantity(summary.proofingWaste.ring)}</td>
              <td>{quantity(summary.proofingWaste.shell + summary.proofingWaste.jpops)}</td>
              <td>{percent(summary.proofingWaste.total / (proofingGood + summary.proofingWaste.total || 1))}</td>
              <td>{quantity(proofingGood)}</td>
              <td></td>
              <td>{quantity(summary.fryingWaste.ring)}</td>
              <td>{quantity(summary.fryingWaste.shell + summary.fryingWaste.jpops)}</td>
              <td>{percent(summary.fryingWaste.total / (fryingGood + summary.fryingWaste.total || 1))}</td>
              <td>{quantity(fryingGood)}</td>
              <td></td>
              <td>{quantity(summary.toppingWaste.ring)}</td>
              <td>{quantity(summary.toppingWaste.shell + summary.toppingWaste.jpops)}</td>
              <td>{percent(summary.toppingWaste.total / (toppingGood + summary.toppingWaste.total || 1))}</td>
              <td>{quantity(toppingGood)}</td>
              <td></td>
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
