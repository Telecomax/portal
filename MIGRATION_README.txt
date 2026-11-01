Telecomax Portal migration-ready source package

Source: portal-updated-backends.zip
KM backend: https://script.google.com/macros/s/AKfycbxAInzadr2Er5LCH28IoK7TSZgi_53MT0mjDhMDRXWxEY08hQY7VVH_Q_WqSsGzVlhdbQ/exec
Custody backend: https://script.google.com/macros/s/AKfycbzA-CXfl2-BgUx-xi48SUikxryD6WH92bdN95vOMyoG0TuX444h3b4-q8zXD9F4amR0Hw/exec

No api/gas.js added. Android not modified.
KM service worker updated to network-first navigation to avoid stale index.html.

Deployment: Upload these files to the existing Portal Vercel project, retaining root-level paths. Redeploy, then reload browser with DevTools Disable cache enabled. In Application > Service Workers, unregister the old worker if needed. Confirm Network requests use the current backend IDs.

Note: These uploaded source files already contain the migrated URLs. This package does not change backend authentication logic. Verify deployment and browser cache; live functionality not verified.

Changed files: none (source already points to new backends)
