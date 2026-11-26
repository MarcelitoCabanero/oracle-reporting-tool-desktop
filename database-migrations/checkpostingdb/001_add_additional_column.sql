IF COL_LENGTH(N'dbo.dts_hourly_entry', N'additional') IS NULL
  ALTER TABLE dbo.dts_hourly_entry ADD additional NVARCHAR(100) NULL;