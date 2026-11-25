import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  HelpCircle,
  RefreshCw,
  Store as StoreIcon,
  TrendingUp,
} from 'lucide-react'
import type {
  FinanceInsightDistributionRow,
  FinanceInsightGrowthRow,
  FinanceInsightLoadResult,
} from '../../electron/finance-insight/finance-insight.repository'

type Preset = 'mtd' | '30d' | 'ytd' | 'custom'
type Granularity = 'month' | 'quarter' | 'year'
type ChannelMetricMode = 'sales' | 'qty' | 'avg'

interface Agg {
  netSales: number
  guests: number
  checks: number
}

interface PeriodResult {
  label: string
  current: Agg
  previous: Agg
  netSalesGrowth: number | null
  guestGrowth: number | null
  apcGrowth: number | null
  sssg: number | null
  comparableStores: number
}

interface StoreGrowthRow {
  locationName: string
  months: Record<string, number | null>
  ttm: number | null
  ttmSales: number
}

interface InsightPageCache {
  preset: Preset
  month: string
  year: string
  customFrom: string
  customTo: string
  granularity: Granularity
  channelMode: ChannelMetricMode
  data: FinanceInsightLoadResult | null
}

let pageCache: InsightPageCache | null = null

const PIE_COLORS = [
  'var(--fi-c1)',
  'var(--fi-c2)',
  'var(--fi-c3)',
  'var(--fi-c4)',
  'var(--fi-c5)',
  'var(--fi-c6)',
  'var(--fi-c7)',
]

const distributionColor = (i: number) => PIE_COLORS[i % PIE_COLORS.length]

const peso = (v: number) =>
  `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const int = (v: number) => Number(v || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })
const compact = (v: number) =>
  Number(v || 0).toLocaleString('en-PH', { notation: 'compact', maximumFractionDigits: 1 })
const pctText = (v: number | null) => (v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`)
const apcText = 'APC = net sales ÷ guest count. “—” means no comparable prior-year data.'

const GLOSSARY: { term: string; full: string; desc: string }[] = [
  {
    term: 'TTM',
    full: 'Trailing Twelve Months',
    desc: 'Rolling sum of the past 12 completed calendar months, smoothing out seasonal spikes.',
  },
  {
    term: 'YoY',
    full: 'Year-over-Year',
    desc: 'Percentage change compared against the exact same month/period one year earlier.',
  },
  {
    term: 'SSSG',
    full: 'Same-Store Sales Growth',
    desc: 'Organic YoY sales growth across completed months with active sales in both periods.',
  },
  {
    term: 'YTD',
    full: 'Year-to-Date',
    desc: 'From January 1 of the current year through the latest completed month, compared vs. the same months last year.',
  },
  {
    term: 'APC',
    full: 'Average Per Customer (Guest)',
    desc: 'Average net sales generated per guest (Net Sales ÷ GuestCount).',
  },
]

function pct(cur: number, prev: number): number | null {
  if (!prev) return null
  return ((cur - prev) / prev) * 100
}

function apc(a: Agg): number {
  return a.guests > 0 ? a.netSales / a.guests : 0
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
}

function latestMonth(rows: FinanceInsightGrowthRow[]): string | null {
  let latest: string | null = null
  for (const r of rows) if (!latest || r.ym > latest) latest = r.ym
  return latest
}

function sumMonths(rows: FinanceInsightGrowthRow[], months: Set<string>, store?: string): Agg {
  const out: Agg = { netSales: 0, guests: 0, checks: 0 }
  for (const r of rows) {
    if (!months.has(r.ym)) continue
    if (store !== undefined && r.locationName !== store) continue
    out.netSales += r.netSales
    out.guests += r.guests
    out.checks += r.checks
  }
  return out
}

function monthsRange(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(end, -(count - 1 - i)))
}

function computePeriod(
  rows: FinanceInsightGrowthRow[],
  label: string,
  curMonths: string[],
): PeriodResult {
  const prevMonths = curMonths.map((m) => shiftMonth(m, -12))
  const curSet = new Set(curMonths)
  const prevSet = new Set(prevMonths)
  const current = sumMonths(rows, curSet)
  const previous = sumMonths(rows, prevSet)

  const monthSales = new Map<string, number>()
  for (const r of rows) {
    monthSales.set(r.ym, (monthSales.get(r.ym) ?? 0) + r.netSales)
  }
  const matchedCurMonths = curMonths.filter(
    (m) => (monthSales.get(m) ?? 0) > 0 && (monthSales.get(shiftMonth(m, -12)) ?? 0) > 0,
  )
  const matchedPrevMonths = matchedCurMonths.map((m) => shiftMonth(m, -12))
  const matchedCur = sumMonths(rows, new Set(matchedCurMonths))
  const matchedPrev = sumMonths(rows, new Set(matchedPrevMonths))

  const stores = Array.from(new Set(rows.map((r) => r.locationName)))
  const byKey = new Map<string, number>()
  for (const r of rows) byKey.set(`${r.locationName}|${r.ym}`, r.netSales)
  let curComp = 0
  let prevComp = 0
  let comparableStores = 0
  if (matchedCurMonths.length > 0) {
    for (const s of stores) {
      const ok = [...matchedCurMonths, ...matchedPrevMonths].every(
        (m) => (byKey.get(`${s}|${m}`) ?? 0) > 0,
      )
      if (!ok) continue
      comparableStores += 1
      for (const m of matchedCurMonths) curComp += byKey.get(`${s}|${m}`) ?? 0
      for (const m of matchedPrevMonths) prevComp += byKey.get(`${s}|${m}`) ?? 0
    }
  }

  return {
    label,
    current,
    previous,
    netSalesGrowth: pct(matchedCur.netSales, matchedPrev.netSales),
    guestGrowth: pct(matchedCur.guests, matchedPrev.guests),
    apcGrowth:
      matchedPrev.guests > 0 && matchedCur.guests > 0 ? pct(apc(matchedCur), apc(matchedPrev)) : null,
    sssg: pct(curComp, prevComp),
    comparableStores,
  }
}

function buildPeriods(rows: FinanceInsightGrowthRow[], granularity: Granularity): PeriodResult[] {
  const end = latestMonth(rows)
  if (!end) return []
  if (granularity === 'month') {
    return monthsRange(end, 12).map((m) => computePeriod(rows, monthLabel(m), [m]))
  }
  if (granularity === 'quarter') {
    const months = monthsRange(end, 12)
    return [0, 1, 2, 3].map((q) => {
      const chunk = months.slice(q * 3, q * 3 + 3)
      return computePeriod(rows, `${monthLabel(chunk[0])} – ${monthLabel(chunk[2])}`, chunk)
    })
  }
  const ttm = computePeriod(rows, 'Trailing 12 months', monthsRange(end, 12))
  const year = end.slice(0, 4)
  const ytdMonths = monthsRange(end, 12).filter((m) => m.startsWith(year))
  return [ttm, computePeriod(rows, `YTD ${year} (through ${monthLabel(end)})`, ytdMonths)]
}

function buildStoreMatrix(rows: FinanceInsightGrowthRow[]): {
  months: string[]
  stores: StoreGrowthRow[]
} {
  const end = latestMonth(rows)
  if (!end) return { months: [], stores: [] }
  const months = monthsRange(end, 12)
  const byKey = new Map<string, number>()
  for (const r of rows) byKey.set(`${r.locationName}|${r.ym}`, r.netSales)
  const stores = Array.from(new Set(rows.map((r) => r.locationName))).sort()
  const ttmCur = new Set(months)

  const result = stores.map((s) => {
    const m: Record<string, number | null> = {}
    let matchedCur = 0
    let matchedPrev = 0
    for (const ym of months) {
      const curVal = byKey.get(`${s}|${ym}`) ?? 0
      const prevVal = byKey.get(`${s}|${shiftMonth(ym, -12)}`) ?? 0
      m[ym] = pct(curVal, prevVal)
      if (curVal > 0 && prevVal > 0) {
        matchedCur += curVal
        matchedPrev += prevVal
      }
    }
    const cur = sumMonths(rows, ttmCur, s).netSales
    return { locationName: s, months: m, ttm: pct(matchedCur, matchedPrev), ttmSales: cur }
  })
  return { months, stores: result }
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthOptions(): { value: string; label: string }[] {
  const now = new Date()
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    }
  })
}

function yearOptions(): string[] {
  const y = new Date().getFullYear()
  return [y, y - 1, y - 2, y - 3].map(String)
}

function computeRange(
  preset: Preset,
  month: string,
  year: string,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const today = new Date()
  if (preset === 'mtd') {
    const [y, m] = month.split('-').map(Number)
    const first = new Date(y, m - 1, 1)
    const last = new Date(y, m, 0)
    return { from: fmt(first), to: fmt(last > today ? today : last) }
  }
  if (preset === 'ytd') {
    const y = Number(year)
    const last = new Date(y, 11, 31)
    return { from: fmt(new Date(y, 0, 1)), to: fmt(last > today ? today : last) }
  }
  if (preset === '30d') {
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
    return {
      from: fmt(new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - 29)),
      to: fmt(yesterday),
    }
  }
  return { from: customFrom, to: customTo }
}

function Kpi({
  label,
  value,
  delta,
  hint,
}: {
  label: string
  value: string
  delta: number | null
  hint?: string
}) {
  const tone = delta === null ? 'flat' : delta >= 0 ? 'up' : 'down'
  return (
    <div className="fi-kpi">
      <div className="fi-kpi-label">{label}</div>
      <div className="fi-kpi-value">{value}</div>
      <div className={`fi-delta-value fi-${tone}`}>
        {pctText(delta)} <span className="fi-note">vs previous period</span>
      </div>
      {hint && <div className="fi-note">{hint}</div>}
    </div>
  )
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="fi-card">
      <header className="fi-card-head">
        <h6>{title}</h6>
        {subtitle && <span className="fi-note">{subtitle}</span>}
      </header>
      {children}
    </section>
  )
}

function Delta({
  label,
  value,
  tooltip,
}: {
  label: string
  value: number | null
  tooltip?: string
}) {
  const tone = value === null ? 'flat' : value >= 0 ? 'up' : 'down'
  return (
    <div className="fi-delta" title={tooltip}>
      <span className="fi-delta-label">
        {label}
        {tooltip && (
          <HelpCircle size={12} className="ms-1" style={{ verticalAlign: '-1px', opacity: 0.7 }} />
        )}
      </span>
      <span className={`fi-delta-value fi-${tone}`}>{pctText(value)}</span>
    </div>
  )
}

function heatStyle(v: number | null): React.CSSProperties {
  if (v === null) return {}
  const intensity = Math.min(Math.abs(v) / 30, 1) * 0.55 + 0.08
  const rgb = v >= 0 ? '22, 163, 74' : '220, 38, 38'
  return { background: `rgba(${rgb}, ${intensity})` }
}

/** Interactive SVG Daily Net Sales Area Chart with Recharts-style hover tooltip. */
function NetSalesAreaChart({
  data,
}: {
  data: Array<{ date: string; netSales: number; guests: number; checks: number; apc: number }>
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const width = 760
  const height = 240
  const padL = 56
  const padR = 16
  const padT = 12
  const padB = 28
  const plotW = width - padL - padR
  const plotH = height - padT - padB

  const maxVal = Math.max(...data.map((d) => d.netSales), 1)
  const xAt = (i: number) =>
    data.length <= 1 ? padL + plotW / 2 : padL + (i / (data.length - 1)) * plotW
  const yAt = (v: number) => padT + plotH - Math.max(0, Math.min(1, v / maxVal)) * plotH

  const linePoints = data.map((d, i) => `${xAt(i).toFixed(1)},${yAt(d.netSales).toFixed(1)}`).join(' ')
  const areaPath =
    data.length > 0
      ? `M ${xAt(0).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${data
          .map((d, i) => `${xAt(i).toFixed(1)} ${yAt(d.netSales).toFixed(1)}`)
          .join(' L ')} L ${xAt(data.length - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
      : ''

  const ticks = [0, 0.25, 0.5, 0.75, 1]
  const labelStep = Math.max(1, Math.ceil(data.length / 8))
  const colW = data.length > 1 ? plotW / (data.length - 1) : plotW

  const activePoint = hoverIdx !== null && data[hoverIdx] ? data[hoverIdx] : null
  const activeLeftPct =
    hoverIdx !== null && data.length > 0 ? (xAt(hoverIdx) / width) * 100 : 50

  return (
    <div className="fi-chart-box" onMouseLeave={() => setHoverIdx(null)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="fi-svg-chart"
        role="img"
        aria-label="Daily Net Sales Area Chart"
      >
        <defs>
          <linearGradient id="fiAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--fi-c1)" stopOpacity={0.42} />
            <stop offset="95%" stopColor="var(--fi-c1)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const val = maxVal * t
          const y = yAt(val)
          return (
            <g key={t}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="var(--fi-grid)"
                strokeDasharray="3 3"
              />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--fi-muted)">
                {compact(val)}
              </text>
            </g>
          )
        })}
        {areaPath && <path d={areaPath} fill="url(#fiAreaFill)" />}
        {data.length > 1 && (
          <polyline fill="none" stroke="var(--fi-c1)" strokeWidth="2.2" points={linePoints} />
        )}
        {hoverIdx !== null && data[hoverIdx] && (
          <line
            x1={xAt(hoverIdx)}
            y1={padT}
            x2={xAt(hoverIdx)}
            y2={padT + plotH}
            stroke="var(--fi-muted)"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
        )}
        {data.map((d, i) => {
          const isHovered = hoverIdx === i
          const hitX = Math.max(padL, xAt(i) - colW / 2)
          const hitW = Math.min(width - padR - hitX, colW)
          return (
            <g key={d.date}>
              <circle
                cx={xAt(i)}
                cy={yAt(d.netSales)}
                r={isHovered ? 5.5 : 3}
                fill="var(--fi-c1)"
                stroke={isHovered ? 'var(--fi-card)' : 'none'}
                strokeWidth={isHovered ? 2 : 0}
              />
              {(i % labelStep === 0 || i === data.length - 1) && (
                <text
                  x={xAt(i)}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="var(--fi-muted)"
                >
                  {d.date.slice(5)}
                </text>
              )}
              <rect
                x={hitX}
                y={padT}
                width={Math.max(4, hitW)}
                height={plotH}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoverIdx(i)}
              />
            </g>
          )
        })}
      </svg>

      {activePoint && (
        <div
          className="fi-chart-tooltip"
          style={{
            left: `${Math.min(82, Math.max(14, activeLeftPct))}%`,
            top: 12,
          }}
        >
          <div className="fi-tooltip-title">{activePoint.date}</div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-label">
              <span className="fi-dot" style={{ background: 'var(--fi-c1)' }} />
              Net Sales
            </span>
            <strong>{peso(activePoint.netSales)}</strong>
          </div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-label">Guests</span>
            <strong>{int(activePoint.guests)}</strong>
          </div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-label">APC</span>
            <strong>{activePoint.guests > 0 ? peso(activePoint.apc) : '—'}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeDonutSlice(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const clampedEnd = Math.min(endAngle, startAngle + 359.99)
  const startOuter = polarToCartesian(cx, cy, outerR, clampedEnd)
  const endOuter = polarToCartesian(cx, cy, outerR, startAngle)
  const startInner = polarToCartesian(cx, cy, innerR, clampedEnd)
  const endInner = polarToCartesian(cx, cy, innerR, startAngle)
  const largeArc = clampedEnd - startAngle <= 180 ? '0' : '1'

  return [
    'M',
    startOuter.x.toFixed(2),
    startOuter.y.toFixed(2),
    'A',
    outerR,
    outerR,
    0,
    largeArc,
    0,
    endOuter.x.toFixed(2),
    endOuter.y.toFixed(2),
    'L',
    endInner.x.toFixed(2),
    endInner.y.toFixed(2),
    'A',
    innerR,
    innerR,
    0,
    largeArc,
    1,
    startInner.x.toFixed(2),
    startInner.y.toFixed(2),
    'Z',
  ].join(' ')
}

/** Interactive SVG Donut Chart for Sales Distribution by Revenue Center with Hover Tooltip. */
function SalesDistributionPie({ data }: { data: FinanceInsightDistributionRow[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const total = data.reduce((s, r) => s + r.netSales, 0)
  const cx = 110
  const cy = 110
  const innerR = 54
  const outerR = 92

  const slices = useMemo(() => {
    if (total <= 0) return []
    const nonZero = data.filter((d) => d.netSales > 0)
    const padDeg = nonZero.length > 1 ? 1.5 : 0
    let cursor = 0
    return data.map((row, idx) => {
      const sweep = total > 0 ? (row.netSales / total) * 360 : 0
      const start = cursor + (sweep > padDeg ? padDeg / 2 : 0)
      const end = cursor + Math.max(0, sweep - (sweep > padDeg ? padDeg / 2 : 0))
      cursor += sweep
      return { row, idx, start, end, sweep }
    })
  }, [data, total])

  const hovered = hoverIdx !== null ? data[hoverIdx] : null

  return (
    <div className="fi-chart-box fi-donut-wrap" onMouseLeave={() => setHoverIdx(null)}>
      <svg
        viewBox="0 0 220 220"
        width="210"
        height="210"
        role="img"
        aria-label="Sales Distribution by Revenue Center Donut"
      >
        {slices.map(({ row, idx, start, end, sweep }) => {
          if (sweep <= 0) return null
          const isHovered = hoverIdx === idx
          const path = describeDonutSlice(
            cx,
            cy,
            innerR,
            isHovered ? outerR + 4 : outerR,
            start,
            end,
          )
          return (
            <path
              key={row.revenueCenter}
              d={path}
              fill={distributionColor(idx)}
              stroke="var(--fi-card)"
              strokeWidth="1.5"
              style={{
                cursor: 'pointer',
                opacity: hoverIdx === null || isHovered ? 1 : 0.72,
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={() => setHoverIdx(idx)}
            />
          )
        })}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize="11"
          fill="var(--fi-muted)"
        >
          {hovered ? hovered.revenueCenter : 'Total Net Sales'}
        </text>
        <text
          x={cx}
          y={cy + 13}
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="var(--fi-text)"
        >
          {hovered ? `${hovered.share.toFixed(1)}%` : compact(total)}
        </text>
      </svg>

      {hovered && hoverIdx !== null && (
        <div className="fi-chart-tooltip" style={{ left: '50%', top: 6 }}>
          <div className="fi-tooltip-title">
            <span className="fi-dot" style={{ background: distributionColor(hoverIdx) }} />
            {hovered.revenueCenter}
          </div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-label">Net Sales</span>
            <strong>{peso(hovered.netSales)}</strong>
          </div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-label">Share</span>
            <strong>{hovered.share.toFixed(1)}%</strong>
          </div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-label">Quantity</span>
            <strong>{int(hovered.qty)}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Replacement Visual Report for Single-Store Desktop:
 * Revenue Center Channel Performance Breakdown (Net Sales ₱ | QTY | Avg Price per Item)
 * with interactive hover tooltip.
 */
function RevenueCenterChannelChart({
  rows,
  mode,
}: {
  rows: FinanceInsightDistributionRow[]
  mode: ChannelMetricMode
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const metricVal = (r: FinanceInsightDistributionRow) => {
    if (mode === 'qty') return r.qty
    if (mode === 'avg') return r.qty > 0 ? r.netSales / r.qty : 0
    return r.netSales
  }

  const formatVal = (r: FinanceInsightDistributionRow) => {
    if (mode === 'qty') return `${int(r.qty)} pcs`
    if (mode === 'avg') return r.qty > 0 ? peso(r.netSales / r.qty) : '—'
    return peso(r.netSales)
  }

  const maxMetric = Math.max(...rows.map(metricVal), 1)
  const totalQty = rows.reduce((s, r) => s + r.qty, 0)
  const hovered = hoverIdx !== null ? rows[hoverIdx] : null

  return (
    <div className="fi-chart-box" onMouseLeave={() => setHoverIdx(null)}>
      <div className="fi-bar-list">
        {rows.map((r, i) => {
          const val = metricVal(r)
          const widthPct = val > 0 ? Math.max(3, (val / maxMetric) * 100) : 0
          const sharePct =
            mode === 'qty'
              ? totalQty > 0
                ? (r.qty / totalQty) * 100
                : 0
              : r.share
          const isHovered = hoverIdx === i

          return (
            <div
              key={r.revenueCenter}
              className={`fi-channel-bar-card ${isHovered ? 'is-hovered' : ''}`}
              onMouseEnter={() => setHoverIdx(i)}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fw-semibold d-inline-flex align-items-center">
                  <span className="fi-dot" style={{ background: distributionColor(i) }} />
                  {r.revenueCenter}
                </span>
                <span className="d-inline-flex align-items-center gap-2">
                  {mode !== 'avg' && (
                    <span className="fi-note">{sharePct.toFixed(1)}%</span>
                  )}
                  <strong className="fi-bar-value">{formatVal(r)}</strong>
                </span>
              </div>
              <div className="fi-bar-track">
                <div
                  className="fi-bar-fill"
                  style={{
                    width: `${widthPct}%`,
                    background: distributionColor(i),
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {hovered && hoverIdx !== null && (
        <div className="fi-chart-tooltip" style={{ left: '50%', top: 4 }}>
          <div className="fi-tooltip-title">
            <span className="fi-dot" style={{ background: distributionColor(hoverIdx) }} />
            {hovered.revenueCenter}
          </div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-label">Net Sales</span>
            <strong>{peso(hovered.netSales)} ({hovered.share.toFixed(1)}%)</strong>
          </div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-label">Qty Sold</span>
            <strong>
              {int(hovered.qty)} ({totalQty > 0 ? ((hovered.qty / totalQty) * 100).toFixed(1) : '0.0'}%)
            </strong>
          </div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-label">Avg Price / Qty</span>
            <strong>{hovered.qty > 0 ? peso(hovered.netSales / hovered.qty) : '—'}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

/** Interactive SVG Composed Chart for Monthly & Quarterly Growth with Hover Tooltip. */
function GrowthChart({
  periods,
  granularity,
}: {
  periods: PeriodResult[]
  granularity: Granularity
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const width = 760
  const height = 260
  const padL = 56
  const padR = 44
  const padT = 14
  const padB = 30
  const plotW = width - padL - padR
  const plotH = height - padT - padB

  const maxSales = Math.max(
    ...periods.flatMap((p) => [p.current.netSales, p.previous.netSales]),
    1,
  )
  const yoyVals = periods.map((p) => p.netSalesGrowth).filter((v): v is number => v !== null)
  const minYoy = Math.min(...yoyVals, -10, 0)
  const maxYoy = Math.max(...yoyVals, 10, 0)
  const yoySpan = Math.max(maxYoy - minYoy, 1)

  const slotW = periods.length > 0 ? plotW / periods.length : plotW
  const barW = Math.min(24, Math.max(8, slotW * 0.28))

  const ySales = (v: number) => padT + plotH - Math.max(0, Math.min(1, v / maxSales)) * plotH
  const yYoy = (v: number) => padT + plotH - ((v - minYoy) / yoySpan) * plotH

  const yoyPoints = periods
    .map((p, i) =>
      p.netSalesGrowth !== null
        ? `${(padL + i * slotW + slotW / 2).toFixed(1)},${yYoy(p.netSalesGrowth).toFixed(1)}`
        : null,
    )
    .filter(Boolean)
    .join(' ')

  const activePeriod = hoverIdx !== null && periods[hoverIdx] ? periods[hoverIdx] : null
  const activeLeftPct =
    hoverIdx !== null && periods.length > 0
      ? ((padL + hoverIdx * slotW + slotW / 2) / width) * 100
      : 50
  const prevLabel =
    granularity === 'month' ? 'Same month last year' : 'Same period last year'

  return (
    <div className="fi-chart-box" onMouseLeave={() => setHoverIdx(null)}>
      <div className="d-flex flex-wrap gap-3 justify-content-center mb-1 small">
        <span className="d-inline-flex align-items-center gap-1">
          <span className="fi-legend-swatch" style={{ background: 'var(--fi-c1)' }} />
          <span>Current</span>
        </span>
        <span className="d-inline-flex align-items-center gap-1">
          <span className="fi-legend-swatch" style={{ background: 'var(--fi-c-prev)' }} />
          <span>{prevLabel}</span>
        </span>
        <span className="d-inline-flex align-items-center gap-1">
          <span className="fi-legend-swatch" style={{ background: 'var(--fi-c3)' }} />
          <span>YoY %</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="fi-svg-chart"
        role="img"
        aria-label="Business Growth Chart"
      >
        {[0, 0.5, 1].map((t) => {
          const val = maxSales * t
          const y = ySales(val)
          const yoyTick = minYoy + yoySpan * t
          return (
            <g key={t}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="var(--fi-grid)"
                strokeDasharray="3 3"
              />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--fi-muted)">
                {compact(val)}
              </text>
              <text
                x={width - padR + 6}
                y={y + 4}
                textAnchor="start"
                fontSize="11"
                fill="var(--fi-muted)"
              >
                {`${yoyTick.toFixed(0)}%`}
              </text>
            </g>
          )
        })}
        {periods.map((p, i) => {
          const slotX = padL + i * slotW
          const cx = slotX + slotW / 2
          const curY = ySales(p.current.netSales)
          const prevY = ySales(p.previous.netSales)
          const isHovered = hoverIdx === i
          return (
            <g key={p.label}>
              {isHovered && (
                <rect
                  x={slotX + 2}
                  y={padT}
                  width={Math.max(4, slotW - 4)}
                  height={plotH}
                  fill="var(--fi-grid)"
                  opacity={0.35}
                  rx={4}
                />
              )}
              <rect
                x={cx - barW - 1}
                y={curY}
                width={barW}
                height={Math.max(1, padT + plotH - curY)}
                fill="var(--fi-c1)"
                rx={3}
              />
              <rect
                x={cx + 1}
                y={prevY}
                width={barW}
                height={Math.max(1, padT + plotH - prevY)}
                fill="var(--fi-c-prev)"
                rx={3}
              />
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                fontSize="10.5"
                fill="var(--fi-muted)"
              >
                {p.label}
              </text>
            </g>
          )
        })}
        {yoyPoints && (
          <polyline fill="none" stroke="var(--fi-c3)" strokeWidth="2.2" points={yoyPoints} />
        )}
        {periods.map((p, i) => {
          const slotX = padL + i * slotW
          const cx = slotX + slotW / 2
          const isHovered = hoverIdx === i
          return (
            <g key={`${p.label}-hit`}>
              {p.netSalesGrowth !== null && (
                <circle
                  cx={cx}
                  cy={yYoy(p.netSalesGrowth)}
                  r={isHovered ? 5.5 : 3.8}
                  fill="var(--fi-c3)"
                  stroke={isHovered ? 'var(--fi-card)' : 'none'}
                  strokeWidth={isHovered ? 2 : 0}
                />
              )}
              <rect
                x={slotX}
                y={padT}
                width={slotW}
                height={plotH}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIdx(i)}
              />
            </g>
          )
        })}
      </svg>

      {activePeriod && (
        <div
          className="fi-chart-tooltip"
          style={{
            left: `${Math.min(80, Math.max(18, activeLeftPct))}%`,
            top: 26,
          }}
        >
          <div className="fi-tooltip-title">{activePeriod.label}</div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-label">
              <span className="fi-dot" style={{ background: 'var(--fi-c1)' }} />
              Current
            </span>
            <strong>{peso(activePeriod.current.netSales)}</strong>
          </div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-label">
              <span className="fi-dot" style={{ background: 'var(--fi-c-prev)' }} />
              {prevLabel}
            </span>
            <strong>{peso(activePeriod.previous.netSales)}</strong>
          </div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-label">
              <span className="fi-dot" style={{ background: 'var(--fi-c3)' }} />
              YoY %
            </span>
            <strong>{pctText(activePeriod.netSalesGrowth)}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InsightPage() {
  const months = useMemo(() => monthOptions(), [])
  const years = useMemo(() => yearOptions(), [])
  const default30d = useMemo(() => computeRange('30d', '', '', '', ''), [])

  const [preset, setPreset] = useState<Preset>(pageCache?.preset ?? '30d')
  const [month, setMonth] = useState<string>(pageCache?.month ?? months[0].value)
  const [year, setYear] = useState<string>(pageCache?.year ?? years[0])
  const [customFrom, setCustomFrom] = useState<string>(pageCache?.customFrom ?? default30d.from)
  const [customTo, setCustomTo] = useState<string>(pageCache?.customTo ?? default30d.to)
  const [granularity, setGranularity] = useState<Granularity>(pageCache?.granularity ?? 'month')
  const [channelMode, setChannelMode] = useState<ChannelMetricMode>(
    pageCache?.channelMode ?? 'sales',
  )

  const [data, setData] = useState<FinanceInsightLoadResult | null>(pageCache?.data ?? null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const { from: dateFrom, to: dateTo } = useMemo(
    () => computeRange(preset, month, year, customFrom, customTo),
    [preset, month, year, customFrom, customTo],
  )

  const loadData = useCallback(async (from: string, to: string) => {
    if (!from || !to || from > to) return
    setLoading(true)
    setError('')
    try {
      const res = await window.api.financeInsight.load({ dateFrom: from, dateTo: to })
      if ('success' in res && (res as { success?: boolean }).success === false) {
        throw new Error((res as { message?: string }).message || 'Unable to load Finance Insight.')
      }
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Finance Insight data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData(dateFrom, dateTo)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [dateFrom, dateTo, loadData])

  useEffect(() => {
    pageCache = {
      preset,
      month,
      year,
      customFrom,
      customTo,
      granularity,
      channelMode,
      data,
    }
  }, [preset, month, year, customFrom, customTo, granularity, channelMode, data])

  const overview = data?.overview ?? null
  const dist = data?.distribution ?? null
  const growth = data?.growth ?? null

  const kpi = useMemo(() => {
    if (!overview) return null
    const { current: c, previous: p } = overview.kpis
    const curApc = c.guests > 0 ? c.netSales / c.guests : 0
    const prevApc = p.guests > 0 ? p.netSales / p.guests : 0
    const avgCheck = c.checks > 0 ? c.netSales / c.checks : 0
    const pAvgCheck = p.checks > 0 ? p.netSales / p.checks : 0
    return {
      netSales: { v: c.netSales, d: pct(c.netSales, p.netSales) },
      apc: { v: curApc, d: prevApc > 0 && curApc > 0 ? pct(curApc, prevApc) : null },
      guests: { v: c.guests, d: pct(c.guests, p.guests) },
      avgCheck: { v: avgCheck, d: pAvgCheck > 0 && avgCheck > 0 ? pct(avgCheck, pAvgCheck) : null },
      checks: { v: c.checks, d: pct(c.checks, p.checks) },
    }
  }, [overview])

  const growthRows = useMemo(() => growth?.rows ?? [], [growth])
  const periods = useMemo(() => buildPeriods(growthRows, granularity), [growthRows, granularity])
  const matrix = useMemo(() => buildStoreMatrix(growthRows), [growthRows])
  const sortedStores = useMemo(
    () => [...matrix.stores].sort((a, b) => (b.ttm ?? -Infinity) - (a.ttm ?? -Infinity)),
    [matrix],
  )
  const headline = useMemo(() => buildPeriods(growthRows, 'year')[0], [growthRows])

  return (
    <div className="system-sales-workspace salestarget-workspace fi-page">
      {/* Header */}
      <div className="salestarget-header-bar mb-2">
        <div className="d-flex align-items-center gap-3 salestarget-header-title-wrap">
          <div className="salestarget-icon-badge d-flex align-items-center justify-content-center rounded-3 flex-shrink-0">
            <BarChart3 size={19} />
          </div>
          <div className="min-w-0">
            <h2 className="h6 fw-bold mb-0">Finance Insight</h2>
            <p className="salestarget-subtitle mb-0">
              Sales performance dashboard: net sales (excl. VAT), revenue center mix, APC (GuestCount), and YoY growth.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="salestarget-filter-bar mb-2">
        <div className="salestarget-filter-row">
          <div className="salestarget-filter-item is-store">
            <label className="salestarget-filter-label">
              <StoreIcon size={12} className="me-1" />
              Store / Location
            </label>
            <div className="salestarget-store-pill" title={data?.locationName}>
              {data?.locationName
                ? `${data.locationName} (${data.orgLocationRef || 'Store'})`
                : 'Resolving local store...'}
            </div>
          </div>

          <div className="salestarget-filter-item is-quarter">
            <label htmlFor="fi-period" className="salestarget-filter-label">
              Period
            </label>
            <select
              id="fi-period"
              className="form-select form-select-sm"
              value={preset}
              disabled={loading}
              onChange={(e) => setPreset(e.target.value as Preset)}
            >
              <option value="30d">Last 30 days</option>
              <option value="mtd">MTD (Month)</option>
              <option value="ytd">YTD (Year)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {preset === 'mtd' && (
            <div className="salestarget-filter-item is-month">
              <label htmlFor="fi-month" className="salestarget-filter-label">
                Month
              </label>
              <select
                id="fi-month"
                className="form-select form-select-sm"
                value={month}
                disabled={loading}
                onChange={(e) => setMonth(e.target.value)}
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {preset === 'ytd' && (
            <div className="salestarget-filter-item is-year">
              <label htmlFor="fi-year" className="salestarget-filter-label">
                Year
              </label>
              <select
                id="fi-year"
                className="form-select form-select-sm"
                value={year}
                disabled={loading}
                onChange={(e) => setYear(e.target.value)}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {preset === 'custom' && (
            <>
              <div className="salestarget-filter-item">
                <label htmlFor="fi-date-from" className="salestarget-filter-label">
                  Date From
                </label>
                <input
                  id="fi-date-from"
                  type="date"
                  className="form-control form-control-sm"
                  value={customFrom}
                  max={fmt(new Date())}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div className="salestarget-filter-item">
                <label htmlFor="fi-date-to" className="salestarget-filter-label">
                  Date To
                </label>
                <input
                  id="fi-date-to"
                  type="date"
                  className="form-control form-control-sm"
                  value={customTo}
                  max={fmt(new Date())}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="salestarget-filter-actions">
            <button
              type="button"
              className="btn btn-primary salestarget-action-btn"
              disabled={loading || dateFrom > dateTo}
              onClick={() => void loadData(dateFrom, dateTo)}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {dateFrom > dateTo && (
        <div className="alert alert-danger py-2 mb-2 small">
          Date From cannot be later than Date To.
        </div>
      )}
      {error && <div className="alert alert-danger py-2 mb-2 small">{error}</div>}
      {data?.warning && (
        <div className="alert alert-warning d-flex align-items-center gap-2 py-2 mb-2">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span className="small">{data.warning}</span>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="fi-kpi-row">
        {kpi ? (
          <>
            <Kpi label="Total Net Sales" value={peso(kpi.netSales.v)} delta={kpi.netSales.d} />
            <Kpi
              label="APC (per guest)"
              value={peso(kpi.apc.v)}
              delta={kpi.apc.d}
              hint={`${int(kpi.guests.v)} total guests`}
            />
            <Kpi label="Guest Count" value={int(kpi.guests.v)} delta={kpi.guests.d} />
            <Kpi
              label="Avg per Check"
              value={peso(kpi.avgCheck.v)}
              delta={kpi.avgCheck.d}
              hint={`${int(kpi.checks.v)} valid checks`}
            />
          </>
        ) : (
          <div className="fi-empty">{loading ? 'Loading...' : 'No data available.'}</div>
        )}
      </div>

      <div className="fi-grid">
        {/* Daily Net Sales Area Chart */}
        <div className="fi-span-2">
          <Card
            title="Net Sales"
            subtitle={overview ? `Daily (${overview.range.dateFrom} to ${overview.range.dateTo})` : 'Daily'}
          >
            {loading && !overview ? (
              <div className="fi-empty">Loading...</div>
            ) : !overview || overview.daily.length === 0 ? (
              <div className="fi-empty">No data for the selected filters.</div>
            ) : (
              <NetSalesAreaChart data={overview.daily} />
            )}
          </Card>
        </div>

        {/* APC Breakdown Table */}
        <div className="fi-span-2">
          <Card title="APC" subtitle="Net sales ÷ guest count (Daily breakdown)">
            {loading && !overview ? (
              <div className="fi-empty">Loading...</div>
            ) : !overview || overview.daily.length === 0 ? (
              <div className="fi-empty">No data for the selected filters.</div>
            ) : (
              <div className="fi-scroll">
                <table className="fi-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Net Sales</th>
                      <th>Guests</th>
                      <th>APC</th>
                      <th>Valid Checks</th>
                      <th>Avg per Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...overview.daily]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((d) => (
                        <tr key={d.date}>
                          <td>{d.date}</td>
                          <td>{peso(d.netSales)}</td>
                          <td>{int(d.guests)}</td>
                          <td>{d.guests > 0 ? peso(d.apc) : '—'}</td>
                          <td>{int(d.checks)}</td>
                          <td>{d.checks > 0 ? peso(d.netSales / d.checks) : '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const { current: c } = overview.kpis
                      const totApc = c.guests > 0 ? c.netSales / c.guests : 0
                      const totAvgCheck = c.checks > 0 ? c.netSales / c.checks : 0
                      return (
                        <tr className="fw-bold">
                          <td>Total ({overview.daily.length} days)</td>
                          <td>{peso(c.netSales)}</td>
                          <td>{int(c.guests)}</td>
                          <td>{c.guests > 0 ? peso(totApc) : '—'}</td>
                          <td>{int(c.checks)}</td>
                          <td>{c.checks > 0 ? peso(totAvgCheck) : '—'}</td>
                        </tr>
                      )
                    })()}
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Sales Distribution by Revenue Center */}
        <div className="fi-span-2">
          <Card
            title="Sales Distribution by Revenue Center"
            subtitle="Revenue center mix donut and channel performance breakdown"
          >
            {loading && !dist ? (
              <div className="fi-empty">Loading...</div>
            ) : !dist || dist.rows.length === 0 ? (
              <div className="fi-empty">No data for the selected filters.</div>
            ) : (
              <div className="fi-dist-split">
                <div className="fi-dist-pane">
                  <div className="mb-1">
                    <span className="fi-note">
                      <strong style={{ color: 'var(--fi-text)' }}>Revenue Center Share</strong> (Hover slice for details)
                    </span>
                  </div>
                  <SalesDistributionPie data={dist.rows} />
                  <div className="fi-table-wrap">
                    <table className="fi-table">
                      <thead>
                        <tr>
                          <th>Revenue Center</th>
                          <th>Qty</th>
                          <th>Net Sales</th>
                          <th>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dist.rows.map((r, i) => (
                          <tr key={r.revenueCenter}>
                            <td>
                              <span
                                className="fi-dot"
                                style={{ background: distributionColor(i) }}
                              />
                              {r.revenueCenter}
                            </td>
                            <td>{int(r.qty)}</td>
                            <td>{peso(r.netSales)}</td>
                            <td>{r.share.toFixed(1)}%</td>
                          </tr>
                        ))}
                        <tr className="fw-bold">
                          <td>Total</td>
                          <td>{int(dist.totalQty)}</td>
                          <td>{peso(dist.total)}</td>
                          <td>100.0%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="fi-dist-pane fi-dist-pane-right">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                    <span className="fi-note">
                      <strong style={{ color: 'var(--fi-text)' }}>
                        Revenue Center Channel Performance
                      </strong>{' '}
                      (Ranked Comparison)
                    </span>
                    <div className="btn-group btn-group-sm salestarget-seg-group" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={channelMode === 'sales'}
                        className={`btn ${
                          channelMode === 'sales'
                            ? 'salestarget-seg-btn-active'
                            : 'salestarget-seg-btn'
                        }`}
                        onClick={() => setChannelMode('sales')}
                      >
                        ₱ Net Sales
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={channelMode === 'qty'}
                        className={`btn ${
                          channelMode === 'qty'
                            ? 'salestarget-seg-btn-active'
                            : 'salestarget-seg-btn'
                        }`}
                        onClick={() => setChannelMode('qty')}
                      >
                        QTY
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={channelMode === 'avg'}
                        className={`btn ${
                          channelMode === 'avg'
                            ? 'salestarget-seg-btn-active'
                            : 'salestarget-seg-btn'
                        }`}
                        onClick={() => setChannelMode('avg')}
                      >
                        Avg / Qty
                      </button>
                    </div>
                  </div>
                  <div className="fi-legend-bar" aria-label="Revenue Center Legend">
                    {dist.rows.map((r, i) => (
                      <span key={r.revenueCenter} className="fi-legend-pill">
                        <span
                          className="fi-legend-swatch"
                          style={{ background: distributionColor(i) }}
                        />
                        <span>{r.revenueCenter}</span>
                      </span>
                    ))}
                  </div>
                  <div className="fi-dist-scroll">
                    <RevenueCenterChannelChart rows={dist.rows} mode={channelMode} />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Business Growth */}
        <div className="fi-span-2">
          <Card title="Business Growth" subtitle="Past 12 completed months vs prior year">
            {loading && !growth ? (
              <div className="fi-empty">Loading...</div>
            ) : growthRows.length === 0 ? (
              <div className="fi-empty">No sales history available for the selected store.</div>
            ) : (
              <div>
                <div className="fi-growth-head">
                  <div className="btn-group btn-group-sm salestarget-seg-group" role="tablist">
                    {(
                      [
                        ['month', 'Monthly', CalendarDays],
                        ['quarter', 'Quarterly', BarChart3],
                        ['year', 'Yearly', TrendingUp],
                      ] as [Granularity, string, typeof CalendarDays][]
                    ).map(([g, label, Icon]) => (
                      <button
                        key={g}
                        type="button"
                        role="tab"
                        aria-selected={granularity === g}
                        className={`btn d-inline-flex align-items-center gap-1 ${
                          granularity === g ? 'salestarget-seg-btn-active' : 'salestarget-seg-btn'
                        }`}
                        onClick={() => setGranularity(g)}
                      >
                        <Icon size={13} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  <span className="fi-note">
                    Completed months only; compared with the same period last year.
                  </span>
                </div>

                {granularity !== 'year' ? (
                  <GrowthChart periods={periods} granularity={granularity} />
                ) : (
                  <div className="fi-year-grid">
                    {periods.map((p) => (
                      <div className="fi-year-card" key={p.label}>
                        <div className="fi-kpi-label">{p.label}</div>
                        <div className="fi-kpi-value">
                          ₱
                          {p.current.netSales.toLocaleString('en-PH', {
                            maximumFractionDigits: 0,
                          })}
                        </div>
                        <div className="fi-note">
                          Prior: ₱
                          {p.previous.netSales.toLocaleString('en-PH', {
                            maximumFractionDigits: 0,
                          })}
                        </div>
                        <div className="fi-progress">
                          <div
                            className="fi-progress-bar"
                            style={{
                              width: `${
                                p.previous.netSales
                                  ? Math.min((p.current.netSales / p.previous.netSales) * 100, 150) /
                                    1.5
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <div className="fi-delta-row">
                          <Delta
                            label="Net Sales"
                            value={p.netSalesGrowth}
                            tooltip="Year-over-Year Net Sales growth vs. the same period last year"
                          />
                          <Delta
                            label="SSSG"
                            value={p.sssg}
                            tooltip="Same-Store Sales Growth: YoY growth across active comparable months"
                          />
                          <Delta
                            label="Guests"
                            value={p.guestGrowth}
                            tooltip="Year-over-Year Guest Count growth"
                          />
                          <Delta
                            label="APC"
                            value={p.apcGrowth}
                            tooltip="Year-over-Year Average Per Customer (Net Sales ÷ Guests) growth"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {headline && (
                  <div className="fi-delta-row fi-headline">
                    <Delta
                      label="TTM Net Sales YoY"
                      value={headline.netSalesGrowth}
                      tooltip="Trailing 12 Months Net Sales compared to the prior 12 months"
                    />
                    <Delta
                      label="TTM SSSG"
                      value={headline.sssg}
                      tooltip="Trailing 12 Months Same-Store Sales Growth across active months"
                    />
                    <Delta
                      label="TTM Guest Count YoY"
                      value={headline.guestGrowth}
                      tooltip="Trailing 12 Months total guest count vs. the prior 12 months"
                    />
                    <Delta
                      label="TTM APC YoY"
                      value={headline.apcGrowth}
                      tooltip="Trailing 12 Months Average Per Customer (Net Sales ÷ Guests) vs. the prior 12 months"
                    />
                  </div>
                )}

                <div className="fi-glossary" aria-label="Metric definitions">
                  {GLOSSARY.map((g) => (
                    <div key={g.term} className="fi-glossary-item">
                      <span className="fi-glossary-badge">{g.term}</span>
                      <div>
                        <strong className="fi-glossary-full">{g.full}</strong>
                        <span className="fi-note d-block">{g.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <h6 className="fi-subtitle">Monthly Growth Heatmap — YoY Net Sales % by Month</h6>
                <div className="fi-heat-wrap">
                  <table className="fi-heat">
                    <thead>
                      <tr>
                        <th>Store</th>
                        {matrix.months.map((m) => (
                          <th key={m}>{monthLabel(m)}</th>
                        ))}
                        <th>TTM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStores.map((s) => (
                        <tr key={s.locationName}>
                          <td>{s.locationName}</td>
                          {matrix.months.map((m) => (
                            <td key={m} style={heatStyle(s.months[m])}>
                              {s.months[m] === null ? '—' : `${s.months[m]!.toFixed(0)}%`}
                            </td>
                          ))}
                          <td className="fw-semibold" style={heatStyle(s.ttm)}>
                            {pctText(s.ttm)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="fi-note mt-2">{apcText}</div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
