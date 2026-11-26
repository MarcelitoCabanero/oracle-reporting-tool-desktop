# Oracle Reporting Tool Desktop

Desktop reporting, synchronization, and store operations management application built with **Electron**, **React 19**, **TypeScript**, **Vite**, and **SQL Server (`mssql`)**.

---

## Key Features & Modules

### 1. Authentication & Local POS Provisioning
- **Local POS Login**: Credentials are verified against `dbo.dts_location` in the local POS database (`checkpostingdb`). Login does not depend on HQ database availability, allowing store operations to continue during network or HQ outages.
- **Pre-Login Setup & Provisioning**: If the local POS database cannot be reached or `dbo.dts_location` is missing, the login screen offers connection setup and one-click POS table provisioning.
- **Role-Based Access**: Users with the `admin` role can access **Settings** from the sidebar (protected by an active admin password prompt).
- **Theme Support**: Toggle between Light and Dark mode from the collapsible sidebar.

### 2. Connection Settings & Auto-Updates
- **Database Connections**: Manages SQL Server configurations for:
  - **Local POS** (`LOCAL_DB_*`, default database `checkpostingdb`)
  - **HQ / OracleDB** (`HQ_DB_*`, default database `OracleDB`)
  - **HEADQ** (`HEADQ_DB_DATABASE`, shares HQ server, port, username, and password)
  - **Hourly Reporting** (`HOURLY_DB_*`, independent connection config for hourly sync and location lookup)
- **FTP Configuration**: Configures FTP host, credentials, and secure mode (`basic-ftp`) with built-in connection testing.
- **Encrypted Credential Storage**: Saved settings are encrypted on disk in Electron `userData` (`connection-settings.bin`) via Electron `safeStorage`. Passwords are never returned to the UI, and leaving a password field blank preserves the existing saved secret. `.env` values act as defaults until settings are saved.
- **Local Table Provisioning**: During connection setup, creates missing local tables and copies active `admin` account(s) from OracleDB so an administrator can sign in. After login, the administrator can assign one POS store from active OracleDB `dbo.dts_location` rows whose `access` is `Store`; assigning it replaces local non-admin location rows while preserving admin accounts and existing `dbo.dts_hourly_entry` / `dbo.dts_summary_input` records.

### 3. Hourly Sales, Production, Waste & Stock Transfers
- **Unified Hourly Entry (`dbo.dts_hourly_entry`)**: Consolidates production (`produce`), waste (`waste`), and stock transfers (`transfers`) for Shell, Ring, and J.Pops quantities into a single table on both the local POS (`checkpostingdb`) and remote hourly (`OracleDB`) databases.
- **Automated POS Sales, J.Club & FOC Waste Integration**: Tracks hourly POS sales, J.Club sales, batch calculations, production allocation, and automated POS FOC waste metrics.
- **Hourly Daily & Summary Reports**:
  - **Entry & Records Management**: Create, view, and update hourly produce, waste, and transfer records.
  - **Daily & Multi-Day Summary Views**: Rollup inventory calculations incorporating beginning inventory, production, transfers, POS sales, waste, ending inventory, and variance.
- **Database-Persisted Donut Summary Inputs (`dbo.dts_summary_input`)**:
  - Persists manual summary inputs (`promotions_ring/shell`, `training_ring/shell`, `staff_meal_ring/shell`, `waste_dough_grams_ring/shell`, `waste_frozen_dough_ring/shell`, `buffer_jpops_ring/shell`) per store and date range in `checkpostingdb` and syncs them to `OracleDB`.
  - Automatically migrates legacy `localStorage` summary inputs to the database and aggregates daily inputs across multi-day ranges when an exact range override is not present.
- **Resilient Background Synchronization**:
  - Entries and summary inputs commit to the local POS database first with a `sync_id` (`UNIQUEIDENTIFIER`), `headq_synced_at`, and `headq_sync_error`.
  - The app syncs pending rows immediately after save, at startup, and every minute in the background.
  - Legacy `dbo.dts_produce`, `dbo.dts_waste`, and `dbo.hourly_entry_sync_outbox` rows are automatically migrated into `dbo.dts_hourly_entry`.

### 4. System Sales & Hybrid HQ / Local DB Reporting
- **Hybrid Date-Split Query Engine**: For `v_salesdetails`-backed reports, the app inspects date coverage in HQ (`OracleDB`) and automatically splits date ranges to pull synced dates from HQ and unsynced/recent dates from the Local POS database, merging results seamlessly.
- **Sales Summary & POS Workstation Sales**: View and export store sales summaries or workstation-level POS sales (`workstationMode`) with formatted Excel and PDF exports.
- **Employee Sales & Variance Checking**: Analyze employee sales and check variances between POS and synced records, automatically excluding `±0.01` rounding differences from variance flags.
- **SC / PWD Listing**: Filter Senior Citizen and PWD discount transactions by date range and search terms, with formatted Excel and PDF export.
- **Tender Listing**: Filter and search tender breakdowns across date ranges.
- **Void Summary Report**: Inspect and export voided invoices and cancelled line items with search, filtering, and Excel export.

### 5. Deposit Monitoring, Approvals, Threads & Petty Cash
- **Deposit Tracking**: Record and monitor bank deposits with attachment uploads via FTP/local handling.
- **Approval Workflow**: Tracks deposit approval status (`approval_status`, `approved_by`, `approved_at`) so reviewers can approve or manage submitted deposits.
- **Deletion Request & Approval Workflow**: Supports requesting deposit deletion with justification and an admin/approver confirmation workflow (`delete_status`, `delete_approved_at`, etc.).
- **Petty Cash Management**: Tracks petty cash status and replenishment timestamps (`petty_cash_status`, `replenished_at`) alongside deposits.
- **Discussion Threads & Attachments**: Dedicated tables for deposit threads and attachments allow store and HQ users to exchange remarks and supporting documents on individual deposit records.

### 6. Real-Time Header Notification System
- **Missing Menu Items Alert**: Background polling (on login, every 15 minutes, and on manual refresh) checks for missing menu items requiring synchronization and links directly to the **Maintenance** page.
- **Deposit Approval & Deletion Notifications**: Polls deposit status updates for the active store location, tracks seen/unread notification signatures in `localStorage` per location, and allows marking individual or all notifications as read or jumping straight to the **Deposit** page.

### 7. Additional Store Operations Modules
- **Remittance of Funds (ROF)**: Manage ROF summaries, cash sources, and details (backed by HQ database pools for summary and cash source queries, plus hybrid date-split support and state caching).
- **POS Journal**: Query POS journal entries with dark-mode optimized date pickers and PDF export.
- **Menu Item Analysis**: Analyze menu item sales performance with tab state caching and export tools.
- **Maintenance & Data Synchronization**: Synchronize missing menu items and store data between local POS, HQ databases, and FTP.

---

## Database Verification Queries

Check hourly entry and summary input synchronization directly on the local POS SQL Server (`checkpostingdb`):

```sql
SELECT entry_id, category, time_value, entry_date, sync_id, headq_synced_at, headq_sync_error
FROM dbo.dts_hourly_entry
WHERE sync_id IS NOT NULL
ORDER BY entry_id DESC;

SELECT entry_id, locationname, date_from, date_to, sync_id, headq_synced_at, headq_sync_error
FROM dbo.dts_summary_input
WHERE sync_id IS NOT NULL
ORDER BY entry_id DESC;
```

---

## Environment Variables (`.env`)

Copy `.env.example` to `.env` for local defaults (overridden when settings are saved in the app UI):

```env
# LOCAL POS DATABASE (login reads dbo.dts_location from this database)
LOCAL_DB_SERVER=POS2
LOCAL_DB_DATABASE=checkpostingdb
LOCAL_DB_USER=sa
LOCAL_DB_PASSWORD=
LOCAL_DB_PORT=

# HQ DATABASE
HQ_DB_SERVER=
HQ_DB_DATABASE=OracleDB
HQ_DB_USER=
HQ_DB_PASSWORD=
HQ_DB_PORT=

# Remote databases
HEADQ_DB_DATABASE=HEADQ
HOURLY_DB_DATABASE=OracleDB

DB_ENCRYPT=
DB_TRUST_SERVER_CERTIFICATE=
```

---

## Development, Windows Installer & Auto-Updates

### Development Scripts
- `npm run dev` — Starts Vite dev server and launches Electron with hot reload.
- `npm run build` — Compiles TypeScript (`tsc -b`), builds the Vite renderer bundle, and compiles the Electron main/preload scripts.
- `npm run lint` — Runs ESLint across the codebase.
- `npm run dist:win` — Builds a Windows x64 NSIS installer locally into `release/`.

### Publishing Updates
1. Increment `"version"` in `package.json` (currently `1.1.1`).
2. Commit and push the changes, then push a matching version tag (e.g. `v1.1.1`).
3. The GitHub Actions workflow builds the Windows NSIS installer and publishes the installer and `electron-updater` metadata to GitHub Releases.
4. Installed apps check the GitHub Releases feed, download updates in the background, and display a **Restart to update** action without requiring manual reinstallation.

