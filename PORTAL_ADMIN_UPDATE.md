# Portal update — 10 November 2026

Replace your portal repository contents with this full repository and redeploy the portal. Android does not need updating for these portal changes.

- Admin dashboard: App Rates, with project KM rates, Engineer allowances and Driver allowances.
- Current rate edits create a future schedule. Unused future schedules support editing/deletion. Historical rates remain protected.
- Users Managements: Add Users, Edit Users, Add Driver, Edit Driver; full names and Rigger supported.
- Add Driver opens blank without fetching drivers. Edit Driver includes autocomplete, historical vehicle correction and deletion with history retained. Blank Forth & Back stays null (40 KM fallback).
- Save operations show progress and results.
- PM and Finance Photo Audit now show Edit KM. Stage corrections, then use Save Changes as before.

The matching database permission change was applied to the connected Telecomax database on 10 November 2026. No trip amounts, rates, users or driver records were altered during verification. The separate pm-finance-edit-km.sql file is an idempotent backup of that migration; it does not need to be run again on this database.

Validation: local browser tests with mock data covered driver navigation/autocomplete, null defaults, rate creation/edit, allowance save, role gating, mobile layout, and PM/Finance Edit KM save requests. Desktop/mobile screenshots were inspected. Live database checks used nonexistent trip IDs in a rolled-back transaction: PM/Finance passed the permission gate, and an Engineer-only account was rejected. Real financial writes were not used for testing.
