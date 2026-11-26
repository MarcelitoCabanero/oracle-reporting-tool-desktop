# Database migrations

Add one numbered `.sql` file for each schema change. The app applies each file once per database and records it in `dbo.app_schema_migrations`.

- `checkpostingdb/` runs against the local CheckPostingDB connection.
- `oracledb/` runs against the configured hourly sync destination (the app's SQL Server database named OracleDB).

Example filename: `001_add_additional_column.sql`.

Write SQL Server T-SQL without `GO` batch separators. Put the migration in both folders if both databases need the same change. Add the file before building the patch; packaged updates include this folder and run pending migrations when hourly sync/schema setup next runs. Use idempotent SQL where possible so a failed migration can be safely retried.
