/**
 * Additive staff login. It creates staffSession only.
 * The legacy adminSession cookie is left untouched.
 */
import { FormEvent, useEffect, useState } from "react";
import { STAFF_IDENTITY_OPEN_EVENT } from "@/lib/staffIdentity";
import { BadgeCheck, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { staffIdentityFromServer } from "@/lib/staffIdentity";
import { useLanguage } from "@/contexts/LanguageContext";

const COPY = {
  ar: {
    open: "هوية الموظف",
    title: "هوية الموظف",
    signedOut: "لا توجد جلسة موظف. صفحات الإدارة تبقى على جلسة المدير.",
    loginName: "اسم الدخول",
    password: "كلمة المرور",
    submit: "دخول",
    pending: "جارٍ الدخول",
    logout: "خروج الهوية",
    loggingOut: "جارٍ الخروج",
    name: "الاسم",
    login: "اسم الدخول",
    roles: "الأدوار",
    noRoles: "لا توجد أدوار من الخادم",
    required: "أدخل اسم الدخول وكلمة المرور",
  },
  en: {
    open: "Staff identity",
    title: "Staff identity",
    signedOut: "No staff session. Admin pages keep using the admin session.",
    loginName: "Login name",
    password: "Password",
    submit: "Sign in",
    pending: "Signing in",
    logout: "Sign out staff",
    loggingOut: "Signing out",
    name: "Name",
    login: "Login name",
    roles: "Roles",
    noRoles: "No roles returned by the server",
    required: "Enter the login name and password",
  },
  zh: {
    open: "员工身份",
    title: "员工身份",
    signedOut: "没有员工会话。管理页面仍使用管理员会话。",
    loginName: "登录名",
    password: "密码",
    submit: "登录",
    pending: "正在登录",
    logout: "退出员工身份",
    loggingOut: "正在退出",
    name: "姓名",
    login: "登录名",
    roles: "角色",
    noRoles: "服务器未返回角色",
    required: "请输入登录名和密码",
  },
} as const;

export default function StaffIdentityControl() {
  const { lang } = useLanguage();
  const copy = COPY[lang];
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener(STAFF_IDENTITY_OPEN_EVENT, openPanel);
    return () => window.removeEventListener(STAFF_IDENTITY_OPEN_EVENT, openPanel);
  }, []);

  const me = trpc.staffAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const identity = me.isSuccess ? staffIdentityFromServer(me.data) : null;

  const login = trpc.staffAuth.login.useMutation({
    onSuccess: async () => {
      setLoginName("");
      setPassword("");
      setError(null);
      await utils.staffAuth.me.invalidate();
    },
    onError: (err) => {
      setPassword("");
      setError(err.message);
    },
  });

  const logout = trpc.staffAuth.logout.useMutation({
    onSettled: () => {
      utils.staffAuth.me.reset();
      setError(null);
    },
  });

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();
    const name = loginName.trim();
    if (!name || !password) {
      setError(copy.required);
      return;
    }
    setError(null);
    login.mutate({ loginName: name, password });
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200 max-w-[10rem]"
          title={copy.title}
        >
          <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{identity ? identity.name : copy.open}</span>
        </button>

        {open && (
          <div
            className="absolute top-full mt-1 z-50 w-72 bg-white rounded-xl shadow-lg border border-gray-100 p-4 text-start"
            style={{ insetInlineEnd: 0 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-sm font-semibold text-gray-900 mb-2">{copy.title}</div>

            {identity ? (
              <div className="space-y-2">
                <div>
                  <div className="text-[11px] text-gray-500">{copy.name}</div>
                  <div className="text-sm text-gray-900">{identity.name}</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-500">{copy.login}</div>
                  <div className="text-sm text-gray-900" dir="ltr">
                    {identity.loginName}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-500">{copy.roles}</div>
                  {identity.roles.length > 0 ? (
                    <ul className="mt-1 flex flex-wrap gap-1">
                      {identity.roles.map((role) => (
                        <li
                          key={role}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                          dir="ltr"
                        >
                          {role}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-gray-500">{copy.noRoles}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-60"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {logout.isPending ? copy.loggingOut : copy.logout}
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-2">
                <p className="text-xs text-gray-500 leading-5">{copy.signedOut}</p>
                <label className="block text-[11px] text-gray-500" htmlFor="staff-login-name">
                  {copy.loginName}
                </label>
                <input
                  id="staff-login-name"
                  value={loginName}
                  onChange={(event) => setLoginName(event.target.value)}
                  autoComplete="username"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                  dir="ltr"
                />
                <label className="block text-[11px] text-gray-500" htmlFor="staff-password">
                  {copy.password}
                </label>
                <input
                  id="staff-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                  dir="ltr"
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={login.isPending}
                  className="w-full px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                  style={{ background: "oklch(0.38 0.06 160)" }}
                >
                  {login.isPending ? copy.pending : copy.submit}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
