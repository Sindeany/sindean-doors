/**
 * Phase 2B-5A staff identity UI plumbing.
 * The panel is additive: it talks to staffAuth and does not own adminSession.
 */
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  adminAreaShouldRedirectOnUnauthorized,
  isStaffAuthProcedure,
  isStaffGatedAdminProcedure,
  staffBrowserStoragePlan,
  staffIdentityFromServer,
} from "@/lib/staffIdentity";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("staff identity display", () => {
  it("shows the identity returned by staffAuth.me", () => {
    expect(
      staffIdentityFromServer({
        name: "نورة",
        loginName: "noura",
        roles: ["stock_manager", "packing"],
      })
    ).toEqual({
      name: "نورة",
      loginName: "noura",
      roles: ["stock_manager", "packing"],
    });
  });

  it("shows no identity when staffAuth.me has no session", () => {
    expect(staffIdentityFromServer(null)).toBeNull();
    expect(staffIdentityFromServer(undefined)).toBeNull();
  });

  it("keeps a copy of the server role list", () => {
    const roles = ["sales_person"];
    const view = staffIdentityFromServer({
      name: "سارة",
      loginName: "sara",
      roles,
    });
    roles.push("admin");
    expect(view?.roles).toEqual(["sales_person"]);
  });
});

describe("staff session storage", () => {
  it("does not put the staff session in browser storage", () => {
    expect(staffBrowserStoragePlan()).toEqual({
      localStorage: [],
      sessionStorage: [],
      readableCookie: false,
    });
  });
});

describe("admin area redirects", () => {
  it("leaves the admin area in place when staff login is rejected", () => {
    expect(isStaffAuthProcedure("staffAuth.login")).toBe(true);
    expect(isStaffAuthProcedure("staffAuth.logout")).toBe(true);
    expect(isStaffAuthProcedure("adminAuth.logout")).toBe(false);
    expect(
      adminAreaShouldRedirectOnUnauthorized({
        data: { code: "UNAUTHORIZED", path: "staffAuth.login" },
      })
    ).toBe(false);
    expect(
      adminAreaShouldRedirectOnUnauthorized({
        data: { code: "UNAUTHORIZED", path: "staffAuth.logout" },
      })
    ).toBe(false);
  });

  it("still redirects when a legacy admin mutation loses its session", () => {
    expect(
      adminAreaShouldRedirectOnUnauthorized({
        data: { code: "UNAUTHORIZED", path: "orders.updateStatus" },
      })
    ).toBe(true);
    expect(
      adminAreaShouldRedirectOnUnauthorized({
        data: { code: "UNAUTHORIZED", path: "inventory.list" },
      })
    ).toBe(true);
  });

  it("keeps the admin area open when addTransaction lacks a staff session", () => {
    expect(isStaffGatedAdminProcedure("inventory.addTransaction")).toBe(true);
    expect(isStaffGatedAdminProcedure("inventory.bulkAdjustForStocktaking")).toBe(true);
    expect(isStaffGatedAdminProcedure("inventory.list")).toBe(false);
    expect(
      adminAreaShouldRedirectOnUnauthorized({
        data: { code: "UNAUTHORIZED", path: "inventory.addTransaction" },
      })
    ).toBe(false);
    expect(
      adminAreaShouldRedirectOnUnauthorized({
        data: { code: "FORBIDDEN", path: "inventory.addTransaction" },
      })
    ).toBe(false);
    expect(
      adminAreaShouldRedirectOnUnauthorized({
        data: { code: "UNAUTHORIZED", path: "inventory.bulkAdjustForStocktaking" },
      })
    ).toBe(false);
  });
});

describe("staff identity UI wiring", () => {
  const panel = source("client/src/components/admin/StaffIdentityControl.tsx");
  const layout = source("client/src/components/admin/AdminLayout.tsx");
  const loginPage = source("client/src/pages/admin/AdminLogin.tsx");
  const root = source("client/src/main.tsx");

  it("logs in, reads me, and logs out through staffAuth", () => {
    expect(panel).toContain("trpc.staffAuth.login.useMutation");
    expect(panel).toContain("trpc.staffAuth.me.useQuery");
    expect(panel).toContain("trpc.staffAuth.logout.useMutation");
    expect(panel).toContain("staffIdentityFromServer(me.data)");
    expect(panel).toContain("login.mutate({ loginName: name, password })");
    expect(panel).not.toContain("login.mutate({ loginName: name, password, roles");
  });

  it("does not read or store the staff cookie", () => {
    expect(panel).not.toContain("localStorage");
    expect(panel).not.toContain("sessionStorage");
    expect(panel).not.toContain("document.cookie");
    expect(panel).not.toContain("adminAuth");
    expect(panel).not.toContain("clearAdminToken");
  });

  it("adds the control beside the existing admin logout", () => {
    expect(layout).toContain("<StaffIdentityControl />");
    expect(layout).toContain("handleAdminLogout");
    expect(layout).toContain("clearAdminToken");
  });

  it("leaves the legacy admin login page on adminAuth", () => {
    expect(loginPage).toContain("trpc.adminAuth.login.useMutation");
    expect(loginPage).not.toContain("staffAuth");
  });

  it("does not treat a staff auth failure as an expired admin session", () => {
    expect(root).toContain("adminAreaShouldRedirectOnUnauthorized");
  });
});
