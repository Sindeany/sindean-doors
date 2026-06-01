// ============================================================
// Admin Auth Context - Sindian Doors
// Cookie-based admin session — no token stored in JS memory or localStorage
// ============================================================
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { trpc } from "@/lib/trpc";

interface AdminAuthContextType {
  isAdminLoggedIn: boolean;
  isCheckingAuth: boolean;
  setAdminLoggedIn: (val: boolean) => void;
  clearAdminToken: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Verify session via httpOnly cookie on every mount
  const verifyQuery = trpc.adminAuth.verify.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (verifyQuery.isSuccess) setIsAdminLoggedIn(true);
    if (verifyQuery.isError) setIsAdminLoggedIn(false);
  }, [verifyQuery.isSuccess, verifyQuery.isError]);

  // Logout: invalidates session on server and clears cookie
  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSettled: () => setIsAdminLoggedIn(false),
  });

  const setAdminLoggedIn = useCallback((val: boolean) => {
    setIsAdminLoggedIn(val);
  }, []);

  const clearAdminToken = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  return (
    <AdminAuthContext.Provider
      value={{
        isAdminLoggedIn,
        isCheckingAuth: verifyQuery.isPending,
        setAdminLoggedIn,
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
