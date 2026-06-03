// ============================================================
// Admin Auth Context - Sindian Doors
// Cookie-based admin session — no token stored in JS memory or localStorage
// ============================================================
import {
  createContext,
  useContext,
  useCallback,
  ReactNode,
} from "react";
import { trpc } from "@/lib/trpc";

interface AdminAuthContextType {
  isAdminLoggedIn: boolean;
  isCheckingAuth: boolean;
  login: () => void;
  clearAdminToken: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();

  // Verify session via httpOnly cookie on every mount
  const verifyQuery = trpc.adminAuth.verify.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isAdminLoggedIn = verifyQuery.isSuccess && verifyQuery.data?.valid === true;
  const isCheckingAuth = verifyQuery.isLoading;

  // Logout: invalidates session on server and clears cookie
  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSettled: () => utils.adminAuth.verify.reset(),
  });

  const login = useCallback(() => {
    utils.adminAuth.verify.setData(undefined, { valid: true });
  }, [utils]);

  const clearAdminToken = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  return (
    <AdminAuthContext.Provider
      value={{
        isAdminLoggedIn,
        isCheckingAuth,
        login,
        clearAdminToken,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx)
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
