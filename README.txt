TELECOMAX OPERATIONS PORTAL V1

Purpose
- One entry login for access detection across the existing KM and Custody backends.
- Role-aware dashboard.
- Existing production apps, Apps Script deployments and Google Sheets remain unchanged.

Deploy
1. Create a NEW Vercel project (recommended name: telecomax-operations).
2. Upload/deploy index.html from this package.
3. Do NOT replace the current KM or Custody projects.
4. Test Engineer, PM, Finance and Admin accounts.

Important
V1 is the safe shell milestone. It verifies credentials/access centrally but opens the existing apps on their current domains. Because browser sessionStorage cannot be shared across different Vercel domains, those existing apps may request login again. True one-login SSO is the next phase and requires adding a portal-issued session handoff to both applications.

