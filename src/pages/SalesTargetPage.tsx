import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  RefreshCw,
  Store as StoreIcon,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { SalesTargetLoadResult } from '../../electron/sales-target/sales-target.repository'

type SalesTargetTab = 'worksheet' | 'analytics'

interface SalesTargetPageCache {
  activeTab: SalesTargetTab
  targetYear: number
  targetQuarter: number
  monthFilter: number
  salesMetric: 'net' | 'gross'
  data: SalesTargetLoadResult | null
}

let pageCache: SalesTargetPageCache | null = null

const money = (v: unknown) =>
  Number(v ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const qty = (v: unknown, decimals = 0) =>
  Number(v ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })

const pct = (decimalVal: unknown, decimals = 1) =>
  `${(Number(decimalVal ?? 0) * 100).toFixed(decimals)}%`

function getQuarterMonths(quarter: number): Array<{ month: number; name: string }> {
  switch (quarter) {
    case 1:
      return [
        { month: 1, name: 'January' },
        { month: 2, name: 'February' },
        { month: 3, name: 'March' },
      ]
    case 2:
      return [
        { month: 4, name: 'April' },
        { month: 5, name: 'May' },
        { month: 6, name: 'June' },
      ]
    case 3:
      return [
        { month: 7, name: 'July' },
        { month: 8, name: 'August' },
        { month: 9, name: 'September' },
      ]
    default:
      return [
        { month: 10, name: 'October' },
        { month: 11, name: 'November' },
        { month: 12, name: 'December' },
      ]
  }
}

export default function SalesTargetPage() {
  const currentYear = new Date().getFullYear()
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1

  const [activeTab, setActiveTab] = useState<SalesTargetTab>(
    pageCache?.activeTab ?? 'analytics',
  )
  const [targetYear, setTargetYear] = useState<number>(
    pageCache?.targetYear ?? currentYear,
  )
  const [targetQuarter, setTargetQuarter] = useState<number>(
    pageCache?.targetQuarter ?? currentQuarter,
  )
  const [monthFilter, setMonthFilter] = useState<number>(pageCache?.monthFilter ?? 0)
  const [salesMetric, setSalesMetric] = useState<'net' | 'gross'>(
    pageCache?.salesMetric ?? 'net',
  )
  const [data, setData] = useState<SalesTargetLoadResult | null>(pageCache?.data ?? null)
  const [loading, setLoading] = useState<boolean>(false)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [error, setError] = useState<string>('')

  const loadData = useCallback(async (year: number, quarter: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await window.api.salesTarget.load({
        targetYear: year,
        targetQuarter: quarter,
      })
      if ('success' in res && (res as { success?: boolean }).success === false) {
        throw new Error((res as { message?: string }).message || 'Unable to load Sales Target.')
      }
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Sales Target data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(targetYear, targetQuarter)
  }, [targetYear, targetQuarter, loadData])

  useEffect(() => {
    pageCache = {
      activeTab,
      targetYear,
      targetQuarter,
      monthFilter,
      salesMetric,
      data,
    }
  }, [activeTab, targetYear, targetQuarter, monthFilter, salesMetric, data])

  const worksheet = data?.worksheet ?? null

  const quarterWorksheetTotals = useMemo(() => {
    if (!worksheet) {
      return {
        totalTargetSales: 0,
        totalLastYearSales: 0,
        totalDays: 0,
        totalCustomers: 0,
        quarterAds: 0,
        vsLastYearPct: 0,
      }
    }
    let totalTargetSales = 0
    let totalLastYearSales = 0
    let totalDays = 0
    let totalCustomers = 0

    for (const m of worksheet.months) {
      totalTargetSales += m.targetNetSales
      totalLastYearSales += m.lastYearNetSales
      totalDays += m.totalOperatingDays
      totalCustomers += m.monthlyCustomerCount
    }

    const quarterAds = totalDays > 0 ? totalTargetSales / totalDays : 0
    const vsLastYearPct =
      totalLastYearSales > 0
        ? ((totalTargetSales - totalLastYearSales) / totalLastYearSales) * 100
        : 0

    return {
      totalTargetSales,
      totalLastYearSales,
      totalDays,
      totalCustomers,
      quarterAds,
      vsLastYearPct,
    }
  }, [worksheet])

  const filteredSummary = useMemo(() => {
    const rows = data?.summary ?? []
    if (!monthFilter) return rows
    return rows.filter((r) => Number(r.TargetMonth) === monthFilter)
  }, [data?.summary, monthFilter])

  const filteredWdWe = useMemo(() => {
    const rows = data?.weekdayWeekendBreakdown ?? []
    if (!monthFilter) return rows
    return rows.filter((r) => Number(r.TargetMonth) === monthFilter)
  }, [data?.weekdayWeekendBreakdown, monthFilter])

  const filteredCategories = useMemo(() => {
    const rows = data?.categoryBreakdown ?? []
    if (!monthFilter) return rows
    return rows.filter((r) => Number(r.TargetMonth) === monthFilter)
  }, [data?.categoryBreakdown, monthFilter])

  const analyticsKpis = useMemo(() => {
    let targetSales = 0
    let actualNet = 0
    let actualGross = 0
    let lastYearNet = 0
    let targetCustomers = 0
    let actualCustomers = 0
    let totalTargetDays = 0
    let totalActualDays = 0

    for (const r of filteredSummary) {
      targetSales += Number(r.TargetNetSales || 0)
      actualNet += Number(r.ActualNetSales || 0)
      actualGross += Number(r.ActualGrossSales || 0)
      lastYearNet += Number(r.LastYearNetSales || 0)
      targetCustomers += Number(r.TargetCustomerCount || 0)
      actualCustomers += Number(r.ActualCustomerCount || 0)
      totalTargetDays += Number(r.TotalOperatingDays || 0)
      totalActualDays += Number(r.ActualOperatingDays || 0)
    }

    const primaryActual = salesMetric === 'gross' ? actualGross : actualNet
    const variance = primaryActual - targetSales
    const achievementPct = targetSales > 0 ? (primaryActual / targetSales) * 100 : 0
    const yoyGrowthPct =
      lastYearNet > 0 ? ((actualNet - lastYearNet) / lastYearNet) * 100 : 0
    const actualAvgCheck = actualCustomers > 0 ? actualNet / actualCustomers : 0
    const targetAds = totalTargetDays > 0 ? targetSales / totalTargetDays : 0
    const actualAds = totalActualDays > 0 ? primaryActual / totalActualDays : 0

    return {
      targetSales,
      actualNet,
      actualGross,
      primaryActual,
      variance,
      achievementPct,
      lastYearNet,
      yoyGrowthPct,
      targetCustomers,
      actualCustomers,
      actualAvgCheck,
      targetAds,
      actualAds,
    }
  }, [filteredSummary, salesMetric])

  const consolidatedCategories = useMemo(() => {
    const map = new Map<
      string,
      {
        categoryCode: string
        categoryName: string
        qtyUom: string
        sortOrder: number
        unitPriceDivisor: number
        targetSales: number
        actualNetSales: number
        actualGrossSales: number
        targetQty: number
        actualQty: number
      }
    >()

    for (const r of filteredCategories) {
      const existing = map.get(r.CategoryCode)
      if (!existing) {
        map.set(r.CategoryCode, {
          categoryCode: r.CategoryCode,
          categoryName: r.CategoryName,
          qtyUom: r.QtyUOM,
          sortOrder: Number(r.CategorySortOrder || 1),
          unitPriceDivisor: Number(r.UnitPriceDivisor || 0),
          targetSales: Number(r.TargetCategorySales || 0),
          actualNetSales: Number(r.ActualCategoryNetSales || 0),
          actualGrossSales: Number(r.ActualCategoryGrossSales || 0),
          targetQty: Number(r.TargetCategoryQty || 0),
          actualQty: Number(r.ActualCategoryQty || 0),
        })
      } else {
        existing.targetSales += Number(r.TargetCategorySales || 0)
        existing.actualNetSales += Number(r.ActualCategoryNetSales || 0)
        existing.actualGrossSales += Number(r.ActualCategoryGrossSales || 0)
        existing.targetQty += Number(r.TargetCategoryQty || 0)
        existing.actualQty += Number(r.ActualCategoryQty || 0)
      }
    }

    return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [filteredCategories])

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!data || !worksheet) return
    setExporting(format)
    setError('')
    try {
      if (activeTab === 'worksheet') {
        const res =
          format === 'excel'
            ? await window.api.salesTarget.exportWorksheetExcel(worksheet)
            : await window.api.salesTarget.exportWorksheetPdf(worksheet)
        if (!res.canceled && !res.success) setError(res.message)
      } else {
        const selectedMonthObj = getQuarterMonths(targetQuarter).find(
          (m) => m.month === monthFilter,
        )
        const payload = {
          targetYear,
          targetQuarter,
          locationName: data.locationName,
          orgLocationRef: data.orgLocationRef,
          monthLabel: selectedMonthObj?.name,
          salesMetric,
          summary: filteredSummary,
          weekdayWeekend: filteredWdWe,
          categories: filteredCategories,
        }
        const res =
          format === 'excel'
            ? await window.api.salesTarget.exportAnalyticsExcel(payload)
            : await window.api.salesTarget.exportAnalyticsPdf(payload)
        if (!res.canceled && !res.success) setError(res.message)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="system-sales-workspace salestarget-workspace">
      {/* View Mode Tabs — Same tab design as Menu Item (.rof-view-tabs / .rof-view-tab) */}
      <div className="rof-view-tabs menu-item-view-tabs mb-3" role="tablist" aria-label="Sales Target Views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'analytics'}
          className={`rof-view-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          disabled={loading}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={17} />
          Target vs. Actual
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'worksheet'}
          className={`rof-view-tab ${activeTab === 'worksheet' ? 'active' : ''}`}
          disabled={loading}
          onClick={() => setActiveTab('worksheet')}
        >
          <FileSpreadsheet size={17} />
          Target Worksheet
        </button>
      </div>

      {/* Fluid Flex Filter Bar (125% DPI Safe — No Rigid Grid Compression) */}
      <div className="salestarget-filter-bar mb-2">
        <div className="salestarget-filter-row">
          <div className="salestarget-filter-item is-store">
            <label className="salestarget-filter-label">
              <StoreIcon size={12} className="me-1" />
              Store Location
            </label>
            <div className="salestarget-store-pill" title={data?.locationName}>
              {data?.locationName
                ? `${data.locationName} (${data.orgLocationRef || 'Store'})`
                : 'Resolving local store...'}
            </div>
          </div>

          <div className="salestarget-filter-item is-year">
            <label htmlFor="st-year" className="salestarget-filter-label">
              Year
            </label>
            <select
              id="st-year"
              className="form-select form-select-sm"
              value={targetYear}
              disabled={loading}
              onChange={(e) => setTargetYear(Number(e.target.value))}
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <div className="salestarget-filter-item is-quarter">
            <label htmlFor="st-quarter" className="salestarget-filter-label">
              Quarter
            </label>
            <select
              id="st-quarter"
              className="form-select form-select-sm"
              value={targetQuarter}
              disabled={loading}
              onChange={(e) => {
                setTargetQuarter(Number(e.target.value))
                setMonthFilter(0)
              }}
            >
              <option value={1}>Q1 (Jan – Mar)</option>
              <option value={2}>Q2 (Apr – Jun)</option>
              <option value={3}>Q3 (Jul – Sep)</option>
              <option value={4}>Q4 (Oct – Dec)</option>
            </select>
          </div>

          {activeTab === 'analytics' && (
            <>
              <div className="salestarget-filter-item is-month">
                <label htmlFor="st-month" className="salestarget-filter-label">
                  Month Filter
                </label>
                <select
                  id="st-month"
                  className="form-select form-select-sm"
                  value={monthFilter}
                  disabled={loading}
                  onChange={(e) => setMonthFilter(Number(e.target.value))}
                >
                  <option value={0}>All 3 Months (Q{targetQuarter})</option>
                  {getQuarterMonths(targetQuarter).map((m) => (
                    <option key={m.month} value={m.month}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="salestarget-filter-item is-metric">
                <label className="salestarget-filter-label d-block">
                  Sales Metric Basis
                </label>
                <div className="btn-group btn-group-sm salestarget-seg-group">
                  <button
                    type="button"
                    className={`btn ${
                      salesMetric === 'net'
                        ? 'salestarget-seg-btn-active'
                        : 'salestarget-seg-btn'
                    }`}
                    onClick={() => setSalesMetric('net')}
                  >
                    Net Sales
                  </button>
                  <button
                    type="button"
                    className={`btn ${
                      salesMetric === 'gross'
                        ? 'salestarget-seg-btn-active'
                        : 'salestarget-seg-btn'
                    }`}
                    onClick={() => setSalesMetric('gross')}
                  >
                    Gross Sales
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="salestarget-filter-actions">
            <button
              type="button"
              className="btn btn-primary salestarget-action-btn"
              disabled={loading}
              onClick={() => void loadData(targetYear, targetQuarter)}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Loading...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-success salestarget-action-btn"
              disabled={!data || loading || exporting !== null}
              onClick={() => void handleExport('excel')}
            >
              {exporting === 'excel' ? (
                <LoaderCircle size={14} className="spin" />
              ) : (
                <FileSpreadsheet size={14} />
              )}
              <span>Excel</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-danger salestarget-action-btn"
              disabled={!data || loading || exporting !== null}
              onClick={() => void handleExport('pdf')}
            >
              {exporting === 'pdf' ? (
                <LoaderCircle size={14} className="spin" />
              ) : (
                <FileText size={14} />
              )}
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 mb-2 small">{error}</div>}
      {data?.warning && (
        <div className="alert alert-warning d-flex align-items-center gap-2 py-2 mb-2">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span className="small">{data.warning}</span>
        </div>
      )}

      {/* TAB 1: TARGET VS. ACTUAL ANALYTICS */}
      {activeTab === 'analytics' && data && (
        <>
          {/* 4 Summary KPI Cards — Auto-Scaling CSS Grid */}
          <div className="salestarget-kpi-grid mb-2">
            <div className="salestarget-kpi-card">
              <div className="d-flex justify-content-between align-items-center gap-2">
                <span className="salestarget-kpi-label mb-0">
                  Actual {salesMetric === 'gross' ? 'Gross' : 'Net'} Sales vs. Target
                </span>
                <span
                  className={`badge flex-shrink-0 ${
                    analyticsKpis.achievementPct >= 100
                      ? 'text-bg-success'
                      : analyticsKpis.achievementPct >= 85
                        ? 'text-bg-warning'
                        : 'text-bg-danger'
                  }`}
                >
                  {analyticsKpis.achievementPct.toFixed(1)}% Achieved
                </span>
              </div>
              <div className="salestarget-kpi-value text-primary">
                ₱{money(analyticsKpis.primaryActual)}
              </div>
              <div className="salestarget-kpi-subtext">
                Target: <strong>₱{money(analyticsKpis.targetSales)}</strong> (Var:{' '}
                <span
                  className={
                    analyticsKpis.variance >= 0
                      ? 'text-success fw-semibold'
                      : 'text-danger fw-semibold'
                  }
                >
                  {analyticsKpis.variance >= 0 ? '+' : ''}₱{money(analyticsKpis.variance)}
                </span>
                )
              </div>
            </div>

            <div className="salestarget-kpi-card">
              <div className="d-flex justify-content-between align-items-center gap-2">
                <span className="salestarget-kpi-label mb-0">
                  YoY Trend ({targetYear} vs. {targetYear - 1})
                </span>
                <TrendingUp size={15} className="text-primary flex-shrink-0" />
              </div>
              <div
                className={`salestarget-kpi-value ${
                  analyticsKpis.yoyGrowthPct >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {analyticsKpis.yoyGrowthPct >= 0 ? '+' : ''}
                {analyticsKpis.yoyGrowthPct.toFixed(2)}%
              </div>
              <div className="salestarget-kpi-subtext">
                Last Year Net Sales: <strong>₱{money(analyticsKpis.lastYearNet)}</strong>
              </div>
            </div>

            <div className="salestarget-kpi-card">
              <div className="salestarget-kpi-label">
                Average Daily Sales (Actual vs. Target ADS)
              </div>
              <div className="salestarget-kpi-value">₱{money(analyticsKpis.actualAds)}</div>
              <div className="salestarget-kpi-subtext">
                Target ADS: <strong>₱{money(analyticsKpis.targetAds)}</strong> / day
              </div>
            </div>

            <div className="salestarget-kpi-card">
              <div className="d-flex justify-content-between align-items-center gap-2">
                <span className="salestarget-kpi-label mb-0">
                  Actual Avg Check &amp; Guest Count
                </span>
                <Users size={15} className="text-secondary flex-shrink-0" />
              </div>
              <div className="salestarget-kpi-value">
                ₱{money(analyticsKpis.actualAvgCheck)}
              </div>
              <div className="salestarget-kpi-subtext">
                Actual Checks: <strong>{qty(analyticsKpis.actualCustomers, 0)}</strong> (Target:{' '}
                {qty(analyticsKpis.targetCustomers, 0)})
              </div>
            </div>
          </div>

          {/* Table 1: Category Target vs. Actual Performance */}
          <div className="salestarget-panel-card mb-2">
            <div className="salestarget-panel-header">
              <h5 className="h6 fw-bold mb-0">
                Category Target vs. Actual Performance (Sales ₱ &amp; Quantity PCS/BOXES)
              </h5>
              <small className="text-secondary" style={{ fontSize: '0.74rem' }}>
                Compares planned category targets against hybrid POS item sales (HQDB daily summaries + LocalDB unposted dates).
              </small>
            </div>
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle salestarget-table">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Category</th>
                    <th className="text-center">UOM</th>
                    <th className="text-end">Price Divisor</th>
                    <th className="text-end">Target Sales (₱)</th>
                    <th className="text-end">
                      Actual {salesMetric === 'gross' ? 'Gross' : 'Net'} Sales (₱)
                    </th>
                    <th className="text-end">Sales Variance (₱)</th>
                    <th className="text-center">Sales Achv %</th>
                    <th className="text-end">Target Qty</th>
                    <th className="text-end">Actual Qty</th>
                    <th className="text-end">Qty Variance</th>
                    <th className="text-center pe-3">Qty Achv %</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidatedCategories.map((cat) => {
                    const actualSalesVal =
                      salesMetric === 'gross' ? cat.actualGrossSales : cat.actualNetSales
                    const salesVar = actualSalesVal - cat.targetSales
                    const salesAchv =
                      cat.targetSales > 0 ? (actualSalesVal / cat.targetSales) * 100 : 0
                    const qtyVar = cat.actualQty - cat.targetQty
                    const qtyAchv = cat.targetQty > 0 ? (cat.actualQty / cat.targetQty) * 100 : 0

                    return (
                      <tr key={cat.categoryCode}>
                        <td className="ps-3 fw-bold">{cat.categoryName}</td>
                        <td className="text-center">
                          <span className="badge text-bg-light border text-secondary">
                            {cat.qtyUom}
                          </span>
                        </td>
                        <td className="text-end">₱{money(cat.unitPriceDivisor)}</td>
                        <td className="text-end fw-semibold">₱{money(cat.targetSales)}</td>
                        <td className="text-end fw-bold text-primary">
                          ₱{money(actualSalesVal)}
                        </td>
                        <td
                          className={`text-end fw-semibold ${
                            salesVar >= 0 ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {salesVar >= 0 ? '+' : ''}₱{money(salesVar)}
                        </td>
                        <td className="text-center" style={{ minWidth: 110 }}>
                          <div className="d-flex align-items-center gap-2 justify-content-center">
                            <div className="progress flex-grow-1" style={{ height: 5 }}>
                              <div
                                className={`progress-bar ${
                                  salesAchv >= 100
                                    ? 'bg-success'
                                    : salesAchv >= 80
                                      ? 'bg-warning'
                                      : 'bg-danger'
                                }`}
                                style={{ width: `${Math.min(100, salesAchv)}%` }}
                              />
                            </div>
                            <span className="small fw-semibold">{salesAchv.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="text-end fw-semibold">{qty(cat.targetQty, 0)}</td>
                        <td className="text-end fw-bold">{qty(cat.actualQty, 0)}</td>
                        <td
                          className={`text-end fw-semibold ${
                            qtyVar >= 0 ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {qtyVar >= 0 ? '+' : ''}
                          {qty(qtyVar, 0)}
                        </td>
                        <td className="text-center pe-3">
                          <span
                            className={`badge ${
                              qtyAchv >= 100
                                ? 'text-bg-success'
                                : qtyAchv >= 80
                                  ? 'text-bg-warning'
                                  : 'text-bg-secondary'
                            }`}
                          >
                            {qtyAchv.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Store & Monthly Target vs. Actual Summary */}
          <div className="salestarget-panel-card mb-2">
            <div className="salestarget-panel-header">
              <h5 className="h6 fw-bold mb-0">
                Monthly Target vs. Actual Summary (with YoY Growth &amp; Required Run-Rate)
              </h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle salestarget-table">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Store</th>
                    <th>Month</th>
                    <th className="text-center">Days (Act/Tgt)</th>
                    <th className="text-end">Target Sales (₱)</th>
                    <th className="text-end">Actual Net Sales (₱)</th>
                    <th className="text-end">Actual Gross (₱)</th>
                    <th className="text-end">Variance (₱)</th>
                    <th className="text-center">Achv %</th>
                    <th className="text-end">Target ADS</th>
                    <th className="text-end">Actual ADS</th>
                    <th className="text-end">Req. Run Rate</th>
                    <th className="text-end">Last Year Net</th>
                    <th className="text-center">YoY %</th>
                    <th className="text-end pe-3">Actual Avg Check</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummary.map((r) => {
                    const primaryAct =
                      salesMetric === 'gross' ? r.ActualGrossSales : r.ActualNetSales
                    const variance = primaryAct - r.TargetNetSales
                    const achvPct =
                      r.TargetNetSales > 0 ? (primaryAct / r.TargetNetSales) * 100 : 0
                    return (
                      <tr key={`${r.LocationName}-${r.TargetMonth}`}>
                        <td className="ps-3 fw-semibold">{r.LocationName}</td>
                        <td>{r.MonthName}</td>
                        <td className="text-center">
                          {r.ActualOperatingDays} / {r.TotalOperatingDays}
                        </td>
                        <td className="text-end fw-semibold">₱{money(r.TargetNetSales)}</td>
                        <td className="text-end fw-bold text-primary">
                          ₱{money(r.ActualNetSales)}
                        </td>
                        <td className="text-end text-secondary">
                          ₱{money(r.ActualGrossSales)}
                        </td>
                        <td
                          className={`text-end fw-semibold ${
                            variance >= 0 ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {variance >= 0 ? '+' : ''}₱{money(variance)}
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge ${
                              achvPct >= 100
                                ? 'text-bg-success'
                                : achvPct >= 85
                                  ? 'text-bg-warning'
                                  : 'text-bg-secondary'
                            }`}
                          >
                            {achvPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-end">₱{money(r.TargetADS)}</td>
                        <td className="text-end">₱{money(r.ActualADS)}</td>
                        <td className="text-end text-warning-emphasis fw-medium">
                          ₱{money(r.RequiredDailyRunRate)}
                        </td>
                        <td className="text-end text-secondary">
                          ₱{money(r.LastYearNetSales)}
                        </td>
                        <td
                          className={`text-center fw-semibold ${
                            r.YoYGrowthPct >= 0 ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {r.LastYearNetSales > 0
                            ? `${r.YoYGrowthPct >= 0 ? '+' : ''}${r.YoYGrowthPct.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="text-end pe-3">₱{money(r.ActualAvgCheck)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 3: Weekday vs. Weekend/HD Breakdown */}
          <div className="salestarget-panel-card mb-3">
            <div className="salestarget-panel-header">
              <h5 className="h6 fw-bold mb-0">
                Weekday vs. Weekend/Holiday (WEEKENDS/HD) Target vs. Actual Breakdown
              </h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle salestarget-table">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Store</th>
                    <th>Month</th>
                    <th className="text-center">WD Days (Act/Tgt)</th>
                    <th className="text-center">WE/HD Days (Act/Tgt)</th>
                    <th className="text-end">Target Daily (WD)</th>
                    <th className="text-end">Actual Daily (WD)</th>
                    <th className="text-end">Target Daily (WE/HD)</th>
                    <th className="text-end">Actual Daily (WE/HD)</th>
                    <th className="text-center">Planned Split (WD / WE)</th>
                    <th className="text-center pe-3">Actual Split (WD / WE)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWdWe.map((r) => (
                    <tr key={`wdwe-${r.LocationName}-${r.TargetMonth}`}>
                      <td className="ps-3 fw-semibold">{r.LocationName}</td>
                      <td>{r.MonthName}</td>
                      <td className="text-center">
                        {r.ActualWeekdayDays} / {r.TargetWeekdayDays}
                      </td>
                      <td className="text-center">
                        {r.ActualWeekendHdDays} / {r.TargetWeekendHdDays}
                      </td>
                      <td className="text-end">₱{money(r.TargetDailySalesWeekday)}</td>
                      <td className="text-end fw-semibold text-primary">
                        ₱{money(r.ActualDailySalesWeekday)}
                      </td>
                      <td className="text-end">₱{money(r.TargetDailySalesWeekendHd)}</td>
                      <td className="text-end fw-semibold text-primary">
                        ₱{money(r.ActualDailySalesWeekendHd)}
                      </td>
                      <td className="text-center text-secondary">
                        {pct(r.TargetWeekdaySalesPct, 1)} / {pct(r.TargetWeekendHdSalesPct, 1)}
                      </td>
                      <td className="text-center pe-3 fw-medium">
                        {pct(r.ActualWeekdaySalesPct, 1)} / {pct(r.ActualWeekendHdSalesPct, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: READ-ONLY TARGET WORKSHEET */}
      {activeTab === 'worksheet' && worksheet && (
        <>
          <div className="salestarget-kpi-grid mb-2">
            <div className="salestarget-kpi-card">
              <div className="salestarget-kpi-label">
                Q{worksheet.targetQuarter} {worksheet.targetYear} Total Target Net Sales
              </div>
              <div className="salestarget-kpi-value text-primary">
                ₱{money(quarterWorksheetTotals.totalTargetSales)}
              </div>
              <div className="salestarget-kpi-subtext">
                Store: <strong>{worksheet.locationName}</strong> ({worksheet.orgLocationRef}) · Status:{' '}
                <strong>{worksheet.status}</strong>
              </div>
            </div>

            <div className="salestarget-kpi-card">
              <div className="salestarget-kpi-label">
                Quarter Average Daily Sales (ADS)
              </div>
              <div className="salestarget-kpi-value">
                ₱{money(quarterWorksheetTotals.quarterAds)}
              </div>
              <div className="salestarget-kpi-subtext">
                Across <strong>{quarterWorksheetTotals.totalDays}</strong> operating days in Q
                {worksheet.targetQuarter}
              </div>
            </div>

            <div className="salestarget-kpi-card">
              <div className="salestarget-kpi-label">
                Same Quarter Last Year ({worksheet.targetYear - 1} Q{worksheet.targetQuarter})
              </div>
              <div className="salestarget-kpi-value">
                ₱{money(quarterWorksheetTotals.totalLastYearSales)}
              </div>
              <div
                className={`salestarget-kpi-subtext fw-semibold ${
                  quarterWorksheetTotals.vsLastYearPct >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {quarterWorksheetTotals.totalLastYearSales > 0
                  ? `${quarterWorksheetTotals.vsLastYearPct >= 0 ? '+' : ''}${quarterWorksheetTotals.vsLastYearPct.toFixed(2)}% vs. Last Year`
                  : 'No Last Year DSR recorded'}
              </div>
            </div>

            <div className="salestarget-kpi-card">
              <div className="salestarget-kpi-label">
                Target Quarter Customer Count (@ ₱{money(worksheet.avgPerCheckDefault)})
              </div>
              <div className="salestarget-kpi-value">
                {qty(quarterWorksheetTotals.totalCustomers, 0)} checks
              </div>
              <div className="salestarget-kpi-subtext">
                Formula: Daily Target Sales ÷ Average Per Check
              </div>
            </div>
          </div>

          <div className="salestarget-panel-card mb-3">
            <div className="salestarget-panel-header d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <h5 className="h6 fw-bold mb-0">
                  Store Target Breakdown Matrix — {worksheet.locationName} (Q{worksheet.targetQuarter}{' '}
                  {worksheet.targetYear})
                </h5>
                <small className="text-secondary" style={{ fontSize: '0.74rem' }}>
                  Read-only store target worksheet published from HQ OracleDB.
                </small>
              </div>
              <span className="badge text-bg-light border text-secondary px-3 py-1">
                Basis: {worksheet.suggestionBasis} · Status: {worksheet.status}
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered table-sm align-middle mb-0 salestarget-matrix-table">
                <thead className="table-light text-center">
                  <tr>
                    <th rowSpan={2} className="text-start ps-3 st-col-particulars">
                      PARTICULARS
                    </th>
                    <th rowSpan={2} className="st-col-uom">
                      PRICE / UOM
                    </th>
                    {worksheet.months.map((m) => (
                      <th key={m.targetMonth} colSpan={2} className="py-2 bg-primary bg-opacity-10">
                        <div className="fw-bold text-uppercase">
                          {m.monthName} {worksheet.targetYear}
                        </div>
                        {m.holidayRemarks && (
                          <div className="text-secondary fw-normal" style={{ fontSize: '0.68rem' }}>
                            Holidays: {m.holidayRemarks}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {worksheet.months.map((m) => (
                      <Fragment key={`subhdr-${m.targetMonth}`}>
                        <th className="bg-light text-secondary fw-semibold st-col-daytype">
                          WEEKDAYS
                        </th>
                        <th className="bg-warning bg-opacity-10 text-dark fw-semibold st-col-daytype">
                          WEEKENDS / HD
                        </th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-primary bg-opacity-10">
                    <td className="fw-bold ps-3">MONTHLY TARGET NET SALES (₱)</td>
                    <td className="text-center text-secondary">PHP</td>
                    {worksheet.months.map((m) => (
                      <td
                        key={`msales-${m.targetMonth}`}
                        colSpan={2}
                        className="text-end fw-bold text-primary pe-3"
                      >
                        ₱{money(m.targetNetSales)}
                      </td>
                    ))}
                  </tr>

                  <tr className="text-secondary" style={{ fontSize: '0.73rem' }}>
                    <td className="ps-3">Historical Reference (LY Sales / Basis ADS)</td>
                    <td className="text-center">Ref</td>
                    {worksheet.months.map((m) => (
                      <Fragment key={`ref-${m.targetMonth}`}>
                        <td className="text-end">LY: ₱{money(m.lastYearNetSales)}</td>
                        <td className="text-end">Basis ADS: ₱{money(m.basisMonthAds)}</td>
                      </Fragment>
                    ))}
                  </tr>

                  <tr>
                    <td className="fw-semibold ps-3">MONTHLY ADS (Target ÷ Total Days)</td>
                    <td className="text-center text-secondary">PHP / Day</td>
                    {worksheet.months.map((m) => (
                      <Fragment key={`ads-${m.targetMonth}`}>
                        <td className="text-end fw-bold text-primary">₱{money(m.monthlyAds)}</td>
                        <td className="text-center text-secondary">
                          {m.totalOperatingDays} total days
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  <tr>
                    <td className="fw-semibold ps-3">NUMBER OF OPERATING DAYS</td>
                    <td className="text-center text-secondary">Days</td>
                    {worksheet.months.map((m) => (
                      <Fragment key={`days-${m.targetMonth}`}>
                        <td className="text-center">{m.weekdayDays}</td>
                        <td className="text-center bg-warning bg-opacity-10 fw-semibold">
                          {m.weekendHdDays}
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  <tr>
                    <td className="fw-semibold ps-3">% SHARE OF MONTHLY SALES</td>
                    <td className="text-center text-secondary">% Split</td>
                    {worksheet.months.map((m) => (
                      <Fragment key={`split-${m.targetMonth}`}>
                        <td className="text-end">{pct(m.weekdaySalesPct, 2)}</td>
                        <td className="text-end bg-warning bg-opacity-10">
                          {pct(m.weekendHdSalesPct, 2)}
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  <tr className="table-light">
                    <td className="fw-bold ps-3">DAILY TARGET SALES (₱)</td>
                    <td className="text-center text-secondary">PHP / Day</td>
                    {worksheet.months.map((m) => (
                      <Fragment key={`ds-${m.targetMonth}`}>
                        <td className="text-end fw-bold">₱{money(m.dailyTargetSalesWeekday)}</td>
                        <td className="text-end fw-bold bg-warning bg-opacity-10">
                          ₱{money(m.dailyTargetSalesWeekendHd)}
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  <tr>
                    <td className="fw-semibold ps-3">AVERAGE PER CHECK</td>
                    <td className="text-center text-secondary">PHP / Check</td>
                    {worksheet.months.map((m) => (
                      <Fragment key={`ac-${m.targetMonth}`}>
                        <td className="text-end">₱{money(m.avgPerCheckWeekday)}</td>
                        <td className="text-end bg-warning bg-opacity-10">
                          ₱{money(m.avgPerCheckWeekendHd)}
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  <tr className="table-light">
                    <td className="fw-bold ps-3">DAILY CUSTOMER COUNT (Checks)</td>
                    <td className="text-center text-secondary">Daily Checks</td>
                    {worksheet.months.map((m) => (
                      <Fragment key={`cc-${m.targetMonth}`}>
                        <td className="text-end fw-semibold">
                          {qty(m.dailyCustomerCountWeekday, 1)}
                        </td>
                        <td className="text-end fw-semibold bg-warning bg-opacity-10">
                          {qty(m.dailyCustomerCountWeekendHd, 1)}
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  <tr className="table-secondary">
                    <td className="fw-bold ps-3 text-uppercase">PER CATEGORY % MIX</td>
                    <td className="text-center fw-bold">UNIT PRICE (₱)</td>
                    {worksheet.months.map((m) => (
                      <Fragment key={`mixhdr-${m.targetMonth}`}>
                        <td className="text-center fw-bold">
                          Sum: {pct(m.totalWeekdayMixPct, 1)}
                        </td>
                        <td className="text-center fw-bold">
                          Sum: {pct(m.totalWeekendHdMixPct, 1)}
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  {worksheet.months[0]?.categories.map((cat0, idx) => (
                    <tr key={`mix-${cat0.categoryCode}`}>
                      <td className="ps-3 fw-medium">
                        {cat0.categoryName}{' '}
                        <span className="badge text-bg-light border text-secondary ms-1">
                          {cat0.qtyUom}
                        </span>
                      </td>
                      <td className="text-end">₱{money(cat0.unitPriceDivisor)}</td>
                      {worksheet.months.map((m) => {
                        const c = m.categories[idx]
                        return (
                          <Fragment key={`mixc-${m.targetMonth}-${cat0.categoryCode}`}>
                            <td className="text-end">{pct(c?.weekdayMixPct ?? 0, 2)}</td>
                            <td className="text-end bg-warning bg-opacity-10">
                              {pct(c?.weekendHdMixPct ?? 0, 2)}
                            </td>
                          </Fragment>
                        )
                      })}
                    </tr>
                  ))}

                  <tr className="table-secondary">
                    <td colSpan={8} className="fw-bold ps-3 text-uppercase">
                      DAILY TARGET SALES PER CATEGORY (₱) — Daily Target Sales × Category %
                    </td>
                  </tr>

                  {worksheet.months[0]?.categories.map((cat0, idx) => (
                    <tr key={`csales-${cat0.categoryCode}`}>
                      <td className="ps-3">{cat0.categoryName}</td>
                      <td className="text-center text-secondary">
                        ₱{money(cat0.unitPriceDivisor)}
                      </td>
                      {worksheet.months.map((m) => {
                        const c = m.categories[idx]
                        return (
                          <Fragment key={`csc-${m.targetMonth}-${cat0.categoryCode}`}>
                            <td className="text-end">₱{money(c?.dailySalesWeekday ?? 0)}</td>
                            <td className="text-end bg-warning bg-opacity-10">
                              ₱{money(c?.dailySalesWeekendHd ?? 0)}
                            </td>
                          </Fragment>
                        )
                      })}
                    </tr>
                  ))}

                  <tr className="table-secondary">
                    <td colSpan={8} className="fw-bold ps-3 text-uppercase">
                      DAILY TARGET QUANTITY PER CATEGORY (PCS / BOXES) — Daily Category Sales ÷ Unit Price
                    </td>
                  </tr>

                  {worksheet.months[0]?.categories.map((cat0, idx) => (
                    <tr key={`cqty-${cat0.categoryCode}`}>
                      <td className="ps-3 fw-medium">
                        {cat0.categoryName} ({cat0.qtyUom})
                      </td>
                      <td className="text-center text-secondary">{cat0.qtyUom} / Day</td>
                      {worksheet.months.map((m) => {
                        const c = m.categories[idx]
                        return (
                          <Fragment key={`cqc-${m.targetMonth}-${cat0.categoryCode}`}>
                            <td className="text-end fw-semibold">
                              {qty(c?.dailyQtyWeekday ?? 0, 1)}
                            </td>
                            <td className="text-end fw-semibold bg-warning bg-opacity-10">
                              {qty(c?.dailyQtyWeekendHd ?? 0, 1)}
                            </td>
                          </Fragment>
                        )
                      })}
                    </tr>
                  ))}

                  <tr className="table-secondary">
                    <td colSpan={8} className="fw-bold ps-3 text-uppercase">
                      MONTHLY TOTAL CATEGORY TARGETS (TOTAL SALES ₱ &amp; TOTAL QTY PCS/BOXES)
                    </td>
                  </tr>

                  {worksheet.months[0]?.categories.map((cat0, idx) => (
                    <tr key={`mcat-${cat0.categoryCode}`}>
                      <td className="ps-3 fw-medium">{cat0.categoryName} (Monthly Total)</td>
                      <td className="text-center text-secondary">Sales / {cat0.qtyUom}</td>
                      {worksheet.months.map((m) => {
                        const c = m.categories[idx]
                        return (
                          <Fragment key={`mcatc-${m.targetMonth}-${cat0.categoryCode}`}>
                            <td className="text-end">₱{money(c?.monthlySales ?? 0)}</td>
                            <td className="text-end fw-bold bg-light">
                              {qty(c?.monthlyQty ?? 0, 0)} {cat0.qtyUom}
                            </td>
                          </Fragment>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
