/**
 * Phase 2B-4B-6 — stocktake UI and staff-gated redirect wiring.
 */
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  adminAreaShouldRedirectOnUnauthorized,
  isStaffGatedAdminProcedure,
} from "@/lib/staffIdentity";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("stocktake staff identity UX", () => {
  const page = source("client/src/pages/admin/AdminStocktaking.tsx");

  it("does not treat a typed or static supervisor name as the actor", () => {
    expect(page).not.toContain("SUPERVISORS");
    expect(page).not.toContain("أدخل اسم المشرف المسؤول");
    expect(page).not.toContain("performedBy,");
    expect(page).not.toContain("setPerformedBy");
  });

  it("shows the authenticated stock manager and gates submission", () => {
    expect(page).toContain("staffAuth.me");
    expect(page).toContain("staffIdentityFromServer");
    expect(page).toContain('identity?.roles.includes("stock_manager")');
    expect(page).toContain("يلزم تسجيل هوية الموظف لاعتماد الجرد");
    expect(page).toContain("اعتماد الجرد متاح لأمين المخزون فقط");
    expect(page).toContain("identity?.name");
    expect(page).toContain("disabled={bulkAdjustMutation.isPending || !canAdjust}");
  });

  it("does not send performedBy on bulkAdjustForStocktaking", () => {
    const start = page.indexOf("bulkAdjustMutation.mutate");
    const call = page.slice(start, page.indexOf("});", start));
    expect(call).toContain("sessionRef:");
    expect(call).not.toContain("performedBy");
  });
});

describe("stocktake unauthorized redirect", () => {
  it("does not send a legacy admin session to login when staff identity is missing", () => {
    expect(isStaffGatedAdminProcedure("inventory.bulkAdjustForStocktaking")).toBe(true);
    expect(
      adminAreaShouldRedirectOnUnauthorized({
        data: { code: "UNAUTHORIZED", path: "inventory.bulkAdjustForStocktaking" },
      })
    ).toBe(false);
  });
});
