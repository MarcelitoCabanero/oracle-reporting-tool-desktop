import sql from 'mssql'
import { getHqDbPool } from '../database/hqdb.js'
import { getLocalDbPool } from '../database/localdb.js'

export interface DashboardLoadInput {
  locationName?: string
}

export interface DashboardKpis {
  netSales: number
  totalTransactions: number
  totalGuests: number
}

export interface DashboardAnnouncementItem {
  announcementId: number
  title: string
  message: string
  category: string
  versionTag: string
  isPinned: boolean
  locationName: string
  authorName: string
  authorRole: string
  createdAt: string
}

export interface DashboardLoadResult {
  kpis: DashboardKpis
  announcements: DashboardAnnouncementItem[]
  kpiError?: string
  announcementWarning?: string
}

let announcementSchemaEnsured = false

function toNumber(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function formatDateTime(value: unknown): string {
  if (!value) return ''
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  }
  return String(value).trim()
}

async function ensureAnnouncementSchema(pool: sql.ConnectionPool): Promise<void> {
  if (announcementSchemaEnsured) return

  await pool.request().query(`
    IF OBJECT_ID('dbo.dts_announcements', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.dts_announcements (
        announcement_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        title NVARCHAR(200) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        category VARCHAR(40) NOT NULL
          CONSTRAINT DF_dts_announcements_category DEFAULT ('Announcement'),
        version_tag VARCHAR(30) NULL,
        is_pinned BIT NOT NULL
          CONSTRAINT DF_dts_announcements_is_pinned DEFAULT (0),
        is_active BIT NOT NULL
          CONSTRAINT DF_dts_announcements_is_active DEFAULT (1),
        location_name VARCHAR(50) NULL,
        author_name VARCHAR(100) NOT NULL
          CONSTRAINT DF_dts_announcements_author DEFAULT ('HQ'),
        author_role VARCHAR(50) NULL,
        created_at DATETIME2 NOT NULL
          CONSTRAINT DF_dts_announcements_created_at DEFAULT (SYSDATETIME()),
        updated_at DATETIME2 NULL
      );

      CREATE INDEX IX_dts_announcements_active_created
        ON dbo.dts_announcements (is_active, is_pinned DESC, created_at DESC);
    END
  `)

  announcementSchemaEnsured = true
}

async function queryLocalDashboardKpis(): Promise<DashboardKpis> {
  const pool = await getLocalDbPool()

  const [salesRes, revRes] = await Promise.all([
    pool.request().query(`
      SELECT ISNULL(SUM(NetSales), 0) AS netSales
      FROM dbo.v_salesdetails
      WHERE CAST(BusinessDate AS date) = CAST(GETDATE() AS date)
    `),
    pool.request().query(`
      SELECT
        COUNT(ISNULL(FcrInvNumber, ''))      AS totalTransactions,
        ISNULL(SUM(GuestCount), 0) AS totalGuests
      FROM dbo.v_revenue
      WHERE CAST(busidate AS date) = CAST(GETDATE() AS date)
    `),
  ])

  return {
    netSales: toNumber(salesRes.recordset[0]?.netSales),
    totalTransactions: toNumber(revRes.recordset[0]?.totalTransactions),
    totalGuests: toNumber(revRes.recordset[0]?.totalGuests),
  }
}

async function queryHqAnnouncements(
  locationName?: string,
): Promise<DashboardAnnouncementItem[]> {
  const pool = await getHqDbPool()
  await ensureAnnouncementSchema(pool)

  const trimmedLocation = String(locationName ?? '').trim()
  const result = await pool
    .request()
    .input('locationName', sql.VarChar(50), trimmedLocation || null)
    .query(`
      SELECT TOP 20
        announcement_id,
        title,
        message,
        category,
        version_tag,
        is_pinned,
        location_name,
        author_name,
        author_role,
        created_at
      FROM dbo.dts_announcements
      WHERE is_active = 1
        AND (
          location_name IS NULL
          OR LTRIM(RTRIM(location_name)) = ''
          OR UPPER(LTRIM(RTRIM(location_name))) = 'ALL'
          OR (@locationName IS NOT NULL AND LTRIM(RTRIM(location_name)) = @locationName)
        )
      ORDER BY is_pinned DESC, created_at DESC, announcement_id DESC
    `)

  return result.recordset.map((row) => ({
    announcementId: toNumber(row.announcement_id),
    title: String(row.title ?? '').trim(),
    message: String(row.message ?? '').trim(),
    category: String(row.category ?? 'Announcement').trim() || 'Announcement',
    versionTag: String(row.version_tag ?? '').trim(),
    isPinned: Boolean(row.is_pinned),
    locationName: String(row.location_name ?? '').trim(),
    authorName: String(row.author_name ?? 'HQ').trim() || 'HQ',
    authorRole: String(row.author_role ?? '').trim(),
    createdAt: formatDateTime(row.created_at),
  }))
}

export async function loadDashboardData(
  input?: DashboardLoadInput,
): Promise<DashboardLoadResult> {
  let kpis: DashboardKpis = {
    netSales: 0,
    totalTransactions: 0,
    totalGuests: 0,
  }
  let kpiError: string | undefined

  let announcements: DashboardAnnouncementItem[] = []
  let announcementWarning: string | undefined

  await Promise.all([
    queryLocalDashboardKpis()
      .then((res) => {
        kpis = res
      })
      .catch((error: unknown) => {
        console.error('LocalDB Dashboard KPI query failed:', error)
        kpiError =
          error instanceof Error
            ? error.message
            : 'Unable to load today’s metrics.'
      }),
    queryHqAnnouncements(input?.locationName)
      .then((res) => {
        announcements = res
      })
      .catch((error: unknown) => {
        console.warn('HQDB Dashboard announcements query failed:', error)
        announcementWarning = 'Unable to load announcements right now.'
      }),
  ])

  return {
    kpis,
    announcements,
    kpiError,
    announcementWarning,
  }
}
