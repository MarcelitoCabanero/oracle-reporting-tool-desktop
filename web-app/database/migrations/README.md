# Web application migration history

This directory is the reserved location for future, ordered backend database migrations. It intentionally contains no executable SQL in this phase.

The web application is currently a frontend-only prototype with a same-origin authentication API contract but no backend, configured database engine, or requirement for new tables. The existing Electron app owns its SQL Server connections and startup schema checks. Duplicating those operations as web migrations, or creating speculative tables for a backend that does not exist yet, could change an existing production schema or cause incompatible data structures.

When backend integration is approved:

1. Confirm the target database and inspect the authoritative schema, constraints, and indexes.
2. Add a numbered, idempotent and non-destructive migration here only for a reviewed schema change.
3. Keep credentials and execution server-side; never expose them as `VITE_*` variables.
4. Test against a disposable database before any deployment; do not run migrations as part of the frontend.
