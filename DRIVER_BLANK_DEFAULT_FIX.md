# Driver default Forth & Back fix — v1.12

Blank Default Forth & Back KM now saves database NULL, which uses the existing 40 KM default under the normal trip eligibility/capping rules. Explicit 0 remains 0; explicit amounts are retained.

This applies to new driver registration and editing in Android and the portal. Editing a driver with NULL now shows an empty field instead of 0 or the text null.

The database save-function fix is already applied. No driver rows or trip amounts were changed by this fix. To restore NULL for a driver previously saved as 40, clear this field and save.

Install the signed v1.12 APK over the existing app and update the portal repository to get the corrected forms. If the v1.11 backend was already deployed, this fix does not require another backend deployment; the included backend ZIP keeps the SQL and regression tests synchronized. If not, deploy the included backend before using the new driver/user-management features.

Validation: 27 focused backend regression tests, 54 Android unit tests, production build, and browser checks for blank/null/zero passed. The database still denies direct public execution of the management function. The APK uses the existing production signing key.
