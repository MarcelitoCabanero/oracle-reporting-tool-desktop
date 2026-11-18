import sql from 'mssql'

import {
  getHqDbPool,
} from '../database/hqdb.js'

import type {
  DepositApprovalStatus,
  DepositDeleteStatus,
  DepositInsert,
  DepositListInput,
  DepositRecord,
  DepositStatus,
  DepositThreadAttachment,
  DepositThreadCategory,
  DepositThreadEntry,
  InitialDepositThreadInsert,
  PettyCashStatus,
} from './deposit.types.js'

let schemaEnsured = false

export async function ensureDepositMonitoringSchema(): Promise<void> {
  if (schemaEnsured) {
    return
  }

  const pool =
    await getHqDbPool()

  await pool.request().query(`
    IF COL_LENGTH('dbo.dts_depo', 'approval_status') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD approval_status VARCHAR(30) NOT NULL
        CONSTRAINT DF_dts_depo_approval_status DEFAULT ('Not Required');
    END

    IF COL_LENGTH('dbo.dts_depo', 'approved_by') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD approved_by VARCHAR(100) NULL;
    END

    IF COL_LENGTH('dbo.dts_depo', 'approved_at') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD approved_at DATETIME2 NULL;
    END

    IF COL_LENGTH('dbo.dts_depo', 'pettycash_status') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD pettycash_status VARCHAR(30) NOT NULL
        CONSTRAINT DF_dts_depo_pettycash_status DEFAULT ('N/A');
    END

    IF COL_LENGTH('dbo.dts_depo', 'pettycash_replenished_at') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD pettycash_replenished_at DATETIME2 NULL;
    END

    IF COL_LENGTH('dbo.dts_depo', 'opensales_source_date') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD opensales_source_date DATE NULL;
    END

    IF COL_LENGTH('dbo.dts_depo', 'dept_exp_department') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD dept_exp_department VARCHAR(100) NULL;
    END

    IF COL_LENGTH('dbo.dts_depo', 'dept_exp_borrower') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD dept_exp_borrower VARCHAR(100) NULL;
    END

    IF COL_LENGTH('dbo.dts_depo', 'delete_status') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD delete_status VARCHAR(30) NOT NULL
        CONSTRAINT DF_dts_depo_delete_status DEFAULT ('None');
    END

    IF COL_LENGTH('dbo.dts_depo', 'delete_reason') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD delete_reason NVARCHAR(500) NULL;
    END

    IF COL_LENGTH('dbo.dts_depo', 'delete_requested_by') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD delete_requested_by VARCHAR(100) NULL;
    END

    IF COL_LENGTH('dbo.dts_depo', 'delete_requested_at') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD delete_requested_at DATETIME2 NULL;
    END

    IF COL_LENGTH('dbo.dts_depo', 'delete_approved_by') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD delete_approved_by VARCHAR(100) NULL;
    END

    IF COL_LENGTH('dbo.dts_depo', 'delete_approved_at') IS NULL
    BEGIN
      ALTER TABLE dbo.dts_depo
      ADD delete_approved_at DATETIME2 NULL;
    END

    IF OBJECT_ID('dbo.dts_depo_threads', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.dts_depo_threads (
        thread_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        depo_id INT NOT NULL,
        category VARCHAR(40) NOT NULL,
        author_name VARCHAR(100) NOT NULL,
        author_role VARCHAR(50) NOT NULL,
        message NVARCHAR(1000) NOT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_dts_depo_threads_created_at DEFAULT (SYSDATETIME())
      );

      CREATE INDEX IX_dts_depo_threads_depo_id
        ON dbo.dts_depo_threads (depo_id, created_at ASC);
    END

    IF OBJECT_ID('dbo.dts_depo_attachments', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.dts_depo_attachments (
        attachment_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        depo_id INT NOT NULL,
        thread_id INT NULL,
        category VARCHAR(40) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        uploaded_by VARCHAR(100) NOT NULL,
        uploaded_at DATETIME2 NOT NULL CONSTRAINT DF_dts_depo_attachments_uploaded_at DEFAULT (SYSDATETIME())
      );

      CREATE INDEX IX_dts_depo_attachments_depo_id
        ON dbo.dts_depo_attachments (depo_id, thread_id);
    END
  `)

  schemaEnsured = true
}

function formatSqlDate(
  value: Date | string | null,
): string {
  if (!value) {
    return ''
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date
    .toISOString()
    .slice(0, 10)
}

function formatSqlDateTime(
  value: Date | string | null,
): string {
  if (!value) {
    return ''
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString()
}

function normalizeApprovalStatus(
  rawStatus: unknown,
  pettyCash: number,
  openSales: number,
  otherDepartmentExpense: number,
): DepositApprovalStatus {
  const status = String(rawStatus ?? '').trim()
  if (
    status === 'Approved' ||
    status === 'Rejected' ||
    status === 'Pending'
  ) {
    return status
  }

  if (
    pettyCash > 0 ||
    openSales > 0 ||
    otherDepartmentExpense > 0
  ) {
    return 'Pending'
  }

  return 'Not Required'
}

function normalizePettyCashStatus(
  rawStatus: unknown,
  pettyCash: number,
): PettyCashStatus {
  if (pettyCash <= 0) {
    return 'N/A'
  }

  const status = String(rawStatus ?? '').trim()
  if (status === 'Replenished') {
    return 'Replenished'
  }

  return 'Unreplenished'
}

function normalizeDeleteStatus(
  rawStatus: unknown,
): DepositDeleteStatus {
  const status = String(rawStatus ?? '').trim()
  if (
    status === 'Pending Delete' ||
    status === 'Delete Approved' ||
    status === 'Delete Rejected'
  ) {
    return status
  }

  return 'None'
}

function mapRowToDepositRecord(
  row: Record<string, unknown>,
): DepositRecord {
  const posAmount =
    Number(row.pos ?? 0)
  const depositAmount =
    Number(row.deposit ?? 0)
  const pettyCash =
    Number(row.pettycash ?? 0)
  const bir2307 =
    Number(row.bir2307 ?? 0)
  const openSales =
    Number(row.opensales ?? 0)
  const otherDepartmentExpense =
    Number(row.otherdeptexp ?? 0)

  const variance =
    depositAmount +
    pettyCash +
    bir2307 +
    openSales +
    otherDepartmentExpense -
    posAmount

  return {
    depositId:
      Number(row.depo_id),
    locationName:
      String(row.locationname ?? ''),
    businessDate:
      formatSqlDate(
        row.busidate as Date | string | null,
      ),
    depositDate:
      formatSqlDate(
        row.datedepo as Date | string | null,
      ),
    depositReference:
      String(row.deporef ?? ''),
    posAmount,
    depositAmount,
    pettyCash,
    bir2307,
    openSales,
    otherDepartmentExpense,
    variance,
    filename:
      String(row.filename ?? ''),
    approvalStatus:
      normalizeApprovalStatus(
        row.approval_status,
        pettyCash,
        openSales,
        otherDepartmentExpense,
      ),
    approvedBy:
      String(row.approved_by ?? ''),
    approvedAt:
      formatSqlDateTime(
        row.approved_at as Date | string | null,
      ),
    deleteStatus:
      normalizeDeleteStatus(row.delete_status),
    deleteReason:
      String(row.delete_reason ?? ''),
    deleteRequestedBy:
      String(row.delete_requested_by ?? ''),
    deleteRequestedAt:
      formatSqlDateTime(
        row.delete_requested_at as Date | string | null,
      ),
    deleteApprovedBy:
      String(row.delete_approved_by ?? ''),
    deleteApprovedAt:
      formatSqlDateTime(
        row.delete_approved_at as Date | string | null,
      ),
    pettyCashStatus:
      normalizePettyCashStatus(
        row.pettycash_status,
        pettyCash,
      ),
    pettyCashReplenishedAt:
      formatSqlDateTime(
        row.pettycash_replenished_at as Date | string | null,
      ),
    openSalesSourceDate:
      formatSqlDate(
        row.opensales_source_date as Date | string | null,
      ),
    deptExpenseDepartment:
      String(row.dept_exp_department ?? ''),
    deptExpenseBorrower:
      String(row.dept_exp_borrower ?? ''),
    threadCount:
      Number(row.threadCount ?? 0),
    supportingAttachmentCount:
      Number(row.supportingAttachmentCount ?? 0),
  }
}

async function insertThreadWithAttachments(
  transaction: sql.Transaction,
  depositId: number,
  entry: InitialDepositThreadInsert,
): Promise<void> {
  const threadResult =
    await new sql.Request(transaction)
      .input('depoId', sql.Int, depositId)
      .input('category', sql.VarChar(40), entry.category)
      .input('authorName', sql.VarChar(100), entry.authorName)
      .input('authorRole', sql.VarChar(50), entry.authorRole)
      .input('message', sql.NVarChar(1000), entry.message)
      .query(`
        INSERT INTO dbo.dts_depo_threads
        (
          depo_id,
          category,
          author_name,
          author_role,
          message
        )
        OUTPUT INSERTED.thread_id
        VALUES
        (
          @depoId,
          @category,
          @authorName,
          @authorRole,
          @message
        )
      `)

  const threadId =
    Number(threadResult.recordset[0]?.thread_id)

  for (const filename of entry.filenames) {
    await new sql.Request(transaction)
      .input('depoId', sql.Int, depositId)
      .input('threadId', sql.Int, threadId)
      .input('category', sql.VarChar(40), entry.category)
      .input('filename', sql.VarChar(255), filename)
      .input('uploadedBy', sql.VarChar(100), entry.authorName)
      .query(`
        INSERT INTO dbo.dts_depo_attachments
        (
          depo_id,
          thread_id,
          category,
          filename,
          uploaded_by
        )
        VALUES
        (
          @depoId,
          @threadId,
          @category,
          @filename,
          @uploadedBy
        )
      `)
  }
}

export async function getDepositStatus(
  businessDate: string,
  locationName: string,
): Promise<DepositStatus> {
  await ensureDepositMonitoringSchema()

  const pool =
    await getHqDbPool()

  const result =
    await pool
      .request()
      .input(
        'businessDate',
        sql.Date,
        businessDate,
      )
      .input(
        'locationName',
        sql.VarChar,
        locationName,
      )
      .query(`
        SELECT TOP 1
          depo_id AS depositId
        FROM dbo.dts_depo
        WHERE busidate = @businessDate
          AND locationname = @locationName
      `)

  const row =
    result.recordset[0]

  if (!row) {
    return {
      exists: false,
      depositId: null,
    }
  }

  return {
    exists: true,
    depositId:
      Number(row.depositId),
  }
}

export async function saveDeposit(
  input: DepositInsert,
): Promise<number> {
  await ensureDepositMonitoringSchema()

  const pool =
    await getHqDbPool()

  const transaction =
    new sql.Transaction(pool)

  await transaction.begin()

  try {
    const request =
      new sql.Request(transaction)

    const result =
      await request
        .input(
          'locationName',
          sql.VarChar,
          input.locationName,
        )
        .input(
          'businessDate',
          sql.Date,
          input.businessDate,
        )
        .input(
          'depositDate',
          sql.Date,
          input.depositDate,
        )
        .input(
          'depositReference',
          sql.VarChar,
          input.depositReference,
        )
        .input(
          'posAmount',
          sql.Decimal(18, 2),
          input.posAmount,
        )
        .input(
          'depositAmount',
          sql.Decimal(18, 2),
          input.depositAmount,
        )
        .input(
          'pettyCash',
          sql.Decimal(18, 2),
          input.pettyCash,
        )
        .input(
          'bir2307',
          sql.Decimal(18, 2),
          input.bir2307,
        )
        .input(
          'openSales',
          sql.Decimal(18, 2),
          input.openSales,
        )
        .input(
          'otherDepartmentExpense',
          sql.Decimal(18, 2),
          input.otherDepartmentExpense,
        )
        .input(
          'filename',
          sql.VarChar,
          input.filename,
        )
        .input(
          'approvalStatus',
          sql.VarChar(30),
          input.approvalStatus,
        )
        .input(
          'pettyCashStatus',
          sql.VarChar(30),
          input.pettyCashStatus,
        )
        .input(
          'openSalesSourceDate',
          sql.Date,
          input.openSalesSourceDate,
        )
        .input(
          'deptExpenseDepartment',
          sql.VarChar(100),
          input.deptExpenseDepartment,
        )
        .input(
          'deptExpenseBorrower',
          sql.VarChar(100),
          input.deptExpenseBorrower,
        )
        .query(`
          INSERT INTO dbo.dts_depo
          (
            locationname,
            busidate,
            pos,
            datedepo,
            deporef,
            deposit,
            pettycash,
            bir2307,
            opensales,
            otherdeptexp,
            filename,
            approval_status,
            pettycash_status,
            opensales_source_date,
            dept_exp_department,
            dept_exp_borrower
          )
          OUTPUT INSERTED.depo_id
          VALUES
          (
            @locationName,
            @businessDate,
            @posAmount,
            @depositDate,
            @depositReference,
            @depositAmount,
            @pettyCash,
            @bir2307,
            @openSales,
            @otherDepartmentExpense,
            @filename,
            @approvalStatus,
            @pettyCashStatus,
            @openSalesSourceDate,
            @deptExpenseDepartment,
            @deptExpenseBorrower
          )
        `)

    const depositId =
      Number(
        result.recordset[0]
          ?.depo_id,
      )

    for (const thread of input.initialThreads) {
      await insertThreadWithAttachments(
        transaction,
        depositId,
        thread,
      )
    }

    await transaction.commit()

    return depositId
  } catch (error) {
    await transaction.rollback()

    throw error
  }
}

export async function getDeposits(
  input: DepositListInput,
): Promise<{
  rows: DepositRecord[]
  totalRecords: number
}> {
  await ensureDepositMonitoringSchema()

  const pool =
    await getHqDbPool()

  const page =
    Math.max(1, input.page)

  const pageSize =
    Math.max(1, input.pageSize)

  const offset =
    (page - 1) * pageSize

  const keyword =
    input.keyword?.trim() ?? ''

  const request =
    pool
      .request()
      .input(
        'locationName',
        sql.VarChar,
        input.locationName,
      )
      .input(
        'keyword',
        sql.VarChar,
        `%${keyword}%`,
      )
      .input(
        'pageSize',
        sql.Int,
        pageSize,
      )
      .input(
        'offset',
        sql.Int,
        offset,
      )

  if (input.month) {
    request.input(
      'month',
      sql.Int,
      input.month,
    )
  }

  if (input.year) {
    request.input(
      'year',
      sql.Int,
      input.year,
    )
  }

  const filters: string[] = [
    'd.locationname = @locationName',
  ]

  if (keyword) {
    filters.push(`
      (
        CAST(d.depo_id AS VARCHAR(50))
          LIKE @keyword

        OR ISNULL(d.deporef, '')
          LIKE @keyword

        OR ISNULL(d.filename, '')
          LIKE @keyword

        OR ISNULL(d.approval_status, '')
          LIKE @keyword

        OR ISNULL(d.delete_status, '')
          LIKE @keyword

        OR ISNULL(d.pettycash_status, '')
          LIKE @keyword

        OR ISNULL(d.dept_exp_department, '')
          LIKE @keyword

        OR ISNULL(d.dept_exp_borrower, '')
          LIKE @keyword

        OR CAST(
          ISNULL(d.deposit, 0)
          AS VARCHAR(50)
        ) LIKE @keyword
      )
    `)
  }

  if (input.month) {
    filters.push(`
      MONTH(d.busidate) = @month
    `)
  }

  if (input.year) {
    filters.push(`
      YEAR(d.busidate) = @year
    `)
  }

  const whereClause =
    filters.join(' AND ')

  const countResult =
    await request.query(`
      SELECT
        COUNT(*) AS totalRecords
      FROM dbo.dts_depo d
      WHERE ${whereClause}
    `)

  const totalRecords =
    Number(
      countResult.recordset[0]
        ?.totalRecords ?? 0,
    )

  const dataRequest =
    pool
      .request()
      .input(
        'locationName',
        sql.VarChar,
        input.locationName,
      )
      .input(
        'keyword',
        sql.VarChar,
        `%${keyword}%`,
      )
      .input(
        'pageSize',
        sql.Int,
        pageSize,
      )
      .input(
        'offset',
        sql.Int,
        offset,
      )

  if (input.month) {
    dataRequest.input(
      'month',
      sql.Int,
      input.month,
    )
  }

  if (input.year) {
    dataRequest.input(
      'year',
      sql.Int,
      input.year,
    )
  }

  const result =
    await dataRequest.query(`
      SELECT
        d.depo_id,
        d.locationname,
        d.busidate,
        d.datedepo,
        d.deporef,
        ISNULL(d.pos, 0) AS pos,
        ISNULL(d.deposit, 0) AS deposit,
        ISNULL(d.pettycash, 0) AS pettycash,
        ISNULL(d.bir2307, 0) AS bir2307,
        ISNULL(d.opensales, 0) AS opensales,
        ISNULL(d.otherdeptexp, 0) AS otherdeptexp,
        ISNULL(d.filename, '') AS filename,
        ISNULL(d.approval_status, 'Not Required') AS approval_status,
        ISNULL(d.approved_by, '') AS approved_by,
        d.approved_at,
        ISNULL(d.delete_status, 'None') AS delete_status,
        ISNULL(d.delete_reason, '') AS delete_reason,
        ISNULL(d.delete_requested_by, '') AS delete_requested_by,
        d.delete_requested_at,
        ISNULL(d.delete_approved_by, '') AS delete_approved_by,
        d.delete_approved_at,
        ISNULL(d.pettycash_status, 'N/A') AS pettycash_status,
        d.pettycash_replenished_at,
        d.opensales_source_date,
        ISNULL(d.dept_exp_department, '') AS dept_exp_department,
        ISNULL(d.dept_exp_borrower, '') AS dept_exp_borrower,
        (
          SELECT COUNT(*)
          FROM dbo.dts_depo_threads t
          WHERE t.depo_id = d.depo_id
        ) AS threadCount,
        (
          SELECT COUNT(*)
          FROM dbo.dts_depo_attachments a
          WHERE a.depo_id = d.depo_id
        ) AS supportingAttachmentCount

      FROM dbo.dts_depo d

      WHERE ${whereClause}

      ORDER BY
        d.busidate DESC,
        d.depo_id DESC

      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY
    `)

  const rows: DepositRecord[] =
    result.recordset.map(
      (row) =>
        mapRowToDepositRecord(
          row as Record<string, unknown>,
        ),
    )

  return {
    rows,
    totalRecords,
  }
}

export async function getDepositById(
  depositId: number,
  locationName: string,
): Promise<DepositRecord | null> {
  await ensureDepositMonitoringSchema()

  const pool =
    await getHqDbPool()

  const result =
    await pool
      .request()
      .input(
        'depositId',
        sql.Int,
        depositId,
      )
      .input(
        'locationName',
        sql.VarChar,
        locationName,
      )
      .query(`
        SELECT TOP 1
          d.depo_id,
          d.locationname,
          d.busidate,
          d.datedepo,
          d.deporef,
          ISNULL(d.pos, 0) AS pos,
          ISNULL(d.deposit, 0) AS deposit,
          ISNULL(d.pettycash, 0) AS pettycash,
          ISNULL(d.bir2307, 0) AS bir2307,
          ISNULL(d.opensales, 0) AS opensales,
          ISNULL(d.otherdeptexp, 0) AS otherdeptexp,
          ISNULL(d.filename, '') AS filename,
          ISNULL(d.approval_status, 'Not Required') AS approval_status,
          ISNULL(d.approved_by, '') AS approved_by,
          d.approved_at,
          ISNULL(d.delete_status, 'None') AS delete_status,
          ISNULL(d.delete_reason, '') AS delete_reason,
          ISNULL(d.delete_requested_by, '') AS delete_requested_by,
          d.delete_requested_at,
          ISNULL(d.delete_approved_by, '') AS delete_approved_by,
          d.delete_approved_at,
          ISNULL(d.pettycash_status, 'N/A') AS pettycash_status,
          d.pettycash_replenished_at,
          d.opensales_source_date,
          ISNULL(d.dept_exp_department, '') AS dept_exp_department,
          ISNULL(d.dept_exp_borrower, '') AS dept_exp_borrower,
          (
            SELECT COUNT(*)
            FROM dbo.dts_depo_threads t
            WHERE t.depo_id = d.depo_id
          ) AS threadCount,
          (
            SELECT COUNT(*)
            FROM dbo.dts_depo_attachments a
            WHERE a.depo_id = d.depo_id
          ) AS supportingAttachmentCount

        FROM dbo.dts_depo d

        WHERE d.depo_id = @depositId
          AND d.locationname = @locationName
      `)

  const row =
    result.recordset[0]

  if (!row) {
    return null
  }

  return mapRowToDepositRecord(
    row as Record<string, unknown>,
  )
}

export interface RepositoryUpdateDepositInput {
  depositId: number
  locationName: string
  depositDate: string
  depositReference: string
  pettyCash: number
  bir2307: number
  openSales: number
  otherDepartmentExpense: number
  approvalStatus: DepositApprovalStatus
  pettyCashStatus: PettyCashStatus
  openSalesSourceDate: string | null
  deptExpenseDepartment: string | null
  deptExpenseBorrower: string | null
  newThreads: InitialDepositThreadInsert[]
}

export async function updateDeposit(
  input: RepositoryUpdateDepositInput,
): Promise<boolean> {
  await ensureDepositMonitoringSchema()

  const pool =
    await getHqDbPool()

  const transaction =
    new sql.Transaction(pool)

  await transaction.begin()

  try {
    const result =
      await new sql.Request(transaction)
        .input(
          'depositId',
          sql.Int,
          input.depositId,
        )
        .input(
          'locationName',
          sql.VarChar,
          input.locationName,
        )
        .input(
          'depositDate',
          sql.Date,
          input.depositDate,
        )
        .input(
          'depositReference',
          sql.VarChar,
          input.depositReference,
        )
        .input(
          'pettyCash',
          sql.Decimal(18, 2),
          input.pettyCash,
        )
        .input(
          'bir2307',
          sql.Decimal(18, 2),
          input.bir2307,
        )
        .input(
          'openSales',
          sql.Decimal(18, 2),
          input.openSales,
        )
        .input(
          'otherDepartmentExpense',
          sql.Decimal(18, 2),
          input.otherDepartmentExpense,
        )
        .input(
          'approvalStatus',
          sql.VarChar(30),
          input.approvalStatus,
        )
        .input(
          'pettyCashStatus',
          sql.VarChar(30),
          input.pettyCashStatus,
        )
        .input(
          'openSalesSourceDate',
          sql.Date,
          input.openSalesSourceDate,
        )
        .input(
          'deptExpenseDepartment',
          sql.VarChar(100),
          input.deptExpenseDepartment,
        )
        .input(
          'deptExpenseBorrower',
          sql.VarChar(100),
          input.deptExpenseBorrower,
        )
        .query(`
          UPDATE dbo.dts_depo

          SET
            datedepo = @depositDate,
            deporef = @depositReference,
            pettycash = @pettyCash,
            bir2307 = @bir2307,
            opensales = @openSales,
            otherdeptexp = @otherDepartmentExpense,
            approval_status = @approvalStatus,
            pettycash_status = @pettyCashStatus,
            opensales_source_date = @openSalesSourceDate,
            dept_exp_department = @deptExpenseDepartment,
            dept_exp_borrower = @deptExpenseBorrower

          WHERE depo_id = @depositId
            AND locationname = @locationName
        `)

    if (result.rowsAffected[0] <= 0) {
      await transaction.rollback()
      return false
    }

    for (const thread of input.newThreads) {
      await insertThreadWithAttachments(
        transaction,
        input.depositId,
        thread,
      )
    }

    await transaction.commit()

    return true
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export async function getDepositSupportingFilenames(
  depositId: number,
): Promise<string[]> {
  await ensureDepositMonitoringSchema()

  const pool =
    await getHqDbPool()

  const result =
    await pool
      .request()
      .input('depositId', sql.Int, depositId)
      .query(`
        SELECT filename
        FROM dbo.dts_depo_attachments
        WHERE depo_id = @depositId
      `)

  return result.recordset
    .map((row) => String(row.filename ?? '').trim())
    .filter(Boolean)
}

export async function deleteDeposit(
  depositId: number,
  locationName: string,
): Promise<boolean> {
  await ensureDepositMonitoringSchema()

  const pool =
    await getHqDbPool()

  const transaction =
    new sql.Transaction(pool)

  await transaction.begin()

  try {
    await new sql.Request(transaction)
      .input('depositId', sql.Int, depositId)
      .query(`
        DELETE FROM dbo.dts_depo_attachments
        WHERE depo_id = @depositId
      `)

    await new sql.Request(transaction)
      .input('depositId', sql.Int, depositId)
      .query(`
        DELETE FROM dbo.dts_depo_threads
        WHERE depo_id = @depositId
      `)

    const result =
      await new sql.Request(
        transaction,
      )
        .input(
          'depositId',
          sql.Int,
          depositId,
        )
        .input(
          'locationName',
          sql.VarChar,
          locationName,
        )
        .query(`
          DELETE FROM dbo.dts_depo

          WHERE depo_id =
            @depositId

            AND locationname =
              @locationName
        `)

    await transaction.commit()

    return (
      result.rowsAffected[0] > 0
    )
  } catch (error) {
    await transaction.rollback()

    throw error
  }
}

export async function getDepositThreadEntries(
  depositId: number,
): Promise<DepositThreadEntry[]> {
  await ensureDepositMonitoringSchema()

  const pool =
    await getHqDbPool()

  const [threadsResult, attachmentsResult] =
    await Promise.all([
      pool
        .request()
        .input('depositId', sql.Int, depositId)
        .query(`
          SELECT
            thread_id,
            depo_id,
            category,
            author_name,
            author_role,
            message,
            created_at
          FROM dbo.dts_depo_threads
          WHERE depo_id = @depositId
          ORDER BY created_at ASC, thread_id ASC
        `),
      pool
        .request()
        .input('depositId', sql.Int, depositId)
        .query(`
          SELECT
            attachment_id,
            depo_id,
            thread_id,
            category,
            filename,
            uploaded_by,
            uploaded_at
          FROM dbo.dts_depo_attachments
          WHERE depo_id = @depositId
          ORDER BY uploaded_at ASC, attachment_id ASC
        `),
    ])

  const attachmentsByThreadId =
    new Map<number, DepositThreadAttachment[]>()

  for (const row of attachmentsResult.recordset) {
    const threadId =
      row.thread_id !== null && row.thread_id !== undefined
        ? Number(row.thread_id)
        : 0

    const item: DepositThreadAttachment = {
      attachmentId:
        Number(row.attachment_id),
      depositId:
        Number(row.depo_id),
      threadId:
        threadId || null,
      category:
        String(row.category ?? 'GENERAL') as DepositThreadCategory,
      filename:
        String(row.filename ?? ''),
      uploadedBy:
        String(row.uploaded_by ?? ''),
      uploadedAt:
        formatSqlDateTime(
          row.uploaded_at as Date | string | null,
        ),
    }

    const list =
      attachmentsByThreadId.get(threadId) ?? []
    list.push(item)
    attachmentsByThreadId.set(threadId, list)
  }

  return threadsResult.recordset.map((row) => {
    const threadId =
      Number(row.thread_id)

    return {
      threadId,
      depositId:
        Number(row.depo_id),
      category:
        String(row.category ?? 'GENERAL') as DepositThreadCategory,
      authorName:
        String(row.author_name ?? ''),
      authorRole:
        String(row.author_role ?? ''),
      message:
        String(row.message ?? ''),
      createdAt:
        formatSqlDateTime(
          row.created_at as Date | string | null,
        ),
      attachments:
        attachmentsByThreadId.get(threadId) ?? [],
    }
  })
}

export async function addDepositThreadEntry(
  depositId: number,
  entry: InitialDepositThreadInsert,
): Promise<void> {
  await ensureDepositMonitoringSchema()

  const pool =
    await getHqDbPool()

  const transaction =
    new sql.Transaction(pool)

  await transaction.begin()

  try {
    await insertThreadWithAttachments(
      transaction,
      depositId,
      entry,
    )

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export async function replenishDepositPettyCash(
  depositId: number,
  locationName: string,
  entry: InitialDepositThreadInsert,
): Promise<boolean> {
  await ensureDepositMonitoringSchema()

  const pool =
    await getHqDbPool()

  const transaction =
    new sql.Transaction(pool)

  await transaction.begin()

  try {
    const updateResult =
      await new sql.Request(transaction)
        .input('depositId', sql.Int, depositId)
        .input('locationName', sql.VarChar, locationName)
        .query(`
          UPDATE dbo.dts_depo
          SET
            pettycash_status = 'Replenished',
            pettycash_replenished_at = SYSDATETIME()
          WHERE depo_id = @depositId
            AND locationname = @locationName
        `)

    if (updateResult.rowsAffected[0] <= 0) {
      await transaction.rollback()
      return false
    }

    await insertThreadWithAttachments(
      transaction,
      depositId,
      entry,
    )

    await transaction.commit()
    return true
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export async function requestDepositDeletion(
  depositId: number,
  locationName: string,
  reason: string,
  requestedBy: string,
  entry: InitialDepositThreadInsert,
): Promise<boolean> {
  await ensureDepositMonitoringSchema()

  const pool =
    await getHqDbPool()

  const transaction =
    new sql.Transaction(pool)

  await transaction.begin()

  try {
    const updateResult =
      await new sql.Request(transaction)
        .input('depositId', sql.Int, depositId)
        .input('locationName', sql.VarChar, locationName)
        .input('reason', sql.NVarChar(500), reason)
        .input('requestedBy', sql.VarChar(100), requestedBy)
        .query(`
          UPDATE dbo.dts_depo
          SET
            delete_status = 'Pending Delete',
            delete_reason = @reason,
            delete_requested_by = @requestedBy,
            delete_requested_at = SYSDATETIME(),
            delete_approved_by = NULL,
            delete_approved_at = NULL
          WHERE depo_id = @depositId
            AND locationname = @locationName
        `)

    if (updateResult.rowsAffected[0] <= 0) {
      await transaction.rollback()
      return false
    }

    await insertThreadWithAttachments(
      transaction,
      depositId,
      entry,
    )

    await transaction.commit()
    return true
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export async function revertDepositDeletionRequest(
  depositId: number,
  locationName: string,
  entry: InitialDepositThreadInsert,
): Promise<boolean> {
  await ensureDepositMonitoringSchema()

  const pool =
    await getHqDbPool()

  const transaction =
    new sql.Transaction(pool)

  await transaction.begin()

  try {
    const updateResult =
      await new sql.Request(transaction)
        .input('depositId', sql.Int, depositId)
        .input('locationName', sql.VarChar, locationName)
        .query(`
          UPDATE dbo.dts_depo
          SET
            delete_status = 'None',
            delete_reason = NULL,
            delete_requested_by = NULL,
            delete_requested_at = NULL,
            delete_approved_by = NULL,
            delete_approved_at = NULL
          WHERE depo_id = @depositId
            AND locationname = @locationName
        `)

    if (updateResult.rowsAffected[0] <= 0) {
      await transaction.rollback()
      return false
    }

    await insertThreadWithAttachments(
      transaction,
      depositId,
      entry,
    )

    await transaction.commit()
    return true
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
