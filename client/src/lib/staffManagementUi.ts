import { STAFF_ROLE_IDS, type StaffRoleId } from "./staffRoles";

export type StaffManagementAccess =
  | "needs_staff_identity"
  | "forbidden"
  | "admin";

export function staffManagementAccessFromMe(
  me:
    | { roles: readonly string[] }
    | null
    | undefined,
  meStatus: "pending" | "success" | "error"
): StaffManagementAccess {
  if (meStatus !== "success" || !me) return "needs_staff_identity";
  if (me.roles.includes("admin")) return "admin";
  return "forbidden";
}

export function validateCreateStaffInput(input: {
  password: string;
  confirmPassword: string;
  roles: readonly string[];
}): { ok: true } | { ok: false; messageAr: string } {
  if (input.password.length < 8 || input.password.length > 200) {
    return { ok: false, messageAr: "كلمة المرور يجب أن تكون بين 8 و 200 حرفاً" };
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false, messageAr: "كلمة المرور وتأكيدها غير متطابقين" };
  }
  if (input.roles.length < 1) {
    return { ok: false, messageAr: "يجب اختيار دور واحد على الأقل" };
  }
  const unique = new Set(input.roles);
  if (unique.size !== input.roles.length) {
    return { ok: false, messageAr: "لا يمكن تكرار الأدوار" };
  }
  for (const role of input.roles) {
    if (!(STAFF_ROLE_IDS as readonly string[]).includes(role)) {
      return { ok: false, messageAr: "دور غير معتمد" };
    }
  }
  return { ok: true };
}

export function validateRoleSelection(roles: readonly string[]): { ok: true } | { ok: false; messageAr: string } {
  if (roles.length < 1) {
    return { ok: false, messageAr: "يجب اختيار دور واحد على الأقل" };
  }
  const unique = new Set(roles);
  if (unique.size !== roles.length) {
    return { ok: false, messageAr: "لا يمكن تكرار الأدوار" };
  }
  return { ok: true };
}

/** Current admin cannot drop their own admin role in the UI. */
export function canToggleAdminRoleForUser(options: {
  targetUserId: number;
  currentUserId: number;
  role: StaffRoleId;
  nextSelected: readonly string[];
}): boolean {
  if (options.role !== "admin") return true;
  if (options.targetUserId !== options.currentUserId) return true;
  return options.nextSelected.includes("admin");
}

export function adminRoleLockedForSelf(options: {
  targetUserId: number;
  currentUserId: number;
}): boolean {
  return options.targetUserId === options.currentUserId;
}

export function canOfferDeactivate(options: {
  targetUserId: number;
  currentUserId: number;
  isActive: boolean;
}): boolean {
  if (!options.isActive) return false;
  return options.targetUserId !== options.currentUserId;
}

export function requiresDeactivateConfirmation(isActive: boolean): boolean {
  return isActive;
}

export function safeStaffManagementErrorMessage(error: unknown): string {
  const data = (error as { data?: { code?: string; message?: string } } | null)?.data;
  const message = (error as { message?: string } | null)?.message;
  if (data?.code === "CONFLICT" || data?.code === "FORBIDDEN") {
    if (typeof data.message === "string" && data.message.length > 0) {
      return data.message;
    }
  }
  if (data?.code === "UNAUTHORIZED") {
    return "انتهت جلسة الموظف أو لم تعد الصلاحية متاحة. سجّل الدخول من «هوية الموظف».";
  }
  return "تعذر إكمال العملية. حاول مرة أخرى.";
}

export const EMPTY_CREATE_PASSWORD_FIELDS = { password: "", confirmPassword: "" };
