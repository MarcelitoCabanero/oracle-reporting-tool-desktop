import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import dotenv from 'dotenv'

interface WebAuthUser {
  username: string
  displayName: string
  role: string
  locationName: string
  locationId: string
}

interface LoginResult {
  success: boolean
  user?: WebAuthUser
  message?: string
}

const sessionCookie = 'oracle_web_session'
const sessionMaxAgeSeconds = 8 * 60 * 60

function readCookie(request: import('node:http').IncomingMessage, name: string) {
  const cookies = request.headers.cookie?.split(';') ?? []
  const entry = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : ''
}

function sameOrigin(request: import('node:http').IncomingMessage) {
  const origin = request.headers.origin
  if (!origin) return false
  try {
    return new URL(origin).host === request.headers.host
  } catch {
    return false
  }
}

function sendJson(response: import('node:http').ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(body))
}

async function readJson(request: import('node:http').IncomingMessage, maxLength = 8192): Promise<Record<string, unknown>> {
  let body = ''
  for await (const chunk of request) {
    body += chunk.toString()
    if (body.length > maxLength) throw new Error('Request body is too large.')
  }
  const value: unknown = JSON.parse(body)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request body.')
  return value as Record<string, unknown>
}

async function withDepositUpload<T>(fileNameValue: unknown, base64Value: unknown, callback: (filePath: string) => Promise<T>): Promise<T> {
  if (typeof fileNameValue !== 'string' || typeof base64Value !== 'string') throw new Error('Choose a deposit image attachment.')
  const fileName = basename(fileNameValue)
  const extension = extname(fileName).toLowerCase()
  if (!fileName || !['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff'].includes(extension)) {
    throw new Error('Only JPG, JPEG, PNG, GIF, BMP, and TIFF files are allowed.')
  }
  const fileBuffer = Buffer.from(base64Value, 'base64')
  if (fileBuffer.length === 0 || fileBuffer.length > 10 * 1024 * 1024) throw new Error('Attachment must be smaller than 10 MB.')
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'oracle-deposit-'))
  const filePath = join(temporaryDirectory, fileName)
  try {
    await writeFile(filePath, fileBuffer, { flag: 'wx' })
    return await callback(filePath)
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

function imageMime(fileName: string) {
  const extension = extname(fileName).toLowerCase()
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.png') return 'image/png'
  if (extension === '.gif') return 'image/gif'
  if (extension === '.bmp') return 'image/bmp'
  if (extension === '.tif' || extension === '.tiff') return 'image/tiff'
  return 'application/octet-stream'
}

function databaseAuthApi() {
  const sessions = new Map<string, { user: WebAuthUser; expiresAt: number }>()
  const failures = new Map<string, { count: number; resetAt: number }>()

  return {
    name: 'database-auth-api',
    configureServer: async (server: import('vite').ViteDevServer) => {
      // Load the same server-side SQL authentication and health checks used by the desktop app.
      dotenv.config({ path: resolve(process.cwd(), '../.env'), override: false })
      const authPath = resolve(process.cwd(), '../electron/auth/auth.service.ts')
      const systemPath = resolve(process.cwd(), '../electron/system/system.service.ts')
      const hourlyPath = resolve(process.cwd(), '../electron/hourly-sales/hourly-sales.service.ts')
      const systemSalesPath = resolve(process.cwd(), '../electron/system-sales/system-sales.service.ts')
      const employeeSalesPath = resolve(process.cwd(), '../electron/employee-sales/employee-sales.service.ts')
      const scPwdPath = resolve(process.cwd(), '../electron/sc-pwd/sc-pwd.repository.ts')
      const tenderListingPath = resolve(process.cwd(), '../electron/tender-listing/tender-listing.service.ts')
      const variancePath = resolve(process.cwd(), '../electron/variance-checking/variance-checking.service.ts')
      const menuItemPath = resolve(process.cwd(), '../electron/menuitem/menuitem.service.ts')
      const posJournalPath = resolve(process.cwd(), '../electron/posjournal/pos-journal.service.ts')
      const rofPath = resolve(process.cwd(), '../electron/rof/rof.service.ts')
      const depositPath = resolve(process.cwd(), '../electron/deposit/deposit.service.ts')
      const ftpPath = resolve(process.cwd(), '../electron/ftp/ftp.service.ts')
      const maintenanceRepositoryPath = resolve(process.cwd(), '../electron/maintenance/maintenance.repository.ts')
      const [
        { loginUser }, { checkSystemHealth }, hourlySales, systemSales,
        employeeSales, scPwd, tenderListing, variance, menuItem, posJournal, rof, deposit, ftp, maintenanceRepository,
      ] = await Promise.all([
        server.ssrLoadModule(authPath) as Promise<{ loginUser: (username: string, password: string) => Promise<LoginResult> }>,
        server.ssrLoadModule(systemPath) as Promise<{ checkSystemHealth: () => Promise<{ ready: boolean; message: string; localDbConnected: boolean; hqDbConnected: boolean }> }>,
        server.ssrLoadModule(hourlyPath) as Promise<{
          getHourlyDailyReport: (input: { businessDate: string; locationName: string }) => Promise<unknown>
          createHourlyEntries: (input: Record<string, unknown>) => Promise<unknown>
          getHourlyRecords: (input: { startDate: string; endDate: string; locationName: string }) => Promise<unknown>
          editHourlyRecord: (input: Record<string, unknown>) => Promise<unknown>
        }>,
        server.ssrLoadModule(systemSalesPath) as Promise<{ getWorkstations: () => Promise<string[]>; generateSystemSalesReport: (input: Record<string, unknown>) => Promise<unknown> }>,
        server.ssrLoadModule(employeeSalesPath) as Promise<{ loadEmployees: () => Promise<unknown>; generateEmployeeSales: (input: Record<string, unknown>) => Promise<unknown>; generateAllEmployeeSales: (input: Record<string, unknown>) => Promise<unknown> }>,
        server.ssrLoadModule(scPwdPath) as Promise<{ loadScPwd: (input: Record<string, unknown>) => Promise<unknown> }>,
        server.ssrLoadModule(tenderListingPath) as Promise<{ generateTenderListing: (input: Record<string, unknown>) => Promise<unknown> }>,
        server.ssrLoadModule(variancePath) as Promise<{ generateVarianceChecking: (input: Record<string, unknown>) => Promise<unknown>; loadVarianceReceipt: (input: Record<string, unknown>) => Promise<unknown> }>,
        server.ssrLoadModule(menuItemPath) as Promise<{
          loadMenuItemsBySalesType: (input: { dateFrom: string; dateTo: string }) => Promise<unknown>
          loadMenuItemSummary: (input: { dateFrom: string; dateTo: string }) => Promise<unknown>
        }>,
        server.ssrLoadModule(posJournalPath) as Promise<{
          loadPosJournals: (businessDate: string) => Promise<unknown>
          loadPosJournalByCheckNumber: (checkNumber: string) => Promise<unknown>
        }>,
        server.ssrLoadModule(rofPath) as Promise<{
          loadRofSource: (businessDate: string) => Promise<unknown>
          loadRofDetails: (businessDate: string) => Promise<unknown>
          loadRofSummary: (dateFrom: string, dateTo: string, locationName: string) => Promise<unknown>
          createRof: (input: Record<string, unknown>) => Promise<unknown>
          deleteRof: (businessDate: string) => Promise<unknown>
          getDepositSource: (businessDate: string) => Promise<unknown>
        }>,
        server.ssrLoadModule(depositPath) as Promise<{
          checkDepositStatus: (businessDate: string, locationName: string) => Promise<unknown>
          createDeposit: (input: Record<string, unknown>) => Promise<unknown>
          loadDeposits: (input: Record<string, unknown>) => Promise<unknown>
          loadDepositById: (depositId: number, locationName: string) => Promise<unknown>
          editDeposit: (input: Record<string, unknown>) => Promise<unknown>
          removeDeposit: (depositId: number, locationName: string) => Promise<unknown>
        }>,
        server.ssrLoadModule(ftpPath) as Promise<{
          downloadDepositImageBuffer: (fileName: string) => Promise<Buffer>
          replaceDepositImage: (filePath: string, existingFileName: string) => Promise<void>
        }>,
        server.ssrLoadModule(maintenanceRepositoryPath) as Promise<{
          getMissingMenuItems: () => Promise<Array<{ itemnumber: string; itemname: string; transtype: string; majorgroup: string; familygroup: string }>>
          insertMissingMenuItems: (rows: Array<{ itemnumber: string; itemname: string; transtype: string; majorgroup: string; familygroup: string }>) => Promise<void>
        }>,
      ])

      function getSession(request: import('node:http').IncomingMessage) {
        const token = readCookie(request, sessionCookie)
        const session = sessions.get(token)
        if (!session || session.expiresAt <= Date.now()) {
          sessions.delete(token)
          return null
        }
        return session
      }

      server.middlewares.use('/api/system/health', async (request, response, next) => {
        if (request.method !== 'GET') return next()
        try {
          sendJson(response, 200, await checkSystemHealth())
        } catch {
          sendJson(response, 503, { ready: false, message: 'System startup check failed.', localDbConnected: false, hqDbConnected: false })
        }
      })

      server.middlewares.use('/api/auth/session', (request, response, next) => {
        if (request.method !== 'GET') return next()
        const session = getSession(request)
        if (!session) return sendJson(response, 401, {})
        return sendJson(response, 200, { user: session.user })
      })

      server.middlewares.use('/api/auth/login', async (request, response, next) => {
        if (request.method !== 'POST') return next()
        if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Sign-in request origin could not be verified.' })

        const client = request.socket.remoteAddress ?? 'unknown'
        const now = Date.now()
        const current = failures.get(client)
        if (current && current.resetAt > now && current.count >= 10) {
          return sendJson(response, 429, { message: 'Too many sign-in attempts. Please try again later.' })
        }

        try {
          const body = await readJson(request)
          if (typeof body.username !== 'string' || typeof body.password !== 'string') {
            return sendJson(response, 400, { message: 'Enter your username and password.' })
          }
          const result = await loginUser(body.username, body.password)
          if (!result.success || !result.user) {
            const attempts = current && current.resetAt > now ? current.count + 1 : 1
            failures.set(client, { count: attempts, resetAt: now + 15 * 60 * 1000 })
            return sendJson(response, 401, { message: result.message || 'Invalid username or password.' })
          }

          failures.delete(client)
          const token = randomUUID()
          sessions.set(token, { user: result.user, expiresAt: now + sessionMaxAgeSeconds * 1000 })
          response.setHeader('Set-Cookie', `${sessionCookie}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionMaxAgeSeconds}`)
          return sendJson(response, 200, { user: result.user })
        } catch (error) {
          if (error instanceof SyntaxError || (error instanceof Error && error.message === 'Request body is too large.')) {
            return sendJson(response, 400, { message: 'Invalid sign-in request.' })
          }
          return sendJson(response, 503, { message: 'Unable to connect to the authentication server.' })
        }
      })

      server.middlewares.use('/api/auth/logout', (request, response, next) => {
        if (request.method !== 'POST') return next()
        if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Sign-out request origin could not be verified.' })
        sessions.delete(readCookie(request, sessionCookie))
        response.setHeader('Set-Cookie', `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`)
        return sendJson(response, 200, {})
      })

      server.middlewares.use('/api/hourly-sales', async (request, response, next) => {
        const session = getSession(request)
        if (!session) return sendJson(response, 401, { message: 'Sign in to access hourly sales.' })

        const url = new URL(request.url ?? '/', 'http://localhost')
        const locationName = session.user.locationName
        try {
          if (request.method === 'GET' && url.pathname === '/daily-report') {
            return sendJson(response, 200, await hourlySales.getHourlyDailyReport({
              businessDate: url.searchParams.get('businessDate') ?? '',
              locationName,
            }))
          }
          if (request.method === 'GET' && url.pathname === '/records') {
            return sendJson(response, 200, await hourlySales.getHourlyRecords({
              startDate: url.searchParams.get('startDate') ?? '',
              endDate: url.searchParams.get('endDate') ?? '',
              locationName,
            }))
          }
          if (request.method === 'POST' && url.pathname === '/entries') {
            if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
            const body = await readJson(request)
            if (!Array.isArray(body.rows)) return sendJson(response, 400, { message: 'Add at least one entry before saving.' })
            return sendJson(response, 200, await hourlySales.createHourlyEntries({ ...body, locationName }))
          }
          if (request.method === 'PUT' && url.pathname === '/records') {
            if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
            const body = await readJson(request)
            return sendJson(response, 200, await hourlySales.editHourlyRecord({ ...body, locationName }))
          }
          return next()
        } catch (error) {
          if (error instanceof SyntaxError || (error instanceof Error && error.message === 'Request body is too large.')) {
            return sendJson(response, 400, { message: 'Invalid hourly sales request.' })
          }
          return sendJson(response, 400, { message: error instanceof Error ? error.message : 'The hourly sales request could not be completed.' })
        }
      })

      server.middlewares.use('/api/system-sales', async (request, response, next) => {
        if (!getSession(request)) return sendJson(response, 401, { message: 'Sign in to access System Sales.' })
        const url = new URL(request.url ?? '/', 'http://localhost')
        try {
          if (request.method === 'GET' && url.pathname === '/workstations') {
            return sendJson(response, 200, await systemSales.getWorkstations())
          }
          if (request.method === 'POST' && url.pathname === '/generate') {
            if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
            return sendJson(response, 200, await systemSales.generateSystemSalesReport(await readJson(request)))
          }
          return next()
        } catch (error) {
          return sendJson(response, 400, { message: error instanceof Error ? error.message : 'Unable to generate System Sales report.' })
        }
      })

      server.middlewares.use('/api/employee-sales', async (request, response, next) => {
        if (!getSession(request)) return sendJson(response, 401, { message: 'Sign in to access Employee Sales.' })
        const url = new URL(request.url ?? '/', 'http://localhost')
        try {
          if (request.method === 'GET' && url.pathname === '/employees') {
            return sendJson(response, 200, await employeeSales.loadEmployees())
          }
          if (request.method === 'POST' && url.pathname === '/generate') {
            if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
            return sendJson(response, 200, await employeeSales.generateEmployeeSales(await readJson(request)))
          }
          if (request.method === 'POST' && url.pathname === '/generate-all') {
            if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
            return sendJson(response, 200, await employeeSales.generateAllEmployeeSales(await readJson(request)))
          }
          return next()
        } catch (error) {
          return sendJson(response, 400, { message: error instanceof Error ? error.message : 'Unable to generate Employee Sales report.' })
        }
      })

      server.middlewares.use('/api/sc-pwd', async (request, response, next) => {
        if (!getSession(request)) return sendJson(response, 401, { message: 'Sign in to access SC / PWD Listing.' })
        if (request.method !== 'POST' || request.url?.split('?')[0] !== '/generate') return next()
        if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
        try {
          return sendJson(response, 200, await scPwd.loadScPwd(await readJson(request)))
        } catch (error) {
          return sendJson(response, 400, { message: error instanceof Error ? error.message : 'Unable to generate SC / PWD Listing.' })
        }
      })

      server.middlewares.use('/api/tender-listing', async (request, response, next) => {
        if (!getSession(request)) return sendJson(response, 401, { message: 'Sign in to access Tender Listing.' })
        if (request.method !== 'POST' || request.url?.split('?')[0] !== '/generate') return next()
        if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
        try {
          return sendJson(response, 200, await tenderListing.generateTenderListing(await readJson(request)))
        } catch (error) {
          return sendJson(response, 400, { message: error instanceof Error ? error.message : 'Unable to generate Tender Listing.' })
        }
      })

      server.middlewares.use('/api/variance-checking', async (request, response, next) => {
        if (!getSession(request)) return sendJson(response, 401, { message: 'Sign in to access Variance Checking.' })
        const url = new URL(request.url ?? '/', 'http://localhost')
        if (request.method !== 'POST' || !['/generate', '/receipt'].includes(url.pathname)) return next()
        if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
        try {
          const input = await readJson(request)
          const result = url.pathname === '/generate'
            ? await variance.generateVarianceChecking(input)
            : await variance.loadVarianceReceipt(input)
          return sendJson(response, 200, result)
        } catch (error) {
          return sendJson(response, 400, { message: error instanceof Error ? error.message : 'Unable to complete Variance Checking.' })
        }
      })

      server.middlewares.use('/api/menu-item', async (request, response, next) => {
        if (!getSession(request)) return sendJson(response, 401, { message: 'Sign in to access Menu Items.' })
        const route = request.url?.split('?')[0]
        if (request.method !== 'POST' || !['/by-sales-type', '/summary'].includes(route ?? '')) return next()
        if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
        try {
          const input = await readJson(request)
          if (typeof input.dateFrom !== 'string' || typeof input.dateTo !== 'string') {
            return sendJson(response, 400, { message: 'From Date and To Date are required.' })
          }
          const result = route === '/by-sales-type'
            ? await menuItem.loadMenuItemsBySalesType({ dateFrom: input.dateFrom, dateTo: input.dateTo })
            : await menuItem.loadMenuItemSummary({ dateFrom: input.dateFrom, dateTo: input.dateTo })
          return sendJson(response, 200, result)
        } catch (error) {
          return sendJson(response, 400, { message: error instanceof Error ? error.message : 'Unable to generate Menu Item report.' })
        }
      })

      server.middlewares.use('/api/pos-journal', async (request, response, next) => {
        if (!getSession(request)) return sendJson(response, 401, { message: 'Sign in to access POS Journal.' })
        if (request.method !== 'GET') return next()
        const url = new URL(request.url ?? '/', 'http://localhost')
        try {
          if (url.pathname === '/by-date') {
            const businessDate = url.searchParams.get('businessDate') ?? ''
            return sendJson(response, 200, await posJournal.loadPosJournals(businessDate))
          }
          if (url.pathname === '/by-check-number') {
            const checkNumber = url.searchParams.get('checkNumber') ?? ''
            return sendJson(response, 200, await posJournal.loadPosJournalByCheckNumber(checkNumber))
          }
          return next()
        } catch (error) {
          return sendJson(response, 400, { message: error instanceof Error ? error.message : 'Unable to load POS Journal.' })
        }
      })

      server.middlewares.use('/api/rof', async (request, response, next) => {
        const session = getSession(request)
        if (!session) return sendJson(response, 401, { message: 'Sign in to access ROF.' })
        const url = new URL(request.url ?? '/', 'http://localhost')
        try {
          if (request.method === 'GET' && url.pathname === '/summary') {
            return sendJson(response, 200, await rof.loadRofSummary(
              url.searchParams.get('dateFrom') ?? '',
              url.searchParams.get('dateTo') ?? '',
              session.user.locationName,
            ))
          }
          if (request.method === 'GET' && url.pathname === '/source') {
            return sendJson(response, 200, await rof.loadRofSource(url.searchParams.get('businessDate') ?? ''))
          }
          if (request.method === 'GET' && url.pathname === '/details') {
            return sendJson(response, 200, await rof.loadRofDetails(url.searchParams.get('businessDate') ?? ''))
          }
          if (request.method === 'GET' && url.pathname === '/deposit-source') {
            return sendJson(response, 200, await rof.getDepositSource(url.searchParams.get('businessDate') ?? ''))
          }
          if (request.method === 'POST' && url.pathname === '/create') {
            if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
            const body = await readJson(request)
            return sendJson(response, 200, await rof.createRof({ ...body, locationName: session.user.locationName }))
          }
          if (request.method === 'DELETE' && url.pathname === '/delete') {
            if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
            return sendJson(response, 200, await rof.deleteRof(url.searchParams.get('businessDate') ?? ''))
          }
          return next()
        } catch (error) {
          if (error instanceof SyntaxError || (error instanceof Error && error.message === 'Request body is too large.')) {
            return sendJson(response, 400, { message: 'Invalid ROF request.' })
          }
          return sendJson(response, 400, { message: error instanceof Error ? error.message : 'Unable to complete the ROF request.' })
        }
      })

      server.middlewares.use('/api/deposit', async (request, response, next) => {
        const session = getSession(request)
        if (!session) return sendJson(response, 401, { message: 'Sign in to access Deposit Monitoring.' })
        const url = new URL(request.url ?? '/', 'http://localhost')
        const locationName = session.user.locationName
        try {
          if (request.method === 'GET' && url.pathname === '/list') {
            const input: Record<string, unknown> = {
              locationName,
              page: Number(url.searchParams.get('page') ?? 1),
              pageSize: Number(url.searchParams.get('pageSize') ?? 10),
            }
            const keyword = url.searchParams.get('keyword')
            const month = url.searchParams.get('month')
            const year = url.searchParams.get('year')
            if (keyword) input.keyword = keyword
            if (month) input.month = Number(month)
            if (year) input.year = Number(year)
            return sendJson(response, 200, await deposit.loadDeposits(input))
          }
          if (request.method === 'GET' && url.pathname === '/check-status') {
            return sendJson(response, 200, await deposit.checkDepositStatus(url.searchParams.get('businessDate') ?? '', locationName))
          }
          if (request.method === 'GET' && url.pathname === '/record') {
            return sendJson(response, 200, await deposit.loadDepositById(Number(url.searchParams.get('depositId')), locationName))
          }
          if (request.method === 'GET' && url.pathname === '/attachment') {
            const fileName = basename(url.searchParams.get('fileName') ?? '')
            if (!fileName) return sendJson(response, 400, { message: 'Attachment filename is required.' })
            const owner = await deposit.loadDeposits({ locationName, page: 1, pageSize: 1, keyword: fileName }) as { success?: boolean; rows?: Array<{ filename: string }> }
            if (!owner.success || !owner.rows?.some((row) => row.filename === fileName)) return sendJson(response, 404, { message: 'Attachment was not found for this store.' })
            const bytes = await ftp.downloadDepositImageBuffer(fileName)
            return sendJson(response, 200, {
              success: true,
              fileName,
              previewDataUrl: `data:${imageMime(fileName)};base64,${bytes.toString('base64')}`,
              message: 'Attachment loaded successfully.',
            })
          }
          if (request.method === 'POST' && url.pathname === '/create') {
            if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
            const body = await readJson(request, 15 * 1024 * 1024)
            const result = await withDepositUpload(body.attachmentName, body.attachmentBase64, (filePath) =>
              deposit.createDeposit({ ...body, locationName, localFilePath: filePath }),
            )
            return sendJson(response, 200, result)
          }
          if (request.method === 'PUT' && url.pathname === '/update') {
            if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
            const body = await readJson(request)
            return sendJson(response, 200, await deposit.editDeposit({ ...body, locationName }))
          }
          if (request.method === 'DELETE' && url.pathname === '/delete') {
            if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
            return sendJson(response, 200, await deposit.removeDeposit(Number(url.searchParams.get('depositId')), locationName))
          }
          if (request.method === 'POST' && url.pathname === '/replace-attachment') {
            if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
            const body = await readJson(request, 15 * 1024 * 1024)
            const fileName = basename(String(body.fileName ?? ''))
            if (!fileName) return sendJson(response, 400, { message: 'Attachment filename is required.' })
            const owner = await deposit.loadDeposits({ locationName, page: 1, pageSize: 1, keyword: fileName }) as { success?: boolean; rows?: Array<{ filename: string }> }
            if (!owner.success || !owner.rows?.some((row) => row.filename === fileName)) return sendJson(response, 404, { message: 'Attachment was not found for this store.' })
            const result = await withDepositUpload(body.attachmentName, body.attachmentBase64, async (filePath) => {
              await ftp.replaceDepositImage(filePath, fileName)
              const bytes = await ftp.downloadDepositImageBuffer(fileName)
              return {
                success: true,
                canceled: false,
                previewDataUrl: `data:${imageMime(fileName)};base64,${bytes.toString('base64')}`,
                message: 'Attachment replaced successfully.',
              }
            })
            return sendJson(response, 200, result)
          }
          return next()
        } catch (error) {
          if (error instanceof SyntaxError || (error instanceof Error && error.message === 'Request body is too large.')) {
            return sendJson(response, 400, { message: 'Invalid Deposit Monitoring request.' })
          }
          return sendJson(response, 400, { message: error instanceof Error ? error.message : 'Unable to complete the deposit request.' })
        }
      })

      server.middlewares.use('/api/maintenance', async (request, response, next) => {
        if (!getSession(request)) return sendJson(response, 401, { message: 'Sign in to access Maintenance.' })
        const url = new URL(request.url ?? '/', 'http://localhost')
        try {
          if (request.method === 'GET' && url.pathname === '/missing-items') {
            return sendJson(response, 200, await maintenanceRepository.getMissingMenuItems())
          }
          if (request.method === 'POST' && url.pathname === '/sync-items') {
            if (!sameOrigin(request)) return sendJson(response, 403, { message: 'Request origin could not be verified.' })
            const requestedRows = await readJson(request, 5 * 1024 * 1024)
            if (!Array.isArray(requestedRows.rows)) return sendJson(response, 400, { message: 'Load missing items before syncing.' })
            const requestedNumbers = new Set(requestedRows.rows
              .map((row) => row && typeof row === 'object' && 'itemnumber' in row ? String(row.itemnumber).trim() : '')
              .filter(Boolean))
            if (requestedNumbers.size === 0) return sendJson(response, 400, { message: 'There are no missing items to sync.' })
            const currentMissing = await maintenanceRepository.getMissingMenuItems()
            const rows = currentMissing.filter((row) => requestedNumbers.has(String(row.itemnumber)))
            if (rows.length === 0) return sendJson(response, 200, { success: false, message: 'No requested items are still missing from the local POS database.' })
            await maintenanceRepository.insertMissingMenuItems(rows)
            return sendJson(response, 200, { success: true, message: `${rows.length} missing item(s) synced to POS.` })
          }
          return next()
        } catch (error) {
          if (error instanceof SyntaxError || (error instanceof Error && error.message === 'Request body is too large.')) {
            return sendJson(response, 400, { message: 'Invalid maintenance request.' })
          }
          return sendJson(response, 400, { message: error instanceof Error ? error.message : 'Unable to complete the maintenance request.' })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), databaseAuthApi()],
  resolve: {
    alias: [
      {
        find: /^(\.\.\/)+auth\/useAuth(?:\.ts)?$/,
        replacement: resolve(process.cwd(), 'src/auth/useAuth.ts'),
      },
      {
        find: resolve(process.cwd(), '../src/auth/useAuth.ts'),
        replacement: resolve(process.cwd(), 'src/auth/useAuth.ts'),
      },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
  },
})
