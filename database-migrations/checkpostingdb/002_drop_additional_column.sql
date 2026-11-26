IF COL_LENGTH(N'dbo.dts_hourly_entry', N'additional') IS NOT NULL
  ALTER TABLE dbo.dts_hourly_entry DROP COLUMN additional;