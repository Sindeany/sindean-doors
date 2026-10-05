/**
 * Client role catalog — must stay aligned with server STAFF_ROLES.
 */
export const STAFF_ROLE_IDS = [
  "admin",
  "sales_coordinator",
  "sales_person",
  "stock_manager",
  "production_manager",
  "laminating",
  "cutting",
  "auto_line",
  "frame_architrave",
  "packing",
] as const;

export type StaffRoleId = (typeof STAFF_ROLE_IDS)[number];

export const STAFF_ROLE_LABELS_AR: Record<StaffRoleId, string> = {
  admin: "مدير النظام",
  sales_coordinator: "منسق المبيعات",
  sales_person: "مندوب مبيعات",
  stock_manager: "مسؤول المخزون",
  production_manager: "مدير الإنتاج",
  laminating: "فريق التغليف / التلبيس",
  cutting: "فريق القص",
  auto_line: "الخط الآلي",
  frame_architrave: "الحلق والبرواز",
  packing: "التعبئة والتغليف",
};

export function staffRoleLabelAr(role: string): string {
  return STAFF_ROLE_LABELS_AR[role as StaffRoleId] ?? role;
}

export function isStaffRoleId(value: string): value is StaffRoleId {
  return (STAFF_ROLE_IDS as readonly string[]).includes(value);
}
