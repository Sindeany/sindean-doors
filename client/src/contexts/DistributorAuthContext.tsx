// ============================================================
// Distributor Auth Context - Sindian Doors
// Batch 3-b: استبدال mock auth بمصادقة حقيقية (httpOnly cookies + tRPC)
// ============================================================

import { createContext, useContext, ReactNode } from "react";
import { DistributorProfile } from "@/lib/distributorData";
import { trpc } from "@/lib/trpc";

interface DistributorAuthContextType {
  distributor: DistributorProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (distributor: DistributorProfile) => void;
  logout: () => void;
}

const DistributorAuthContext = createContext<DistributorAuthContextType | null>(
  null
);

export function DistributorAuthProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();

  // استعادة الجلسة عند تحميل الصفحة عبر httpOnly cookie
  const meQuery = trpc.distributors.me.useQuery(undefined, {
    retry: false,
  });

  const distributor = (meQuery.data as DistributorProfile) ?? null;
  const isLoading = meQuery.isLoading;

  const logoutMutation = trpc.distributors.logout.useMutation({
    onSettled: () => utils.distributors.me.reset(),
  });

  const login = (newDistributor: DistributorProfile) => {
    utils.distributors.me.invalidate();
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  return (
    <DistributorAuthContext.Provider
      value={{
        distributor,
        isAuthenticated: !!distributor,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </DistributorAuthContext.Provider>
  );
}

export function useDistributorAuth() {
  const ctx = useContext(DistributorAuthContext);
  if (!ctx)
    throw new Error(
      "useDistributorAuth must be used inside DistributorAuthProvider"
    );
  return ctx;
}
