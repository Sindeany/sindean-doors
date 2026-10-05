import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, ShieldAlert } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  STAFF_ROLE_IDS,
  staffRoleLabelAr,
  type StaffRoleId,
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
import { STAFF_IDENTITY_OPEN_EVENT } from "@/lib/staffIdentity";

function formatCreatedAt(ts: number): string {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts));
}

function RoleCheckboxGrid(props: {
  selected: StaffRoleId[];
  onChange: (roles: StaffRoleId[]) => void;
  lockAdmin?: boolean;
  adminLockHint?: string;
}) {
  const toggle = (role: StaffRoleId, checked: boolean) => {
    if (role === "admin" && props.lockAdmin) return;
    const set = new Set(props.selected);
    if (checked) set.add(role);
    else set.delete(role);
    props.onChange(STAFF_ROLE_IDS.filter((id) => set.has(id)));
  };

  return (
    <div className="space-y-2">
      {props.lockAdmin && props.adminLockHint && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {props.adminLockHint}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {STAFF_ROLE_IDS.map((role) => {
          const checked = props.selected.includes(role);
          const disabled = role === "admin" && props.lockAdmin;
          return (
            <label
              key={role}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : "cursor-pointer hover:bg-gray-50"
              }`}
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(value) => toggle(role, value === true)}
              />
              <span>{staffRoleLabelAr(role)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminStaffManagement() {
  const utils = trpc.useUtils();
  const meQuery = trpc.staffAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
  });

  const access = meQuery.isLoading
    ? ("loading" as const)
    : staffManagementAccessFromMe(
        meQuery.data,
        meQuery.isSuccess ? "success" : "error"
      );

  const listQuery = trpc.staffManagement.list.useQuery(undefined, {
    enabled: access === "admin",
    retry: false,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLogin, setCreateLogin] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirm, setCreateConfirm] = useState("");
  const [createRoles, setCreateRoles] = useState<StaffRoleId[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<{
    userId: number;
    name: string;
    roles: StaffRoleId[];
  } | null>(null);
  const [editRoles, setEditRoles] = useState<StaffRoleId[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<{
    userId: number;
    name: string;
  } | null>(null);

  const resetCreateForm = () => {
    setCreateName("");
    setCreateLogin("");
    setCreatePassword("");
    setCreateConfirm("");
    setCreateRoles([]);
    setCreateError(null);
  };

  useEffect(() => {
    if (!createOpen) resetCreateForm();
  }, [createOpen]);

  const createMutation = trpc.staffManagement.create.useMutation({
    onSuccess: async () => {
      resetCreateForm();
      setCreateOpen(false);
      await utils.staffManagement.list.invalidate();
      toast.success("تم إنشاء حساب الموظف");
    },
    onError: (err) => {
      setCreatePassword("");
      setCreateConfirm("");
      setCreateError(safeStaffManagementErrorMessage(err));
    },
  });

  const setRolesMutation = trpc.staffManagement.setRoles.useMutation({
    onSuccess: async () => {
      setEditUser(null);
      setEditError(null);
      await utils.staffManagement.list.invalidate();
      await utils.staffAuth.me.invalidate();
      toast.success("تم تحديث الأدوار");
    },
    onError: (err) => {
      setEditError(safeStaffManagementErrorMessage(err));
    },
  });

  const setActiveMutation = trpc.staffManagement.setActive.useMutation({
    onSuccess: async () => {
      setDeactivateTarget(null);
      await utils.staffManagement.list.invalidate();
      toast.success("تم تحديث حالة الحساب");
    },
    onError: (err) => {
      toast.error(safeStaffManagementErrorMessage(err));
    },
  });

  const currentUserId = meQuery.data?.userId ?? null;

  const openEditRoles = (row: {
    userId: number;
    name: string;
    roles: string[];
  }) => {
    const roles = STAFF_ROLE_IDS.filter((r) => row.roles.includes(r));
    setEditUser({ userId: row.userId, name: row.name, roles });
    setEditRoles([...roles]);
    setEditError(null);
  };

  const handleCreateSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validation = validateCreateStaffInput({
      password: createPassword,
      confirmPassword: createConfirm,
      roles: createRoles,
    });
    if (!validation.ok) {
      setCreateError(validation.messageAr);
      return;
    }
    if (!createName.trim() || !createLogin.trim()) {
      setCreateError("أدخل الاسم واسم الدخول");
      return;
    }
    setCreateError(null);
    createMutation.mutate({
      name: createName.trim(),
      loginName: createLogin.trim(),
      password: createPassword,
      roles: createRoles,
    });
  };

  const handleEditRolesSubmit = () => {
    if (!editUser || currentUserId == null) return;
    const validation = validateRoleSelection(editRoles);
    if (!validation.ok) {
      setEditError(validation.messageAr);
      return;
    }
    if (
      !canToggleAdminRoleForUser({
        targetUserId: editUser.userId,
        currentUserId,
        role: "admin",
        nextSelected: editRoles,
      })
    ) {
      setEditError("لا يمكن إزالة دور المدير عن حسابك");
      return;
    }
    setEditError(null);
    setRolesMutation.mutate({ userId: editUser.userId, roles: editRoles });
  };

  const listForbidden =
    listQuery.isError &&
    ((listQuery.error as { data?: { code?: string } }).data?.code === "FORBIDDEN" ||
      (listQuery.error as { data?: { code?: string } }).data?.code === "UNAUTHORIZED");

  const staffRows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  return (
    <AdminLayout
      title="إدارة الموظفين"
      subtitle="إنشاء حسابات الموظفين وتعيين الأدوار — يتطلب هوية موظف بصلاحية مدير النظام"
    >
      <div className="space-y-6" dir="rtl">
        {access === "loading" && (
          <p className="text-sm text-gray-500">جاري التحقق من هوية الموظف...</p>
        )}

        {access === "needs_staff_identity" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">يلزم تسجيل هوية الموظف</h2>
                <p className="text-sm text-gray-600 mt-1 leading-6">
                  صفحات الإدارة تعمل بجلسة المدير الحالية، لكن إدارة حسابات الموظفين تتطلب جلسة
                  «هوية الموظف» من الشريط العلوي. لا تُستخدم جلسة المدير وحدها لهذه الصفحة.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => window.dispatchEvent(new Event(STAFF_IDENTITY_OPEN_EVENT))}
                >
                  فتح لوحة هوية الموظف
                </Button>
              </div>
            </div>
          </div>
        )}

        {access === "forbidden" && (
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-6">
            <h2 className="text-lg font-semibold text-red-900">ليس لديك صلاحية إدارة الموظفين</h2>
            <p className="text-sm text-red-800 mt-2">
              حسابك مسجّل كموظف، لكن دور «مدير النظام» غير مفعّل. اطلب من مدير النظام تعيين الدور
              المناسب.
            </p>
          </div>
        )}

        {(listForbidden || (access === "admin" && listQuery.isError)) && (
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-800">
            {listForbidden
              ? "لم تعد صلاحية إدارة الموظفين متاحة لهذه الجلسة."
              : safeStaffManagementErrorMessage(listQuery.error)}
          </div>
        )}

        {access === "admin" && !listForbidden && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                {listQuery.isLoading
                  ? "جاري تحميل القائمة..."
                  : `${staffRows.length} حساب موظف`}
              </p>
              <Button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="gap-2"
                style={{ background: "oklch(0.38 0.06 160)" }}
              >
                <Plus className="w-4 h-4" />
                موظف جديد
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-start px-4 py-3 font-medium">الاسم</th>
                    <th className="text-start px-4 py-3 font-medium">اسم الدخول</th>
                    <th className="text-start px-4 py-3 font-medium">الأدوار</th>
                    <th className="text-start px-4 py-3 font-medium">الحالة</th>
                    <th className="text-start px-4 py-3 font-medium">تاريخ الإنشاء</th>
                    <th className="text-start px-4 py-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {staffRows.map((row) => {
                    const isSelf = currentUserId === row.userId;
                    return (
                      <tr key={row.userId} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{row.name}</div>
                          {isSelf && (
                            <Badge variant="secondary" className="mt-1 text-[10px]">
                              حسابك
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                          {row.loginName}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.roles.map((role) => (
                              <span
                                key={role}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                              >
                                {staffRoleLabelAr(role)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {row.isActive ? (
                            <span className="text-green-700">نشط</span>
                          ) : (
                            <span className="text-gray-500">موقوف</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatCreatedAt(row.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => openEditRoles(row)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              الأدوار
                            </Button>
                            {row.isActive ? (
                              canOfferDeactivate({
                                targetUserId: row.userId,
                                currentUserId: currentUserId ?? -1,
                                isActive: true,
                              }) ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-800 border-amber-200"
                                  onClick={() => {
                                    if (requiresDeactivateConfirmation(true)) {
                                      setDeactivateTarget({
                                        userId: row.userId,
                                        name: row.name,
                                      });
                                    }
                                  }}
                                >
                                  إيقاف
                                </Button>
                              ) : isSelf ? (
                                <span className="text-xs text-gray-400 self-center">
                                  لا يمكن إيقاف حسابك
                                </span>
                              ) : null
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-green-800 border-green-200"
                                onClick={() =>
                                  setActiveMutation.mutate({
                                    userId: row.userId,
                                    isActive: true,
                                  })
                                }
                                disabled={setActiveMutation.isPending}
                              >
                                تفعيل
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!listQuery.isLoading && staffRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        لا يوجد موظفون بعد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>موظف جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">الاسم</label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">اسم الدخول</label>
                <Input
                  value={createLogin}
                  onChange={(e) => setCreateLogin(e.target.value)}
                  maxLength={100}
                  dir="ltr"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">كلمة المرور</label>
                <Input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  autoComplete="new-password"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">تأكيد كلمة المرور</label>
                <Input
                  type="password"
                  value={createConfirm}
                  onChange={(e) => setCreateConfirm(e.target.value)}
                  autoComplete="new-password"
                  dir="ltr"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">الأدوار</div>
                <RoleCheckboxGrid selected={createRoles} onChange={setCreateRoles} />
              </div>
              {createError && <p className="text-xs text-red-600">{createError}</p>}
              <DialogFooter className="gap-2 sm:justify-start">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "جاري الحفظ..." : "إنشاء"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  إلغاء
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editUser != null} onOpenChange={(open) => !open && setEditUser(null)}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل الأدوار — {editUser?.name}</DialogTitle>
            </DialogHeader>
            {editUser && currentUserId != null && (
              <>
                <RoleCheckboxGrid
                  selected={editRoles}
                  onChange={(roles) => {
                    if (
                      !canToggleAdminRoleForUser({
                        targetUserId: editUser.userId,
                        currentUserId,
                        role: "admin",
                        nextSelected: roles,
                      })
                    ) {
                      return;
                    }
                    setEditRoles(roles);
                  }}
                  lockAdmin={adminRoleLockedForSelf({
                    targetUserId: editUser.userId,
                    currentUserId,
                  })}
                  adminLockHint="لا يمكن إزالة دور مدير النظام عن حسابك الحالي."
                />
                {editError && <p className="text-xs text-red-600 mt-2">{editError}</p>}
                <DialogFooter className="gap-2 sm:justify-start">
                  <Button
                    type="button"
                    onClick={handleEditRolesSubmit}
                    disabled={setRolesMutation.isPending}
                  >
                    {setRolesMutation.isPending ? "جاري الحفظ..." : "حفظ الأدوار"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                    إلغاء
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={deactivateTarget != null}
          onOpenChange={(open) => !open && setDeactivateTarget(null)}
        >
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>إيقاف حساب الموظف؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم إيقاف حساب «{deactivateTarget?.name}» ولن يتمكن من تسجيل الدخول حتى يُفعَّل
                مجدداً. الجلسات النشطة لهذا الحساب تُلغى من الخادم.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:justify-start">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                className="bg-amber-800 hover:bg-amber-900"
                onClick={() => {
                  if (!deactivateTarget) return;
                  setActiveMutation.mutate({
                    userId: deactivateTarget.userId,
                    isActive: false,
                  });
                }}
              >
                تأكيد الإيقاف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
