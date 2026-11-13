# Telecomax original web design — DEV API migration

## Repository contents

These repositories use the original uploaded web HTML, CSS, tables, filters, receipt cards, photo audit pages, and embedded export templates. The connection layer in `tmx/` translates the original page requests into the unified DEV API. 

The Vercel rewrites in `vercel.json` point to `https://telecomax-api-dev.vercel.app`. Database access and authorization are handled by that backend. Sign in with the current unified login name and four-digit PIN.

## Manual repository replacement

1. Extract the ZIP and open the folder matching the repository you are updating.
2. Copy its complete contents into that repository's root, including `tmx/`, assets, HTML files, and `vercel.json`.
3. Use the repository as a static Vercel site, with its root containing `index.html`. The pages need no compilation step.
4. Open a preview and verify your required roles and workflows before promoting the replacement.

Portal includes the original engineer KM and Custody pages under `/km/` and `/custody/`. Portal navigation uses those same-origin pages to share its authenticated session. KM and Custody also support direct login through their separate repositories. A separate website origin requires its own sign-in.

## Unified application behavior

- Engineer Balances combines Balances and Add Solfa using the original desktop panels.
- Users Managements provides Edit Users and Add Users, with unified roles, access, status, custody limit, base city, and four-digit PIN fields. Portal displays this card to Admin.
- Original PM and Finance review, rent payment, allowance, transfer, and export pages use the current backend operations and its permissions.
- KM Start and Finish submit trip data through the pending-photo API. The browser stores photo jobs locally and retries while the site is open and online. The Trip photos control displays per-trip Start and Finish status and offers retry.
- Static Hours uses the current backend calculation of ten KM-rate units per hour. Final stored amounts come from the backend.
- Uploaded receipts use the existing backend evidence upload service. Existing photos and receipts resolve through its evidence reads.
- Old browser trip state is separated from DEV trip state. Current DEV data is loaded after authentication.

## Verification performed

- Parsed 220 original inline scripts across 32 source pages.
- Compared all 289 original style blocks. The deliberate Balances/Solfa tab visibility adjustment is the only change within those original style blocks.
- Checked Portal login/dashboard, balance table, photo audit with trip images, custody review with a loaded receipt image, allowance page, and unified user tabs in a desktop browser using DEV reads.
- Checked Engineer KM/Custody data and sign-in, direct standalone KM/Custody login, PM Solfa access, and Admin-only user-management access.
- Checked user saves, Solfa, custody review, KM audit batches, receipt uploads, and Start/Finish background-photo retry through intercepted test requests.
- Checked all three API rewrite configurations and confirmed the restored pages contain no Apps Script endpoint URLs.

Business writes were simulated during verification. Actual financial submission, approval, payroll export locking, and transfer completion should be checked with an authorized test record in the preview. Authentication tests used real DEV sessions. Phone-browser layout and offline behavior were not exhaustively tested.

Finance Photo Audit now includes completed trips with every PM status. Ready to Transfer still requires both approvals. The audit card shows Static Hours between Total KM and Rate. Allowance filters and monthly working days use the trip dates and people in the selected months. Payroll amounts come from the allowance ledger.
