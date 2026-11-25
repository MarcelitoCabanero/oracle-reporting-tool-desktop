import sql from 'mssql'
import { getHqDbPool } from '../database/hqdb.js'
import {
  bindDateRangesPredicate,
  enumerateDates,
  normalizeSqlDate,
  splitDateRangeByHqPosted,
  type DateRangeChunk,
} from '../database/hybrid-date-split.js'
import { getLocalDbPool } from '../database/localdb.js'

export interface SalesTargetCategoryMix {
  categoryCode: string
  categoryName: string
  qtyUom: string
  sortOrder: number
  unitPriceDivisor: number
  weekdayMixPct: number
  weekendHdMixPct: number
  dailySalesWeekday: number
  dailySalesWeekendHd: number
  dailyQtyWeekday: number
  dailyQtyWeekendHd: number
  monthlySales: number
  monthlyQty: number
}

export interface SalesTargetWorksheetMonth {
  targetMonth: number
  monthName: string
  targetNetSales: number
  suggestedNetSales: number
  lastYearNetSales: number
  basisMonthAds: number
  totalOperatingDays: number
  weekdayDays: number
  weekendHdDays: number
  holidayRemarks: string
  weekdaySalesPct: number
  weekendHdSalesPct: number
  monthlyAds: number
  dailyTargetSalesWeekday: number
  dailyTargetSalesWeekendHd: number
  avgPerCheckWeekday: number
  avgPerCheckWeekendHd: number
  dailyCustomerCountWeekday: number
  dailyCustomerCountWeekendHd: number
  monthlyCustomerCount: number
  totalWeekdayMixPct: number
  totalWeekendHdMixPct: number
  totalDailyCategorySalesWeekday: number
  totalDailyCategorySalesWeekendHd: number
  totalMonthlyCategorySales: number
  categories: SalesTargetCategoryMix[]
}

export interface SalesTargetWorksheet {
  targetId: number | null
  targetYear: number
  targetQuarter: number
  locationId: number | null
  locationName: string
  orgLocationRef: string
  suggestionBasis: string
  basisMonthDate: string | null
  yoyGrowthTargetPct: number
  avgPerCheckDefault: number
  status: string
  months: SalesTargetWorksheetMonth[]
}

export interface SalesTargetAnalyticsSummaryRow {
  LocationID: number | null
  LocationName: string
  OrgLocationRef: string
  TargetID: number | null
  TargetStatus: string
  TargetYear: number
  TargetQuarter: number
  TargetMonth: number
  MonthName: string
  TotalOperatingDays: number
  TargetWeekdayDays: number
  TargetWeekendHdDays: number
  TargetNetSales: number
  SuggestedNetSales: number
  TargetADS: number
  ActualNetSales: number
  ActualGrossSales: number
  ActualOperatingDays: number
  ActualADS: number
  VarianceNetSales: number
  AchievementPct: number
  RemainingTargetSales: number
  RemainingOperatingDays: number
  RequiredDailyRunRate: number
  LastYearNetSales: number
  LastYearGrossSales: number
  LastYearADS: number
  YoYVarianceNetSales: number
  YoYGrowthPct: number
  TargetAvgCheck: number
  TargetCustomerCount: number
  ActualCustomerCount: number
  ActualAvgCheck: number
}

export interface SalesTargetWeekdayWeekendRow {
  LocationName: string
  OrgLocationRef: string
  TargetMonth: number
  MonthName: string
  TargetWeekdayDays: number
  TargetWeekendHdDays: number
  TargetWeekdaySalesPct: number
  TargetWeekendHdSalesPct: number
  TargetMonthlySalesWeekday: number
  TargetMonthlySalesWeekendHd: number
  TargetDailySalesWeekday: number
  TargetDailySalesWeekendHd: number
  ActualWeekdayDays: number
  ActualWeekendHdDays: number
  ActualMonthlySalesWeekday: number
  ActualMonthlySalesWeekendHd: number
  ActualDailySalesWeekday: number
  ActualDailySalesWeekendHd: number
  ActualWeekdaySalesPct: number
  ActualWeekendHdSalesPct: number
}

export interface SalesTargetCategoryRow {
  LocationName: string
  OrgLocationRef: string
  TargetMonth: number
  MonthName: string
  CategoryCode: string
  CategoryName: string
  CategorySortOrder: number
  QtyUOM: string
  UnitPriceDivisor: number
  TargetWeekdayMixPct: number
  TargetWeekendHdMixPct: number
  TargetCategorySales: number
  ActualCategoryNetSales: number
  ActualCategoryGrossSales: number
  VarianceCategorySales: number
  CategorySalesAchievementPct: number
  TargetCategoryQty: number
  ActualCategoryQty: number
  VarianceCategoryQty: number
  CategoryQtyAchievementPct: number
  DailyTargetSalesWeekday: number
  DailyTargetSalesWeekendHd: number
  DailyTargetQtyWeekday: number
  DailyTargetQtyWeekendHd: number
  ActualCategoryMixPct: number
}

export interface SalesTargetLoadResult {
  locationName: string
  orgLocationRef: string
  targetYear: number
  targetQuarter: number
  worksheet: SalesTargetWorksheet
  summary: SalesTargetAnalyticsSummaryRow[]
  weekdayWeekendBreakdown: SalesTargetWeekdayWeekendRow[]
  categoryBreakdown: SalesTargetCategoryRow[]
  warning?: string
}

interface DefaultCategoryDef {
  categoryCode: string
  categoryName: string
  qtyUom: string
  sortOrder: number
  defaultUnitPrice: number
  defaultMixPct: number
}

interface CategoryMapRule {
  categoryCode: string
  matchType: string
  matchValue: string
  priority: number
}

const DEFAULT_CATEGORIES: DefaultCategoryDef[] = [
  { categoryCode: 'DONUT', categoryName: 'DONUT', qtyUom: 'PCS', sortOrder: 1, defaultUnitPrice: 26, defaultMixPct: 0.6 },
  { categoryCode: 'JCLUB', categoryName: 'J.CLUB', qtyUom: 'PCS', sortOrder: 2, defaultUnitPrice: 45, defaultMixPct: 0.02 },
  { categoryCode: 'JPOPS', categoryName: 'J.POPS', qtyUom: 'BOXES', sortOrder: 3, defaultUnitPrice: 260, defaultMixPct: 0.09 },
  { categoryCode: 'BEVERAGE', categoryName: 'BEVERAGE', qtyUom: 'PCS', sortOrder: 4, defaultUnitPrice: 119, defaultMixPct: 0.21 },
  { categoryCode: 'JCOOL', categoryName: 'J.COOL', qtyUom: 'PCS', sortOrder: 5, defaultUnitPrice: 190, defaultMixPct: 0.02 },
  { categoryCode: 'PASTRY_PASTA', categoryName: 'PASTRY PASTA', qtyUom: 'PCS', sortOrder: 6, defaultUnitPrice: 150, defaultMixPct: 0.06 },
  { categoryCode: 'FOOD', categoryName: 'FOOD', qtyUom: 'PCS', sortOrder: 7, defaultUnitPrice: 340, defaultMixPct: 0 },
  { categoryCode: 'BREWBOX', categoryName: 'BREWBOX', qtyUom: 'BOXES', sortOrder: 8, defaultUnitPrice: 650, defaultMixPct: 0 },
]

const DEFAULT_CATEGORY_RULES: CategoryMapRule[] = [
  { categoryCode: 'JPOPS', matchType: 'ITEMNUMBER', matchValue: '5113004', priority: 10 },
  { categoryCode: 'JPOPS', matchType: 'ITEMNUMBER', matchValue: '5113003', priority: 11 },
  { categoryCode: 'JPOPS', matchType: 'ITEMNUMBER', matchValue: '5113012', priority: 12 },
  { categoryCode: 'JPOPS', matchType: 'ITEMNUMBER', matchValue: '5113013', priority: 13 },
  { categoryCode: 'JPOPS', matchType: 'FAMILYGROUP', matchValue: 'JPops', priority: 14 },
  { categoryCode: 'JCLUB', matchType: 'ITEMNUMBER', matchValue: '5141004', priority: 20 },
  { categoryCode: 'JCLUB', matchType: 'ITEMNUMBER', matchValue: '5141002', priority: 21 },
  { categoryCode: 'JCLUB', matchType: 'ITEMNUMBER', matchValue: '5141003', priority: 22 },
  { categoryCode: 'JCLUB', matchType: 'ITEMNUMBER', matchValue: '5141005', priority: 23 },
  { categoryCode: 'JCLUB', matchType: 'ITEMNUMBER', matchValue: '5141008', priority: 24 },
  { categoryCode: 'JCLUB', matchType: 'ITEMNUMBER', matchValue: '9720047', priority: 25 },
  { categoryCode: 'JCLUB', matchType: 'FAMILYGROUP', matchValue: 'J.Club', priority: 26 },
  { categoryCode: 'JCOOL', matchType: 'ITEMNUMBER', matchValue: '5131001', priority: 30 },
  { categoryCode: 'JCOOL', matchType: 'ITEMNUMBER', matchValue: '5132001', priority: 31 },
  { categoryCode: 'JCOOL', matchType: 'ITEMNUMBER', matchValue: '5133001', priority: 32 },
  { categoryCode: 'JCOOL', matchType: 'ITEMNUMBER', matchValue: '5134001', priority: 33 },
  { categoryCode: 'JCOOL', matchType: 'ITEMNUMBER', matchValue: '5135001', priority: 34 },
  { categoryCode: 'JCOOL', matchType: 'FAMILYGROUP', matchValue: 'JCool Promo', priority: 35 },
  { categoryCode: 'JCOOL', matchType: 'FAMILYGROUP', matchValue: 'Topping JCool', priority: 36 },
  { categoryCode: 'PASTRY_PASTA', matchType: 'MAJORGROUP', matchValue: 'Pastries', priority: 40 },
  { categoryCode: 'PASTRY_PASTA', matchType: 'FAMILYGROUP', matchValue: 'Pasta', priority: 41 },
  { categoryCode: 'PASTRY_PASTA', matchType: 'FAMILYGROUP', matchValue: 'Pandesal', priority: 42 },
  { categoryCode: 'PASTRY_PASTA', matchType: 'FAMILYGROUP', matchValue: 'Turnover', priority: 43 },
  { categoryCode: 'PASTRY_PASTA', matchType: 'FAMILYGROUP', matchValue: 'Cookies', priority: 44 },
  { categoryCode: 'FOOD', matchType: 'MAJORGROUP', matchValue: 'Food', priority: 50 },
  { categoryCode: 'FOOD', matchType: 'FAMILYGROUP', matchValue: 'FOOD Promo', priority: 51 },
  { categoryCode: 'BREWBOX', matchType: 'MAJORGROUP', matchValue: 'Brew Box', priority: 60 },
  { categoryCode: 'BREWBOX', matchType: 'FAMILYGROUP', matchValue: 'Brew Box AddOns', priority: 61 },
  { categoryCode: 'BREWBOX', matchType: 'ITEMNUMBER', matchValue: '5221219', priority: 62 },
  { categoryCode: 'BREWBOX', matchType: 'ITEMNUMBER', matchValue: '5221220', priority: 63 },
  { categoryCode: 'BREWBOX', matchType: 'ITEMNUMBER', matchValue: '5221221', priority: 64 },
  { categoryCode: 'BREWBOX', matchType: 'ITEMNUMBER', matchValue: '5221225', priority: 65 },
  { categoryCode: 'BEVERAGE', matchType: 'MAJORGROUP', matchValue: 'Beverage', priority: 70 },
  { categoryCode: 'BEVERAGE', matchType: 'FAMILYGROUP', matchValue: 'Promo Drink', priority: 71 },
  { categoryCode: 'BEVERAGE', matchType: 'FAMILYGROUP', matchValue: 'Beverage Promo', priority: 72 },
  { categoryCode: 'BEVERAGE', matchType: 'FAMILYGROUP', matchValue: 'Topping Bev.', priority: 73 },
  { categoryCode: 'DONUT', matchType: 'MAJORGROUP', matchValue: 'Donut', priority: 80 },
  { categoryCode: 'DONUT', matchType: 'FAMILYGROUP', matchValue: 'Premium Donut', priority: 81 },
  { categoryCode: 'DONUT', matchType: 'FAMILYGROUP', matchValue: 'Donut Promo', priority: 82 },
  { categoryCode: 'DONUT', matchType: 'FAMILYGROUP', matchValue: 'Promotion', priority: 83 },
  { categoryCode: 'DONUT', matchType: 'FAMILYGROUP', matchValue: 'Package', priority: 84 },
]

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function toNum(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function getQuarterMonthNumbers(quarter: number): [number, number, number] {
  const start = (quarter - 1) * 3 + 1
  return [start, start + 1, start + 2]
}

function getQuarterDateRange(year: number, quarter: number): { startDate: string; endDate: string } {
  const [m1, , m3] = getQuarterMonthNumbers(quarter)
  const startDate = `${year}-${String(m1).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(year, m3, 0)).getUTCDate()
  const endDate = `${year}-${String(m3).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate }
}

function isWeekendOrHolidayDate(dateStr: string, holidayMap: Map<string, string>): boolean {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const dow = d.getUTCDay() // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return true
  return holidayMap.has(dateStr)
}

function formatShortHoliday(dateStr: string, name: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const mon = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${mon} ${d.getUTCDate()} (${name})`
}

/**
 * Always resolves the local POS store from LocalDB dbo.dts_location
 * regardless of whether the logged-in user is 'Store' or 'admin'.
 */
async function resolveLockedLocalStore(): Promise<{
  locationId: number | null
  locationName: string
  orgLocationRef: string
}> {
  const localPool = await getLocalDbPool()
  const res = await localPool.request().query(`
    SELECT TOP 1
      locationid AS locationId,
      LTRIM(RTRIM(locationname)) AS locationName,
      LTRIM(RTRIM(ISNULL(orglocationref, ''))) AS orgLocationRef
    FROM dbo.dts_location
    WHERE IsActive = 1
      AND LOWER(LTRIM(RTRIM(ISNULL(access, '')))) <> 'admin'
      AND LTRIM(RTRIM(ISNULL(locationname, ''))) <> ''
    ORDER BY locationid ASC
  `)
  const row = res.recordset[0]
  return {
    locationId: row?.locationId != null ? Number(row.locationId) : null,
    locationName: String(row?.locationName ?? '').trim(),
    orgLocationRef: String(row?.orgLocationRef ?? '').trim(),
  }
}

function matchCategoryCode(
  itemNumber: string,
  familyGroup: string,
  majorGroup: string,
  rules: CategoryMapRule[],
): string | null {
  const num = itemNumber.trim().toLowerCase()
  const fam = familyGroup.trim().toLowerCase()
  const maj = majorGroup.trim().toLowerCase()
  for (const r of rules) {
    const val = r.matchValue.trim().toLowerCase()
    if (r.matchType === 'ITEMNUMBER' && num === val) return r.categoryCode
    if (r.matchType === 'FAMILYGROUP' && fam === val) return r.categoryCode
    if (r.matchType === 'MAJORGROUP' && maj === val) return r.categoryCode
  }
  return null
}

interface DailyDsrPoint {
  businessDate: string
  netSales: number
  grossSales: number
  guestCount: number
}

interface DailyCategoryPoint {
  businessDate: string
  categoryCode: string
  netSales: number
  grossSales: number
  qty: number
}

async function queryHqDsrForRanges(
  locationName: string,
  ranges: DateRangeChunk[],
): Promise<DailyDsrPoint[]> {
  if (ranges.length === 0) return []
  const pool = await getHqDbPool()
  const req = pool.request()
  req.input('locationName', sql.VarChar(50), locationName)
  const filter = bindDateRangesPredicate(req, 'businessdate', ranges, 'hqDsr')
  const res = await req.query(`
    SELECT
      CAST(businessdate AS date) AS businessDate,
      SUM(ISNULL(netsales, 0)) AS netSales,
      SUM(ISNULL(gross_sales, 0)) AS grossSales,
      SUM(ISNULL(numguest, 0)) AS guestCount
    FROM dbo.agg_daily_dsr
    WHERE locationname = @locationName
      AND ${filter}
    GROUP BY CAST(businessdate AS date)
  `)
  return res.recordset.map((r) => ({
    businessDate: normalizeSqlDate(r.businessDate),
    netSales: toNum(r.netSales),
    grossSales: toNum(r.grossSales),
    guestCount: toNum(r.guestCount),
  }))
}

async function queryLocalDsrForRanges(ranges: DateRangeChunk[]): Promise<DailyDsrPoint[]> {
  if (ranges.length === 0) return []
  const pool = await getLocalDbPool()
  const req = pool.request()
  const filter = bindDateRangesPredicate(req, 'CAST(BusinessDate AS date)', ranges, 'locDsr')
  const res = await req.query(`
    SELECT
      CAST(BusinessDate AS date) AS businessDate,
      SUM(ISNULL(NetSales, 0)) AS netSales,
      SUM(CASE WHEN Transtype = 'Item Sale' THEN ISNULL(NetSales, 0) + ISNULL(TaxCollected, 0) ELSE 0 END) AS grossSales,
      COUNT(DISTINCT CheckNumber) AS guestCount
    FROM dbo.v_salesdetails
    WHERE ${filter}
    GROUP BY CAST(BusinessDate AS date)
  `)
  return res.recordset.map((r) => ({
    businessDate: normalizeSqlDate(r.businessDate),
    netSales: toNum(r.netSales),
    grossSales: toNum(r.grossSales),
    guestCount: toNum(r.guestCount),
  }))
}

async function queryHqCategoriesForRanges(
  locationName: string,
  ranges: DateRangeChunk[],
): Promise<DailyCategoryPoint[]> {
  if (ranges.length === 0) return []
  const pool = await getHqDbPool()
  const req = pool.request()
  req.input('locationName', sql.VarChar(50), locationName)
  const filter = bindDateRangesPredicate(req, 'd.businessdate', ranges, 'hqCat')
  const res = await req.query(`
    SELECT CAST(d.businessdate AS date) AS businessDate, 'DONUT' AS categoryCode,
      ROUND((ISNULL(d.Donut_vat, 0) / 1.12) + (ISNULL(d.Donut_vatex, 0) / 1.12), 2) AS netSales,
      ISNULL(d.Total_donut, 0) AS grossSales,
      CAST(ISNULL(d.total_donut_qty, 0) AS DECIMAL(18, 4)) AS qty
    FROM dbo.agg_daily_donut d WHERE d.locationname = @locationName AND ${filter}
    UNION ALL
    SELECT CAST(d.businessdate AS date), 'JCLUB',
      ROUND((ISNULL(d.jclub_vat, 0) / 1.12) + (ISNULL(d.jclub_vatex, 0) / 1.12), 2),
      ISNULL(d.total_jclub, 0),
      CAST(ISNULL(d.total_jclub_qty, 0) AS DECIMAL(18, 4))
    FROM dbo.agg_daily_jclub d WHERE d.locationname = @locationName AND ${filter}
    UNION ALL
    SELECT CAST(d.businessdate AS date), 'JPOPS',
      ROUND((ISNULL(d.jpops_vat, 0) / 1.12) + (ISNULL(d.jpops_vatex, 0) / 1.12), 2),
      ISNULL(d.total_jpops, 0),
      CAST(ISNULL(d.total_jpops_qty, 0) / 24.0 AS DECIMAL(18, 4))
    FROM dbo.agg_daily_jpops d WHERE d.locationname = @locationName AND ${filter}
    UNION ALL
    SELECT CAST(d.businessdate AS date), 'BEVERAGE',
      ROUND((ISNULL(d.bev_vat, 0) / 1.12) + (ISNULL(d.bev_vatex, 0) / 1.12), 2),
      ISNULL(d.total_bev_amt, 0),
      CAST(ISNULL(d.total_bev_qty, 0) + ISNULL(d.bev_promo_qty, 0) AS DECIMAL(18, 4))
    FROM dbo.agg_daily_beverage d WHERE d.locationname = @locationName AND ${filter}
    UNION ALL
    SELECT CAST(d.businessdate AS date), 'JCOOL',
      ROUND((ISNULL(d.jcool_vat, 0) / 1.12) + (ISNULL(d.jcool_vatex, 0) / 1.12), 2),
      ISNULL(d.total_jcool, 0),
      CAST(ISNULL(d.jcoolS_qty, 0) + ISNULL(d.jcoolC_qty, 0) + ISNULL(d.jcoolSH_qty, 0) + ISNULL(d.jcoolT_qty, 0) + ISNULL(d.jcoolTG_qty, 0) + ISNULL(d.jcoolpromo_qty, 0) AS DECIMAL(18, 4))
    FROM dbo.agg_daily_jcool d WHERE d.locationname = @locationName AND ${filter}
    UNION ALL
    SELECT CAST(d.businessdate AS date), 'PASTRY_PASTA',
      ROUND((ISNULL(d.pastries_vat, 0) / 1.12) + (ISNULL(d.pastries_vatex, 0) / 1.12), 2),
      ISNULL(d.Total_pastries, 0),
      CAST(ISNULL(d.Total_pastries_qty, 0) AS DECIMAL(18, 4))
    FROM dbo.agg_daily_pastries d WHERE d.locationname = @locationName AND ${filter}
    UNION ALL
    SELECT CAST(d.businessdate AS date), 'FOOD',
      ROUND((ISNULL(d.Food_vat, 0) / 1.12) + (ISNULL(d.Food_vatex, 0) / 1.12), 2),
      ISNULL(d.Total_food_amt, 0),
      CAST(ISNULL(d.total_food_qty, 0) AS DECIMAL(18, 4))
    FROM dbo.agg_daily_food d WHERE d.locationname = @locationName AND ${filter}
    UNION ALL
    SELECT CAST(d.businessdate AS date), 'BREWBOX',
      ROUND((ISNULL(d.Brewbox_vat, 0) / 1.12) + (ISNULL(d.Brewbox_vatex, 0) / 1.12), 2),
      ISNULL(d.total_brewbox, 0),
      CAST(ISNULL(d.brewbox_qty, 0) + ISNULL(d.brew1dzn_qty, 0) + ISNULL(d.brewjpops2dzn_qty, 0) + ISNULL(d.brewcombo_qty, 0) AS DECIMAL(18, 4))
    FROM dbo.agg_daily_brewbox d WHERE d.locationname = @locationName AND ${filter}
  `)
  return res.recordset.map((r) => ({
    businessDate: normalizeSqlDate(r.businessDate),
    categoryCode: String(r.categoryCode ?? ''),
    netSales: toNum(r.netSales),
    grossSales: toNum(r.grossSales),
    qty: toNum(r.qty),
  }))
}

async function queryLocalCategoriesForRanges(
  ranges: DateRangeChunk[],
  rules: CategoryMapRule[],
): Promise<DailyCategoryPoint[]> {
  if (ranges.length === 0) return []
  const pool = await getLocalDbPool()
  const req = pool.request()
  const filter = bindDateRangesPredicate(req, 'CAST(businessdate AS date)', ranges, 'locCat')
  const res = await req.query(`
    SELECT
      CAST(businessdate AS date) AS businessDate,
      LTRIM(RTRIM(ISNULL(CAST(itemnumber AS varchar(50)), ''))) AS itemNumber,
      LTRIM(RTRIM(ISNULL(Familygroup, ''))) AS familyGroup,
      LTRIM(RTRIM(ISNULL(Majorgroup, ''))) AS majorGroup,
      SUM(ISNULL(netsales, 0)) AS netSales,
      SUM(ISNULL(grossamt, 0)) AS grossSales,
      SUM(ISNULL(qty, 0)) AS qty
    FROM dbo.v_menuitem_summary
    WHERE ${filter}
      AND (qty <> 0 OR grossamt <> 0 OR netsales <> 0)
    GROUP BY
      CAST(businessdate AS date),
      LTRIM(RTRIM(ISNULL(CAST(itemnumber AS varchar(50)), ''))),
      LTRIM(RTRIM(ISNULL(Familygroup, ''))),
      LTRIM(RTRIM(ISNULL(Majorgroup, '')))
  `)

  const grouped = new Map<string, DailyCategoryPoint>()
  for (const row of res.recordset) {
    const code = matchCategoryCode(
      String(row.itemNumber ?? ''),
      String(row.familyGroup ?? ''),
      String(row.majorGroup ?? ''),
      rules,
    )
    if (!code) continue
    const businessDate = normalizeSqlDate(row.businessDate)
    const rawQty = toNum(row.qty)
    const qty = code === 'JPOPS' ? rawQty / 24.0 : rawQty
    const key = `${businessDate}|${code}`
    const existing = grouped.get(key)
    if (existing) {
      existing.netSales += toNum(row.netSales)
      existing.grossSales += toNum(row.grossSales)
      existing.qty += qty
    } else {
      grouped.set(key, {
        businessDate,
        categoryCode: code,
        netSales: toNum(row.netSales),
        grossSales: toNum(row.grossSales),
        qty,
      })
    }
  }
  return Array.from(grouped.values())
}

export async function loadSalesTargetData(input: {
  targetYear: number
  targetQuarter: number
}): Promise<SalesTargetLoadResult> {
  const targetYear = Number(input.targetYear) || new Date().getFullYear()
  const targetQuarter = [1, 2, 3, 4].includes(Number(input.targetQuarter))
    ? Number(input.targetQuarter)
    : 1

  const store = await resolveLockedLocalStore()
  if (!store.locationName) {
    throw new Error('Active store location could not be resolved from LocalDB dbo.dts_location.')
  }

  const { startDate, endDate } = getQuarterDateRange(targetYear, targetQuarter)
  const lyRange = getQuarterDateRange(targetYear - 1, targetQuarter)
  const quarterMonths = getQuarterMonthNumbers(targetQuarter)

  let categoriesMaster: DefaultCategoryDef[] = [...DEFAULT_CATEGORIES]
  let categoryRules: CategoryMapRule[] = [...DEFAULT_CATEGORY_RULES]
  const holidayMap = new Map<string, string>()
  let savedViewRows: Array<Record<string, unknown>> = []
  let lyPoints: DailyDsrPoint[] = []
  let hqWarning: string | undefined

  // 1. Read HQDB metadata, saved target rows, holidays, and Last Year DSR actuals
  try {
    const hqPool = await getHqDbPool()
    const [catRes, mapRes, holRes, tgtRes, lyDsr] = await Promise.all([
      hqPool.request().query(`
        SELECT CategoryCode, CategoryName, QtyUOM, DefaultUnitPrice, DefaultMixPct, SortOrder
        FROM dbo.tbl_sales_target_category
        WHERE IsActive = 1
        ORDER BY SortOrder ASC, CategoryID ASC
      `),
      hqPool.request().query(`
        SELECT CategoryCode, MatchType, MatchValue, Priority
        FROM dbo.tbl_sales_target_category_map
        WHERE IsActive = 1
        ORDER BY Priority ASC, MapID ASC
      `),
      hqPool
        .request()
        .input('startDate', sql.Date, startDate)
        .input('endDate', sql.Date, endDate)
        .query(`
          SELECT HolidayDate, HolidayName
          FROM dbo.tbl_sales_calendar_holiday
          WHERE IsActive = 1
            AND TreatAsWeekend = 1
            AND HolidayDate BETWEEN @startDate AND @endDate
        `),
      hqPool
        .request()
        .input('targetYear', sql.Int, targetYear)
        .input('targetQuarter', sql.TinyInt, targetQuarter)
        .input('locationName', sql.VarChar(50), store.locationName)
        .query(`
          SELECT *
          FROM dbo.vw_sales_target_detailed
          WHERE TargetYear = @targetYear
            AND TargetQuarter = @targetQuarter
            AND LocationName = @locationName
          ORDER BY TargetMonth ASC, CategorySortOrder ASC
        `),
      queryHqDsrForRanges(store.locationName, [{ from: lyRange.startDate, to: lyRange.endDate }]),
    ])

    if (catRes.recordset.length > 0) {
      categoriesMaster = catRes.recordset.map((c) => ({
        categoryCode: String(c.CategoryCode),
        categoryName: String(c.CategoryName),
        qtyUom: String(c.QtyUOM ?? 'PCS'),
        sortOrder: toNum(c.SortOrder),
        defaultUnitPrice: toNum(c.DefaultUnitPrice),
        defaultMixPct: toNum(c.DefaultMixPct),
      }))
    }
    if (mapRes.recordset.length > 0) {
      categoryRules = mapRes.recordset.map((m) => ({
        categoryCode: String(m.CategoryCode),
        matchType: String(m.MatchType).toUpperCase(),
        matchValue: String(m.MatchValue),
        priority: toNum(m.Priority),
      }))
    }
    for (const h of holRes.recordset) {
      const dt = normalizeSqlDate(h.HolidayDate)
      if (dt) holidayMap.set(dt, String(h.HolidayName ?? 'Holiday'))
    }
    savedViewRows = tgtRes.recordset
    lyPoints = lyDsr
  } catch (error) {
    console.warn('HQDB target/metadata fetch failed; falling back to defaults + LocalDB:', error)
    hqWarning =
      'HQ database could not be reached for saved targets or historical DSR. Showing available Local POS actuals only.'
  }

  // 2. Hybrid split for Current Year quarter actuals
  const split = await splitDateRangeByHqPosted(startDate, endDate, {
    locationName: store.locationName,
    sourceTable: 'agg_daily_dsr',
  })
  if (split.warning && !hqWarning) {
    hqWarning = split.warning
  }

  let hqCyDsr: DailyDsrPoint[] = []
  let hqCyCats: DailyCategoryPoint[] = []
  let localRanges = split.localRanges

  if (split.hqRanges.length > 0) {
    try {
      ;[hqCyDsr, hqCyCats] = await Promise.all([
        queryHqDsrForRanges(store.locationName, split.hqRanges),
        queryHqCategoriesForRanges(store.locationName, split.hqRanges),
      ])
    } catch (error) {
      console.warn('HQDB CY actuals query failed; falling back to LocalDB:', error)
      localRanges = [{ from: startDate, to: endDate }]
      hqWarning =
        'HQ database could not be reached. Showing available Local POS data only (purged historical dates may be incomplete).'
    }
  }

  const [localCyDsr, localCyCats] = await Promise.all([
    queryLocalDsrForRanges(localRanges),
    queryLocalCategoriesForRanges(localRanges, categoryRules),
  ])

  const allCyDsr = [...hqCyDsr, ...localCyDsr]
  const allCyCats = [...hqCyCats, ...localCyCats]

  // 3. Calendar default day counts per month in quarter
  const calendarByMonth = new Map<
    number,
    { totalDays: number; weekdayDays: number; weekendHdDays: number; holidayRemarks: string }
  >()
  for (const m of quarterMonths) {
    const mStart = `${targetYear}-${String(m).padStart(2, '0')}-01`
    const mLast = new Date(Date.UTC(targetYear, m, 0)).getUTCDate()
    const mEnd = `${targetYear}-${String(m).padStart(2, '0')}-${String(mLast).padStart(2, '0')}`
    const dates = enumerateDates(mStart, mEnd)
    let wd = 0
    let we = 0
    const remarks: string[] = []
    for (const dt of dates) {
      if (isWeekendOrHolidayDate(dt, holidayMap)) {
        we += 1
      } else {
        wd += 1
      }
      const hName = holidayMap.get(dt)
      if (hName) remarks.push(formatShortHoliday(dt, hName))
    }
    calendarByMonth.set(m, {
      totalDays: dates.length,
      weekdayDays: wd,
      weekendHdDays: we,
      holidayRemarks: remarks.join(', '),
    })
  }

  // 4. Build Worksheet structure from savedViewRows (or unset defaults)
  const firstRow = savedViewRows[0]
  const worksheetMonths: SalesTargetWorksheetMonth[] = quarterMonths.map((monthNum) => {
    const cal = calendarByMonth.get(monthNum)!
    const mRows = savedViewRows.filter((r) => Number(r.TargetMonth) === monthNum)
    const m0 = mRows[0]

    const targetNetSales = m0 ? toNum(m0.TargetNetSales) : 0
    const suggestedNetSales = m0 ? toNum(m0.SuggestedNetSales) : 0
    const lastYearNetSales = m0 ? toNum(m0.LastYearNetSales) : 0
    const basisMonthAds = m0 ? toNum(m0.BasisMonthADS) : 0
    const totalOperatingDays = m0 ? toNum(m0.TotalOperatingDays) : cal.totalDays
    const weekdayDays = m0 ? toNum(m0.WeekdayDays) : cal.weekdayDays
    const weekendHdDays = m0 ? toNum(m0.WeekendHdDays) : cal.weekendHdDays
    const weekdaySalesPct = m0 ? toNum(m0.WeekdaySalesPct) : 0.5
    const weekendHdSalesPct = m0 ? toNum(m0.WeekendHdSalesPct) : 0.5
    const avgPerCheckWeekday = m0 ? toNum(m0.AvgPerCheckWeekday) : 470
    const avgPerCheckWeekendHd = m0 ? toNum(m0.AvgPerCheckWeekendHd) : 470

    const monthlyAds = totalOperatingDays > 0 ? targetNetSales / totalOperatingDays : 0
    const dailyTargetSalesWeekday =
      weekdayDays > 0 ? (targetNetSales * weekdaySalesPct) / weekdayDays : 0
    const dailyTargetSalesWeekendHd =
      weekendHdDays > 0 ? (targetNetSales * weekendHdSalesPct) / weekendHdDays : 0
    const dailyCustomerCountWeekday =
      avgPerCheckWeekday > 0 ? dailyTargetSalesWeekday / avgPerCheckWeekday : 0
    const dailyCustomerCountWeekendHd =
      avgPerCheckWeekendHd > 0 ? dailyTargetSalesWeekendHd / avgPerCheckWeekendHd : 0
    const monthlyCustomerCount =
      dailyCustomerCountWeekday * weekdayDays + dailyCustomerCountWeekendHd * weekendHdDays

    let totalWeekdayMixPct = 0
    let totalWeekendHdMixPct = 0
    let totalDailyCategorySalesWeekday = 0
    let totalDailyCategorySalesWeekendHd = 0
    let totalMonthlyCategorySales = 0

    const categories: SalesTargetCategoryMix[] = categoriesMaster.map((catDef) => {
      const savedCat = mRows.find((r) => String(r.CategoryCode) === catDef.categoryCode)
      const unitPriceDivisor = savedCat ? toNum(savedCat.UnitPriceDivisor) : catDef.defaultUnitPrice
      const weekdayMixPct = savedCat ? toNum(savedCat.WeekdayMixPct) : catDef.defaultMixPct
      const weekendHdMixPct = savedCat ? toNum(savedCat.WeekendHdMixPct) : catDef.defaultMixPct
      const qtyUom = savedCat ? String(savedCat.QtyUOM ?? catDef.qtyUom) : catDef.qtyUom

      totalWeekdayMixPct += weekdayMixPct
      totalWeekendHdMixPct += weekendHdMixPct

      const dailySalesWeekday = dailyTargetSalesWeekday * weekdayMixPct
      const dailySalesWeekendHd = dailyTargetSalesWeekendHd * weekendHdMixPct
      const dailyQtyWeekday = unitPriceDivisor > 0 ? dailySalesWeekday / unitPriceDivisor : 0
      const dailyQtyWeekendHd = unitPriceDivisor > 0 ? dailySalesWeekendHd / unitPriceDivisor : 0
      const monthlySales =
        dailySalesWeekday * weekdayDays + dailySalesWeekendHd * weekendHdDays
      const monthlyQty = unitPriceDivisor > 0 ? monthlySales / unitPriceDivisor : 0

      totalDailyCategorySalesWeekday += dailySalesWeekday
      totalDailyCategorySalesWeekendHd += dailySalesWeekendHd
      totalMonthlyCategorySales += monthlySales

      return {
        categoryCode: catDef.categoryCode,
        categoryName: catDef.categoryName,
        qtyUom,
        sortOrder: catDef.sortOrder,
        unitPriceDivisor,
        weekdayMixPct,
        weekendHdMixPct,
        dailySalesWeekday,
        dailySalesWeekendHd,
        dailyQtyWeekday,
        dailyQtyWeekendHd,
        monthlySales,
        monthlyQty,
      }
    })

    return {
      targetMonth: monthNum,
      monthName: MONTH_NAMES[monthNum] ?? `Month ${monthNum}`,
      targetNetSales,
      suggestedNetSales,
      lastYearNetSales,
      basisMonthAds,
      totalOperatingDays,
      weekdayDays,
      weekendHdDays,
      holidayRemarks: cal.holidayRemarks,
      weekdaySalesPct,
      weekendHdSalesPct,
      monthlyAds,
      dailyTargetSalesWeekday,
      dailyTargetSalesWeekendHd,
      avgPerCheckWeekday,
      avgPerCheckWeekendHd,
      dailyCustomerCountWeekday,
      dailyCustomerCountWeekendHd,
      monthlyCustomerCount,
      totalWeekdayMixPct,
      totalWeekendHdMixPct,
      totalDailyCategorySalesWeekday,
      totalDailyCategorySalesWeekendHd,
      totalMonthlyCategorySales,
      categories,
    }
  })

  const orgLocationRef = firstRow?.OrgLocationRef
    ? String(firstRow.OrgLocationRef)
    : store.orgLocationRef || store.locationName

  const worksheet: SalesTargetWorksheet = {
    targetId: firstRow?.TargetID != null ? Number(firstRow.TargetID) : null,
    targetYear,
    targetQuarter,
    locationId: store.locationId,
    locationName: store.locationName,
    orgLocationRef,
    suggestionBasis: firstRow?.SuggestionBasis ? String(firstRow.SuggestionBasis) : 'YOY_TREND',
    basisMonthDate: firstRow?.BasisMonthDate ? normalizeSqlDate(firstRow.BasisMonthDate) : null,
    yoyGrowthTargetPct: firstRow ? toNum(firstRow.YoYGrowthTargetPct) : 0.05,
    avgPerCheckDefault: firstRow ? toNum(firstRow.AvgPerCheckDefault) : 470,
    status: firstRow?.Status ? String(firstRow.Status) : 'UNSET',
    months: worksheetMonths,
  }

  // 5. Build Analytics Result Sets (Summary, Weekday/Weekend, Category Breakdown)
  const summary: SalesTargetAnalyticsSummaryRow[] = []
  const weekdayWeekendBreakdown: SalesTargetWeekdayWeekendRow[] = []
  const categoryBreakdown: SalesTargetCategoryRow[] = []

  for (const wm of worksheetMonths) {
    const monthNum = wm.targetMonth
    const monthCyDsr = allCyDsr.filter(
      (p) => Number(p.businessDate.slice(5, 7)) === monthNum,
    )
    const monthLyDsr = lyPoints.filter(
      (p) => Number(p.businessDate.slice(5, 7)) === monthNum,
    )

    let actualNetSales = 0
    let actualGrossSales = 0
    let actualGuestCount = 0
    const allDatesSet = new Set<string>()
    const wdDatesSet = new Set<string>()
    const weDatesSet = new Set<string>()
    let actualWeekdayNetSales = 0
    let actualWeekendHdNetSales = 0

    for (const pt of monthCyDsr) {
      actualNetSales += pt.netSales
      actualGrossSales += pt.grossSales
      actualGuestCount += pt.guestCount
      allDatesSet.add(pt.businessDate)
      if (isWeekendOrHolidayDate(pt.businessDate, holidayMap)) {
        weDatesSet.add(pt.businessDate)
        actualWeekendHdNetSales += pt.netSales
      } else {
        wdDatesSet.add(pt.businessDate)
        actualWeekdayNetSales += pt.netSales
      }
    }

    const actualOperatingDays = allDatesSet.size
    const actualWeekdayDays = wdDatesSet.size
    const actualWeekendHdDays = weDatesSet.size

    let lyNetSales = 0
    let lyGrossSales = 0
    const lyDatesSet = new Set<string>()
    for (const pt of monthLyDsr) {
      lyNetSales += pt.netSales
      lyGrossSales += pt.grossSales
      lyDatesSet.add(pt.businessDate)
    }
    const effectiveLyNet = lyNetSales > 0 ? lyNetSales : wm.lastYearNetSales
    const lyOperatingDays = lyDatesSet.size

    // Update worksheet month's lastYearNetSales reference if HQDB DSR had LY sales
    if (wm.lastYearNetSales === 0 && effectiveLyNet > 0) {
      wm.lastYearNetSales = effectiveLyNet
    }

    const actualAds = actualOperatingDays > 0 ? actualNetSales / actualOperatingDays : 0
    const varianceNetSales = actualNetSales - wm.targetNetSales
    const achievementPct =
      wm.targetNetSales > 0 ? (actualNetSales / wm.targetNetSales) * 100 : 0
    const remainingTargetSales =
      wm.targetNetSales > actualNetSales ? wm.targetNetSales - actualNetSales : 0
    const remainingOperatingDays =
      wm.totalOperatingDays > actualOperatingDays
        ? wm.totalOperatingDays - actualOperatingDays
        : 0
    const requiredDailyRunRate =
      remainingOperatingDays > 0 && remainingTargetSales > 0
        ? remainingTargetSales / remainingOperatingDays
        : 0
    const yoyVarianceNetSales = actualNetSales - effectiveLyNet
    const yoyGrowthPct =
      effectiveLyNet > 0 ? ((actualNetSales - effectiveLyNet) / effectiveLyNet) * 100 : 0
    const targetAvgCheck = wm.avgPerCheckWeekday > 0 ? wm.avgPerCheckWeekday : 470
    const targetCustomerCount = targetAvgCheck > 0 ? wm.targetNetSales / targetAvgCheck : 0
    const actualAvgCheck = actualGuestCount > 0 ? actualNetSales / actualGuestCount : 0

    summary.push({
      LocationID: store.locationId,
      LocationName: store.locationName,
      OrgLocationRef: orgLocationRef,
      TargetID: worksheet.targetId,
      TargetStatus: worksheet.status,
      TargetYear: targetYear,
      TargetQuarter: targetQuarter,
      TargetMonth: monthNum,
      MonthName: wm.monthName,
      TotalOperatingDays: wm.totalOperatingDays,
      TargetWeekdayDays: wm.weekdayDays,
      TargetWeekendHdDays: wm.weekendHdDays,
      TargetNetSales: wm.targetNetSales,
      SuggestedNetSales: wm.suggestedNetSales,
      TargetADS: wm.monthlyAds,
      ActualNetSales: actualNetSales,
      ActualGrossSales: actualGrossSales,
      ActualOperatingDays: actualOperatingDays,
      ActualADS: actualAds,
      VarianceNetSales: varianceNetSales,
      AchievementPct: achievementPct,
      RemainingTargetSales: remainingTargetSales,
      RemainingOperatingDays: remainingOperatingDays,
      RequiredDailyRunRate: requiredDailyRunRate,
      LastYearNetSales: effectiveLyNet,
      LastYearGrossSales: lyGrossSales,
      LastYearADS: lyOperatingDays > 0 ? effectiveLyNet / lyOperatingDays : 0,
      YoYVarianceNetSales: yoyVarianceNetSales,
      YoYGrowthPct: yoyGrowthPct,
      TargetAvgCheck: targetAvgCheck,
      TargetCustomerCount: targetCustomerCount,
      ActualCustomerCount: actualGuestCount,
      ActualAvgCheck: actualAvgCheck,
    })

    weekdayWeekendBreakdown.push({
      LocationName: store.locationName,
      OrgLocationRef: orgLocationRef,
      TargetMonth: monthNum,
      MonthName: wm.monthName,
      TargetWeekdayDays: wm.weekdayDays,
      TargetWeekendHdDays: wm.weekendHdDays,
      TargetWeekdaySalesPct: wm.weekdaySalesPct,
      TargetWeekendHdSalesPct: wm.weekendHdSalesPct,
      TargetMonthlySalesWeekday: wm.targetNetSales * wm.weekdaySalesPct,
      TargetMonthlySalesWeekendHd: wm.targetNetSales * wm.weekendHdSalesPct,
      TargetDailySalesWeekday: wm.dailyTargetSalesWeekday,
      TargetDailySalesWeekendHd: wm.dailyTargetSalesWeekendHd,
      ActualWeekdayDays: actualWeekdayDays,
      ActualWeekendHdDays: actualWeekendHdDays,
      ActualMonthlySalesWeekday: actualWeekdayNetSales,
      ActualMonthlySalesWeekendHd: actualWeekendHdNetSales,
      ActualDailySalesWeekday:
        actualWeekdayDays > 0 ? actualWeekdayNetSales / actualWeekdayDays : 0,
      ActualDailySalesWeekendHd:
        actualWeekendHdDays > 0 ? actualWeekendHdNetSales / actualWeekendHdDays : 0,
      ActualWeekdaySalesPct: actualNetSales > 0 ? actualWeekdayNetSales / actualNetSales : 0,
      ActualWeekendHdSalesPct:
        actualNetSales > 0 ? actualWeekendHdNetSales / actualNetSales : 0,
    })

    const monthCatPoints = allCyCats.filter(
      (c) => Number(c.businessDate.slice(5, 7)) === monthNum,
    )
    for (const cat of wm.categories) {
      let actCatNet = 0
      let actCatGross = 0
      let actCatQty = 0
      for (const pt of monthCatPoints) {
        if (pt.categoryCode === cat.categoryCode) {
          actCatNet += pt.netSales
          actCatGross += pt.grossSales
          actCatQty += pt.qty
        }
      }
      const varSales = actCatNet - cat.monthlySales
      const achvSalesPct = cat.monthlySales > 0 ? (actCatNet / cat.monthlySales) * 100 : 0
      const varQty = actCatQty - cat.monthlyQty
      const achvQtyPct = cat.monthlyQty > 0 ? (actCatQty / cat.monthlyQty) * 100 : 0

      categoryBreakdown.push({
        LocationName: store.locationName,
        OrgLocationRef: orgLocationRef,
        TargetMonth: monthNum,
        MonthName: wm.monthName,
        CategoryCode: cat.categoryCode,
        CategoryName: cat.categoryName,
        CategorySortOrder: cat.sortOrder,
        QtyUOM: cat.qtyUom,
        UnitPriceDivisor: cat.unitPriceDivisor,
        TargetWeekdayMixPct: cat.weekdayMixPct,
        TargetWeekendHdMixPct: cat.weekendHdMixPct,
        TargetCategorySales: cat.monthlySales,
        ActualCategoryNetSales: actCatNet,
        ActualCategoryGrossSales: actCatGross,
        VarianceCategorySales: varSales,
        CategorySalesAchievementPct: achvSalesPct,
        TargetCategoryQty: cat.monthlyQty,
        ActualCategoryQty: actCatQty,
        VarianceCategoryQty: varQty,
        CategoryQtyAchievementPct: achvQtyPct,
        DailyTargetSalesWeekday: cat.dailySalesWeekday,
        DailyTargetSalesWeekendHd: cat.dailySalesWeekendHd,
        DailyTargetQtyWeekday: cat.dailyQtyWeekday,
        DailyTargetQtyWeekendHd: cat.dailyQtyWeekendHd,
        ActualCategoryMixPct: actualNetSales > 0 ? actCatNet / actualNetSales : 0,
      })
    }
  }

  return {
    locationName: store.locationName,
    orgLocationRef,
    targetYear,
    targetQuarter,
    worksheet,
    summary,
    weekdayWeekendBreakdown,
    categoryBreakdown,
    warning: hqWarning,
  }
}
