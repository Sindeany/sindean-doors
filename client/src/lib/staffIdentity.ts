/**
 * Staff identity is read from staffAuth.me.
 * The staffSession cookie is HttpOnly, so this module never reads or stores it.
 */

export type StaffMeIdentity = {
  name: string;
  loginName: string;
  roles: readonly string[];
};

/** Dispatched to open the header Staff Identity panel without reading cookies. */
export const STAFF_IDENTITY_OPEN_EVENT = "staff-identity:open";

export function isStaffAuthProcedure(path: string | undefined): boolean {
  return typeof path === "string" && path.startsWith("staffAuth.");
}

/** Staff-gated mutations inside the legacy admin area. A missing staffSession must not expire adminSession. */
const STAFF_GATED_ADMIN_PROCEDURES = new Set([
  "inventory.addTransaction",
  "inventory.bulkAdjustForStocktaking",
]);

export function isStaffGatedAdminProcedure(path: string | undefined): boolean {
  return typeof path === "string" && STAFF_GATED_ADMIN_PROCEDURES.has(path);
}

/**
 * A missing or rejected staffSession must not send the operator back to
 * the legacy admin login. Other unauthorized admin mutations still do.
 */
export function adminAreaShouldRedirectOnUnauthorized(error: unknown): boolean {
  const data = (error as { data?: { code?: string; path?: string } } | null)?.data;
  if (data?.code !== "UNAUTHORIZED") return false;
  if (isStaffAuthProcedure(data.path)) return false;
  if (isStaffGatedAdminProcedure(data.path)) return false;
  return true;
}

export function staffIdentityFromServer(
  me: StaffMeIdentity | null | undefined
): StaffMeIdentity | null {
  if (!me) return null;
  return {
    name: me.name,
    loginName: me.loginName,
    roles: [...me.roles],
  };
}

/** Nothing about the staff session belongs in browser storage. */
export function staffBrowserStoragePlan(): {
  localStorage: readonly string[];
  sessionStorage: readonly string[];
  readableCookie: false;
} {
  return {
    localStorage: [],
    sessionStorage: [],
    readableCookie: false,
  };
}
