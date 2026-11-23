USE [CheckPostingDB]
GO

IF OBJECT_ID(N'dbo.dts_summary_input', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.dts_summary_input
    (
        entry_id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_dts_summary_input PRIMARY KEY,
        locationname VARCHAR(50) NOT NULL,
        date_from DATE NOT NULL,
        date_to DATE NOT NULL,
        promotions_ring DECIMAL(18,4) NULL,
        promotions_shell DECIMAL(18,4) NULL,
        training_ring DECIMAL(18,4) NULL,
        training_shell DECIMAL(18,4) NULL,
        staff_meal_ring DECIMAL(18,4) NULL,
        staff_meal_shell DECIMAL(18,4) NULL,
        waste_dough_grams_ring DECIMAL(18,4) NULL,
        waste_dough_grams_shell DECIMAL(18,4) NULL,
        waste_frozen_dough_ring DECIMAL(18,4) NULL,
        waste_frozen_dough_shell DECIMAL(18,4) NULL,
        buffer_jpops_ring DECIMAL(18,4) NULL,
        buffer_jpops_shell DECIMAL(18,4) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_dts_summary_input_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_dts_summary_input_updated_at DEFAULT (SYSUTCDATETIME()),
        sync_id UNIQUEIDENTIFIER NULL CONSTRAINT DF_dts_summary_input_sync_id DEFAULT (NEWID()),
        headq_synced_at DATETIME2(7) NULL,
        headq_sync_error NVARCHAR(1000) NULL,
        CONSTRAINT CK_dts_summary_input_date_range CHECK (date_from <= date_to)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.dts_summary_input') AND name=N'UX_dts_summary_input_period')
    CREATE UNIQUE INDEX UX_dts_summary_input_period ON dbo.dts_summary_input(locationname, date_from, date_to);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.dts_summary_input') AND name=N'UX_dts_summary_input_sync_id')
    CREATE UNIQUE INDEX UX_dts_summary_input_sync_id ON dbo.dts_summary_input(sync_id) WHERE sync_id IS NOT NULL;
GO
