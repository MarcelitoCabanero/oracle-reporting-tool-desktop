-- =============================================================================
-- Deposit Monitoring Enhancement Migration (Shared HQDB)
-- Compatible with both [oracle-reporting-tool-desktop] and [oracle-reporting-tool-web]
-- =============================================================================

-- 1. Add monitoring & approval columns to dbo.dts_depo
IF COL_LENGTH('dbo.dts_depo', 'approval_status') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD approval_status VARCHAR(30) NOT NULL
        CONSTRAINT DF_dts_depo_approval_status DEFAULT ('Not Required');
END
GO

IF COL_LENGTH('dbo.dts_depo', 'approved_by') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD approved_by VARCHAR(100) NULL;
END
GO

IF COL_LENGTH('dbo.dts_depo', 'approved_at') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD approved_at DATETIME2 NULL;
END
GO

IF COL_LENGTH('dbo.dts_depo', 'pettycash_status') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD pettycash_status VARCHAR(30) NOT NULL
        CONSTRAINT DF_dts_depo_pettycash_status DEFAULT ('N/A');
END
GO

IF COL_LENGTH('dbo.dts_depo', 'pettycash_replenished_at') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD pettycash_replenished_at DATETIME2 NULL;
END
GO

IF COL_LENGTH('dbo.dts_depo', 'opensales_source_date') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD opensales_source_date DATE NULL;
END
GO

IF COL_LENGTH('dbo.dts_depo', 'dept_exp_department') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD dept_exp_department VARCHAR(100) NULL;
END
GO

IF COL_LENGTH('dbo.dts_depo', 'dept_exp_borrower') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD dept_exp_borrower VARCHAR(100) NULL;
END
GO

-- Delete approval & revert tracking columns on dbo.dts_depo
IF COL_LENGTH('dbo.dts_depo', 'delete_status') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD delete_status VARCHAR(30) NOT NULL
        CONSTRAINT DF_dts_depo_delete_status DEFAULT ('None');
END
GO

IF COL_LENGTH('dbo.dts_depo', 'delete_reason') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD delete_reason NVARCHAR(500) NULL;
END
GO

IF COL_LENGTH('dbo.dts_depo', 'delete_requested_by') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD delete_requested_by VARCHAR(100) NULL;
END
GO

IF COL_LENGTH('dbo.dts_depo', 'delete_requested_at') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD delete_requested_at DATETIME2 NULL;
END
GO

IF COL_LENGTH('dbo.dts_depo', 'delete_approved_by') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD delete_approved_by VARCHAR(100) NULL;
END
GO

IF COL_LENGTH('dbo.dts_depo', 'delete_approved_at') IS NULL
BEGIN
    ALTER TABLE dbo.dts_depo
    ADD delete_approved_at DATETIME2 NULL;
END
GO

-- Backfill existing records where deductions > 0 if needed
UPDATE dbo.dts_depo
SET
    approval_status = CASE
        WHEN ISNULL(pettycash, 0) > 0
          OR ISNULL(opensales, 0) > 0
          OR ISNULL(otherdeptexp, 0) > 0
        THEN 'Pending'
        ELSE 'Not Required'
    END,
    pettycash_status = CASE
        WHEN ISNULL(pettycash, 0) > 0 THEN 'Unreplenished'
        ELSE 'N/A'
    END
WHERE approval_status = 'Not Required'
  AND (
      ISNULL(pettycash, 0) > 0
      OR ISNULL(opensales, 0) > 0
      OR ISNULL(otherdeptexp, 0) > 0
  );
GO

-- 2. Create dbo.dts_depo_threads for remarks & backtracking thread
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
GO

-- 3. Create dbo.dts_depo_attachments for category supporting documents
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
GO
