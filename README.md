# React + TypeScript + Vite

## Login database

Login credentials are checked against `dbo.dts_location` in the local POS database configured by `LOCAL_DB_SERVER`, `LOCAL_DB_DATABASE`, `LOCAL_DB_USER`, `LOCAL_DB_PASSWORD`, and `LOCAL_DB_PORT` in `.env`. Set `LOCAL_DB_DATABASE=checkpostingdb` when that is the database containing the login table. The HQ database is not used for login; an HQ connection issue does not prevent local database login.

## Windows installer and updates

Create a Windows x64 NSIS installer locally with `npm run dist:win`; the installer is written to `release/`. The packaged app loads its local production UI and keeps per-device connection settings in Electron user data.

To publish an update, increment the `version` in `package.json`, commit and push the changes, then push a matching version tag (for example, `v1.0.1`). The GitHub Actions workflow builds the installer and publishes the installer and update metadata to a GitHub Release. Installed apps check the public GitHub Releases feed, download updates in the background, and offer a **Restart to update** action; installation and app restart happen when the user selects it. No one needs to download and run the installer again. Windows code signing is not configured, so Windows may show an unverified-publisher warning during initial installation.

## Connection settings

When the local POS database cannot be reached or its `dts_location` login table is missing, the login screen offers connection setup and local table initialization before sign-in. After login, users with the `admin` role can open Settings from the sidebar and must re-enter an active admin password to unlock it. Settings manage two SQL Server configurations: local POS and HQ. OracleDB, HEADQ, and hourly reporting use the same HQ server, port, username, and password, with their own database names. Each database still needs to exist and grant that account access. FTP settings are also available. Saved credentials are encrypted with Electron `safeStorage` in the application user-data directory; passwords are never returned to the settings form, and leaving a password field blank preserves its saved value. Existing `.env` values are used as defaults until settings are saved.

The setup panel reads active store names from `dbo.dts_location` on the configured OracleDB (hourly database connection). Select the stores to add to the local `checkpostingdb`; the active admin account is copied automatically so future admin settings access remains available. The POS table setup drops and recreates local `dbo.dts_location`, `dbo.dts_produce`, and `dbo.dts_waste` as one transaction. This permanently deletes existing data in those tables, so the app requires an explicit confirmation before running it.

## Hourly production and waste sync

Produce and waste entries are committed to the POS database first. Sync state is stored directly on `dbo.dts_produce` and `dbo.dts_waste`: `sync_id` identifies each row, `headq_synced_at` records successful synchronization, and `headq_sync_error` records the latest failure. The app retries pending rows to the `HEADQ` database at startup, after each save, and every minute. A unique `sync_id` on each HEADQ row makes retries safe after interruptions. The POS and HEADQ rows both receive `headq_synced_at` after sync; existing HEADQ rows with IDs and a null status are backfilled during schema setup. Rows already in the POS tables before these columns are installed remain without a `sync_id` and are not automatically uploaded. If an earlier app version created `dbo.hourly_entry_sync_outbox`, startup migrates its IDs and sync status to the corresponding POS rows, then drops the outbox table.

The `HEADQ` connection reuses `HQ_DB_SERVER`, `HQ_DB_PORT`, `HQ_DB_USER`, and `HQ_DB_PASSWORD`, selecting the database named by `HEADQ_DB_DATABASE` (default `HEADQ`). The HQ account needs permission to access `HEADQ` and create/alter the produce and waste tables and indexes; the POS account needs permission to alter the produce and waste tables and create indexes.

Check synchronization directly on the POS server:

```sql
SELECT produce_id, sync_id, headq_synced_at, headq_sync_error
FROM dbo.dts_produce
WHERE sync_id IS NOT NULL
ORDER BY produce_id DESC;

SELECT waste_id, sync_id, headq_synced_at, headq_sync_error
FROM dbo.dts_waste
WHERE sync_id IS NOT NULL
ORDER BY waste_id DESC;
```

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
