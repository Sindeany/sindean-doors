/**
 * Phase 2B-5B-2 staff management UI — helpers and wiring.
 */
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  STAFF_ROLE_IDS,
  STAFF_ROLE_LABELS_AR,
  staffRoleLabelAr,
} from "@/lib/staffRoles";
import {
  adminRoleLockedForSelf,
  canOfferDeactivate,
  canToggleAdminRoleForUser,
  requiresDeactivateConfirmation,
  safeStaffManagementErrorMessage,
  staffManagementAccessFromMe,
  validateCreateStaffInput,
  validateRoleSelection,
} from "@/lib/staffManagementUi";
import { staffBrowserStoragePlan } from "@/lib/staffIdentity";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("staff management access states", () => {
  it("requires staff identity when staffAuth.me has no session", () => {
    expect(staffManagementAccessFromMe(null, "error")).toBe("needs_staff_identity");
    expect(staffManagementAccessFromMe(undefined, "error")).toBe("needs_staff_identity");
  });

  it("denies management without admin role", () => {
    expect(
      staffManagementAccessFromMe({ roles: ["stock_manager", "packing"] }, "success")
    ).toBe("forbidden");
  });

  it("allows management for explicit admin role", () => {
    expect(staffManagementAccessFromMe({ roles: ["admin"] }, "success")).toBe("admin");
  });
});

describe("staff role labels", () => {
  it("maps all ten server roles to Arabic labels", () => {
    expect(STAFF_ROLE_IDS).toHaveLength(10);
    expect(STAFF_ROLE_IDS).not.toContain("qc");
    for (const role of STAFF_ROLE_IDS) {
      expect(STAFF_ROLE_LABELS_AR[role]).toBeTruthy();
      expect(staffRoleLabelAr(role)).toBe(STAFF_ROLE_LABELS_AR[role]);
    }
  });
});

describe("create staff form validation", () => {
  it("rejects password confirmation mismatch client-side", () => {
    const result = validateCreateStaffInput({
      password: "valid-pass-1",
      confirmPassword: "other-pass-1",
      roles: ["packing"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.messageAr).toContain("غير متطابق");
  });

  it("rejects empty role selection", () => {
    expect(
      validateCreateStaffInput({
        password: "valid-pass-1",
        confirmPassword: "valid-pass-1",
        roles: [],
      }).ok
    ).toBe(false);
  });

  it("accepts valid create input", () => {
    expect(
      validateCreateStaffInput({
        password: "valid-pass-1",
        confirmPassword: "valid-pass-1",
        roles: ["stock_manager"],
      })
    ).toEqual({ ok: true });
  });
});

describe("role edit and self lockout UI rules", () => {
  it("sends a full replacement role set through validation", () => {
    expect(validateRoleSelection(["admin", "packing"]).ok).toBe(true);
  });

  it("prevents removing own admin role in the UI model", () => {
    expect(
      canToggleAdminRoleForUser({
        targetUserId: 5,
        currentUserId: 5,
        role: "admin",
        nextSelected: ["packing"],
      })
    ).toBe(false);
    expect(adminRoleLockedForSelf({ targetUserId: 5, currentUserId: 5 })).toBe(true);
  });

  it("prevents offering self deactivation", () => {
    expect(
      canOfferDeactivate({ targetUserId: 2, currentUserId: 2, isActive: true })
    ).toBe(false);
    expect(
      canOfferDeactivate({ targetUserId: 3, currentUserId: 2, isActive: true })
    ).toBe(true);
  });

  it("requires confirmation before deactivation", () => {
    expect(requiresDeactivateConfirmation(true)).toBe(true);
    expect(requiresDeactivateConfirmation(false)).toBe(false);
  });
});

describe("safe staff management errors", () => {
  it("surfaces server CONFLICT and FORBIDDEN messages", () => {
    expect(
      safeStaffManagementErrorMessage({
        data: { code: "CONFLICT", message: "اسم الدخول مستخدم مسبقاً" },
      })
    ).toBe("اسم الدخول مستخدم مسبقاً");
    expect(
      safeStaffManagementErrorMessage({
        data: { code: "FORBIDDEN", message: "لا يمكن إزالة دور المدير عن حسابك" },
      })
    ).toContain("لا يمكن");
  });

  it("does not expose raw SQL in generic failures", () => {
    const message = safeStaffManagementErrorMessage(new Error("ER_DUP_ENTRY staff_users"));
    expect(message).not.toContain("ER_DUP_ENTRY");
    expect(message).not.toContain("staff_users");
  });
});

describe("staff management page wiring", () => {
  const page = source("client/src/pages/admin/AdminStaffManagement.tsx");
  const layout = source("client/src/components/admin/AdminLayout.tsx");
  const app = source("client/src/App.tsx");

  it("shows staff identity required state without staff session", () => {
    expect(page).toContain("يلزم تسجيل هوية الموظف");
    expect(page).toContain("staffManagementAccessFromMe");
  });

  it("shows forbidden state for non-admin staff", () => {
    expect(page).toContain("ليس لديك صلاحية إدارة الموظفين");
  });

  it("loads list only through staffManagement.list", () => {
    expect(page).toContain("trpc.staffManagement.list.useQuery");
    expect(page).toContain("trpc.staffManagement.create.useMutation");
    expect(page).toContain("trpc.staffManagement.setRoles.useMutation");
    expect(page).toContain("trpc.staffManagement.setActive.useMutation");
    expect(page).not.toMatch(/passwordHash|token_hash|tokenHash|document\.cookie/i);
  });

  it("clears password fields after successful create path", () => {
    expect(page).toContain("setCreatePassword(\"\")");
    expect(page).toContain("setCreateConfirm(\"\")");
    expect(page).toContain("resetCreateForm");
  });

  it("uses confirmation before setActive(false)", () => {
    expect(page).toContain("AlertDialog");
    expect(page).toContain("تأكيد الإيقاف");
    expect(page).toContain("isActive: false");
  });

  it("marks the current staff user in the list", () => {
    expect(page).toContain("حسابك");
    expect(page).toContain("meQuery.data?.userId");
  });

  it("does not store staff data in browser storage", () => {
    expect(staffBrowserStoragePlan().localStorage).toEqual([]);
    expect(page).not.toContain("localStorage");
    expect(page).not.toContain("sessionStorage");
  });

  it("adds navigation and route without removing legacy admin pages", () => {
    expect(layout).toContain("إدارة الموظفين");
    expect(layout).toContain("/admin/staff");
    expect(app).toContain("/admin/staff");
    expect(app).toContain("/admin/settings");
    expect(app).toContain("/admin/dashboard");
    expect(layout).toContain('path: "/admin/settings"');
  });
});
