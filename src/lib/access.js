// ── Page access control ───────────────────────────────────────────────────────
// The router rendered every page purely on the `page` state, so an admin-only
// page (settings, banking, VAT, credit control, admin reports, …) would render
// for anyone who set `page` to it — the nav only *hid* the links. This gates the
// render itself.
//
// canViewPage returns whether the current role may see `page`:
//   - non-admin pages → always allowed
//   - admin-only page → only "admin"/"manager"
//   - unknown/missing role → allowed, to avoid locking out a legitimate admin
//     whose profile row is missing (the app already treats a missing profile as
//     privileged elsewhere). Only a CONFIRMED non-admin role is blocked, which is
//     exactly the exposure being closed.
export const PRIVILEGED_ROLES = ["admin", "manager"];

export const canViewPage = (page, role, adminPages) => {
  if (!adminPages || !adminPages.has(page)) return true;
  if (!role) return true;
  return PRIVILEGED_ROLES.includes(role);
};
