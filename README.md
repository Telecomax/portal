# Telecomax Operations Portal

Copy the contents of this folder to the root of the matching repository, including web/ and vercel.json. On Vercel choose Other (static), repository root, no build command or output override. Deploy as a preview first. Each of the three projects runs independently. Opening a downloaded HTML file directly does not run the backend proxy.

Sign in with your existing DEV login and four-digit PIN. The portal opens KM and Custody cards on its own origin so one login covers the workflow. Visiting a separately hosted project starts its own session. API traffic goes through the four Vercel rewrites to the Telecomax DEV backend, which enforces permissions and reads and writes the shared Supabase database.

Trip photos resume from this browser when it is open and signed in to the submitting account. Financial amounts are calculated by the backend. Use the same browser for an unconfirmed submission. Old sheet-backed browser drafts and offline queues are not imported. Complete any outstanding legacy submissions before switching sites.
