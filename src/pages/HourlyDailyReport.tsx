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
