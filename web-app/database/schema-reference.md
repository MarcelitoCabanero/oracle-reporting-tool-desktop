# Existing database reference

This document records the objects referenced by the existing desktop repositories to guide later backend work. The web preview does not connect to any database, and this file is not a DDL specification. The desktop repository remains the source of truth for full column types, keys, constraints, indexes, and database-specific behavior.

## Objects identified in desktop code

| Feature | Existing objects referenced | Desktop implementation |
|---|---|---|
| User authentication | `dbo.dts_location` | [`electron/auth/auth.repository.ts`](../../electron/auth/auth.repository.ts) |
| Hourly produce / waste and synchronization metadata | `dbo.dts_produce`, `dbo.dts_waste`; existing reporting views including `dbo.v_donutsold` and `dbo.v_itemdetail` | [`electron/hourly-sales/hourly-sales.repository.ts`](../../electron/hourly-sales/hourly-sales.repository.ts) |
| Remittance of funds | `dbo.dts_rof_header`, `dbo.dts_rof_cash`, `dbo.dts_rof_noncash`, `dbo.v_summary_ROF`, `dbo.v_salesdetails` | [`electron/rof/rof.repository.ts`](../../electron/rof/rof.repository.ts) |
| Deposit monitoring | `dbo.dts_depo` | [`electron/deposit/deposit.repository.ts`](../../electron/deposit/deposit.repository.ts) |
| Sales, employee, tender, discount, and workstation reports | `dbo.v_salesdetails`, `dbo.EMPLOYEE`, `dbo.CHECKS`, `dbo.dts_workstation`, `dbo.FCR_INVOICE_DATA` | [`electron/system-sales/system-sales.repository.ts`](../../electron/system-sales/system-sales.repository.ts), [`electron/employee-sales/employee-sales.repository.ts`](../../electron/employee-sales/employee-sales.repository.ts), [`electron/sc-pwd/sc-pwd.repository.ts`](../../electron/sc-pwd/sc-pwd.repository.ts) |
| Menu catalog | `dbo.v_menuitem_summary` | [`electron/menuitem/menuitem.repository.ts`](../../electron/menuitem/menuitem.repository.ts) |
| POS journal | `dbo.POS_JOURNAL_LOG` | [`electron/posjournal/pos-journal.repository.ts`](../../electron/posjournal/pos-journal.repository.ts) |

The existing hourly repository declares the `dts_produce` and `dts_waste` columns when it initializes the HEADQ-side tables and maintains synchronization columns/indexes on the desktop's POS and HEADQ connections. Those runtime operations belong to the desktop application and are intentionally not copied or invoked here. Other listed objects are queried or written by existing desktop modules; their complete definitions are not owned by this UI migration.

## Migration compatibility rules

- Keep existing table names, columns, key relationships, indexes, and business fields intact.
- Do not point web development tooling at a production POS or HQ database.
- Do not infer or regenerate DDL for an object whose authoritative schema is not present in the repository.
- Add future backend migrations as reviewed, ordered, additive scripts in `database/migrations/`, with an explicit target engine and rollback/operational notes. Never make a UI build execute a migration.
