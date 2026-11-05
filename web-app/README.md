# Oracle Reporting Tool — Web Preview

This is a standalone React, TypeScript, and Vite application. It lives entirely in `web-app/`; the existing Electron desktop application remains the reference implementation and is not modified by the web app.

## Run locally

```powershell
cd web-app
npm install
npm run dev
```

Vite runs at `http://127.0.0.1:5174` (or the next available port). The local Vite development server exposes the authentication and report APIs, and uses the same desktop services for HQ `dts_location` login, Local POS/HQ readiness, Hourly Sales, and System Sales. It reads the existing database connection settings from the repository root `.env`; credentials remain in the server process and are never sent to the browser. Both Local POS and HQ databases must be reachable before sign-in is enabled.

The bundled API is for local development. A deployed web app still needs a server that implements the authentication contract below and the report routes; do not expose database connection settings in `VITE_*` variables or browser code.

```powershell
npm run typecheck
npm run build
```

## Authentication contract

The browser app never receives database credentials or a bearer token. In backend mode it uses same-origin requests (or `VITE_API_BASE_URL`) with `credentials: 'include'`:

| Method | Path | Expected response |
|---|---|---|
| `GET` | `/api/system/health` | `200 { "ready", "localDbConnected", "hqDbConnected", "message" }` |
| `GET` | `/api/auth/session` | `200 { "user": { "username", "displayName", "role", "locationName", "locationId" } }`; `401` when signed out |
| `POST` | `/api/auth/login` | `200` with the user object and a server-set session cookie; `401` for invalid credentials |
| `POST` | `/api/auth/logout` | `200` after the server invalidates the session cookie |

The local development API keeps session identifiers in memory and uses `HttpOnly`, `SameSite=Lax` cookies, same-origin checks, and per-client attempt limits. Production authentication still requires a deployed server implementation with an appropriate session store, secure cookies over HTTPS, CSRF protections, rate limiting, and credential verification against the existing identity source. The desktop app's SQL Server connection and credential handling must not be copied into browser code.

## Pages

- **Overview:** dashboard, Finance insight, and Insights.
- **Reports:** Hourly sales (overview, produce/waste records, daily report, monthly summary reports); System sales (sales summary, employee sales, POS sales, SC/PWD listing, tender listing, variance checking); Menu items; POS journal; Transactions; Reports.
- **Finance:** Remittance of funds and Deposit monitoring.
- **System:** Maintenance / menu item comparison.

Navigation, responsive layout, theme switching, and most report actions remain UI prototypes. Hourly sales is connected to the same desktop service: it loads live daily and monthly summaries, lists and edits production/waste records, saves transaction entries to the Local POS database, and queues/synchronizes entries to HQ. System Sales uses the desktop report pages and queries for sales summaries, POS workstations, employee sales, SC/PWD listings, tender listings, and variance details. Menu Items loads the desktop Sales Type and Summary reports with the same filters and totals. POS Journal loads receipts by business date or check number from the Local POS database, supports in-receipt text search, and opens the browser print dialog to save a receipt as PDF. ROF loads POS cash/non-cash source data and saved remittances, generates date-range summaries, and supports saving and deleting ROF records through the desktop service. Deposit Monitoring loads paginated HQ history, loads trusted ROF totals, supports deposit create/update/delete, and previews, downloads, and replaces FTP attachments using the browser file picker. Maintenance compares HQ menu items with Local POS and syncs confirmed missing items to Local POS. Excel reports download in the browser; System Sales PDF reports open the browser print dialog so they can be saved as PDF.

## Database boundary

The desktop SQL Server repositories and their current object names are catalogued in [`database/schema-reference.md`](./database/schema-reference.md). [`database/migrations/README.md`](./database/migrations/README.md) records the migration policy. The local Vite API calls the existing hourly service, whose save and synchronization paths run the same schema compatibility checks as desktop. Those paths can add or update hourly sync columns, indexes, and HQ tables when needed. System Sales, Menu Item, and POS Journal report APIs use existing read-only Local POS queries. ROF uses the desktop service for read and write operations against existing ROF tables. Deposit Monitoring calls the desktop deposit and FTP services for HQ records and attachments; attachment uploads are temporarily staged on the API server and removed after service completion. Maintenance uses the desktop repository queries to compare HQ items to Local POS and sync only currently missing items that were present in the user's loaded list. Other than the existing hourly operations, this web app does not run desktop startup schema checks or migrations.
