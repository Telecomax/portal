TELECOMAX OPERATIONS PORTAL V2 — CENTRAL LOGIN

WHAT CHANGED
- V1 could make several sequential login calls.
- V2 makes ONE request: action=portalLogin to the Custody backend.
- Management role, KM Access and Custody Access come directly from the central Users sheet.
- Engineer login uses the existing Custody Engineer credentials.
- Current KM and Custody production applications are NOT modified yet.
- True module SSO is reserved for V3.

DEPLOYMENT — DO THIS IN ORDER

A) GOOGLE APPS SCRIPT
1. Open the CURRENT Custody Apps Script project.
2. Back up the current Code.gs.
3. Replace Code.gs with Code_Custody_V2_Central_Portal_Login.gs.
4. Save.
5. Deploy > Manage deployments > Edit.
6. Version: New version.
7. Deploy.
8. Keep the SAME Web App URL.

B) VERCEL PORTAL
1. Open the NEW Telecomax Operations V1 Vercel project you already tested.
2. Replace its index.html with this V2 index.html.
3. Commit / deploy.
4. Do NOT modify telecomaxkm.vercel.app or custody-orcin.vercel.app yet.

C) TEST
Test one account from each category:
- Admin
- PM
- Finance
- Engineer

EXPECTED
- Login should be much faster than V1 because it uses one Apps Script authentication request.
- Dashboard should show only KM/Custody modules allowed by the central account.
- Opening a module can still ask for its own login. That is expected until V3 SSO.
