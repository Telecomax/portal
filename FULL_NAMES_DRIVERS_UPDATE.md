# Telecomax 1.11 â€” full names and driver vehicles

## Update order

1. Replace the contents of `telecomax-api-dev` with the supplied backend repository and deploy that Vercel project. Keep its existing environment variables.
2. Replace the contents of the portal repository with the supplied portal repository and deploy it. Its API connection remains `https://telecomax-api-dev.vercel.app`.
3. Install `Telecomax_Engineer_1.11_Production.apk` over the existing app. It uses the same production package and signing certificate. Do not uninstall first.

The database updates described below are **already applied** to the current Tmx Operations Supabase project. Do not rerun old migrations or payroll imports. The SQL files in the backend repository document the new schema/functions; no additional database step is required for this project.

The backend and portal have been prepared locally, not deployed by this update. The APK requires the new backend routes for driver management and payroll-name exports.

## Completed database changes

- Added `tmx_users.full_name`, separate from `display_name` and `login_name`.
- Imported all 32 supplied full names, matched by login. The confirmed `abdelrahman mohamed` sheet entry was assigned to the existing `abdelrahman mohamed abdelgawad` account.
- Kept the spreadsheet's spelling. Display names, login names, PINs and canonical trip ownership were not changed by the import.
- The two accounts not present in the sheet (`dev.engineer` and `test test`) still have no payroll full name. If their records need exporting, set a full name first.
- Corrected Osama Fathi's vehicle from the actual stored `Øµ Ø£ ÙŠ 8039` to `Øµ Ø§ ÙŠ 8939` in the driver configuration and all seven matching trips (six completed and one in progress when corrected).
- Verified that the correction changed no forth-and-back KM, total KM, benzine amount or rent/payment amounts. Seven audit entries record the correction. No trips remain with that old plate.

## Full names and exports

In Users Managements â†’ Edit Users â†’ Edit / Reset PIN, enter the **Full name (payroll exports)** and save. The same field is required in Add Users.

The app and portal continue showing compact display names. Exports resolve full names at export time, including old trips whose canonical engineer name differs from the current display name. Existing downloaded Excel files are not retroactively changed.

Updated export paths include Photo Audit, approved KM summaries, Rent History, allowances/payroll, custody expense/transfer spreadsheets and transfer templates. Known user names in Paid By columns also resolve to payroll names. Driver names remain driver names.

If an engineer's name cannot be matched uniquely to a user with a full name, the export displays an actionable error instead of silently exporting an incorrect payroll name. For allowance exports, this check happens **before** payroll locking.

## Drivers and vehicle IDs

Users Managements â†’ **Add Driver** is available to Admin, not PM or Finance.

### Add a driver

Enter the driver name, vehicle IDs (one per line), default vehicle ID, base city, default forth-and-back KM, and Active status. Leaving Default vehicle ID empty selects the first listed vehicle.

### Add another vehicle to an existing driver

Search for the driver and choose Edit. Add another line to Vehicle IDs. Leave the two correction fields empty. Save. Both vehicles remain selectable in Start Trip after refreshing the configuration/reopening the screen; signing in again also refreshes configuration.

### Correct a mistyped vehicle ID

Search for the driver and choose Edit. Enter the exact stored plate under Old vehicle ID and its replacement under Correct vehicle ID. Save. The app replaces it in the vehicle list/default selection and historical trips in one transaction, with an audit trail. Existing financial values are preserved.

Do not use correction to add a different physical vehicle. Add another line instead. Forth-and-back continues following the selected vehicle ID, not just the driver name. Histories for different vehicles stay separate.

If a correction would merge two existing vehicle histories or affect a plate used by another driver, it is refused for review. Concurrent edits require refreshing the driver before saving. Driver names are fixed when editing; this avoids silently changing historical driver identity.

## Verification

- Backend: 164 tests passed, including seven tests covering full names, role restrictions, multiple vehicles, stale edits, idempotent retries and historical plate corrections.
- Android: production release build succeeded; 54 unit tests passed. Production signature matches the existing Telecomax certificate.
- Browser fixtures: Add/Edit User, Add/Edit Driver, multiple vehicles, historical-correction payload, missing-name errors and all-result exports passed.
- Inspected downloaded summary and rent Excel contents: payroll full names were present; rent contained all 66 matching detail rows with only 31 visible in the UI.
- Parsed 262 JavaScript modules/embedded scripts successfully.
- Live database: verified 32 populated payroll names, plate correction, audit rows, and private execute permissions for the new functions.

No test transactions were submitted through the live app. Physical-device interaction and deployed backend/portal smoke testing remain to be checked after updating the repositories.

The Supabase advisor reports an existing `pg_net` extension-in-public warning and informational RLS-without-policy notices for server-only tables. This update does not grant public table/function access. [Supabase extension warning guidance](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).
