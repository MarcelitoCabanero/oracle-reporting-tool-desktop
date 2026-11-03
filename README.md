# React + TypeScript + Vite

## Hourly production and waste sync

Produce and waste entries are committed to the POS database first. Sync state is stored directly on `dbo.dts_produce` and `dbo.dts_waste`: `sync_id` identifies each row, `headq_synced_at` records successful synchronization, and `headq_sync_error` records the latest failure. The app retries pending rows to the `HEADQ` database on `192.168.5.201` at startup, after each save, and every minute. A unique `sync_id` on each HEADQ row makes retries safe after interruptions. The POS and HEADQ rows both receive `headq_synced_at` after sync; existing HEADQ rows with IDs and a null status are backfilled during schema setup. Rows already in the POS tables before these columns are installed remain without a `sync_id` and are not automatically uploaded. If an earlier app version created `dbo.hourly_entry_sync_outbox`, startup migrates its IDs and sync status to the corresponding POS rows, then drops the outbox table.

Configure `HEADQ_DB_SERVER`, `HEADQ_DB_DATABASE`, and `HEADQ_DB_PORT` in `.env`. The connection uses `HEADQ_DB_USER` and `HEADQ_DB_PASSWORD` when set, or falls back to the existing `HQ_DB_USER` and `HQ_DB_PASSWORD`. The HEADQ account needs permission to create/alter the produce and waste tables and indexes; the POS account needs permission to alter the produce and waste tables and create indexes.

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
