// ============================================================
// Distributor Auth Context - Sindian Doors
// Batch 3-b: استبدال mock auth بمصادقة حقيقية (httpOnly cookies + tRPC)
// ============================================================

import { createContext, useContext, useState, ReactNode } from "react";
import { DistributorProfile } from "@/lib/distributorData";
import { trpc } from "@/lib/trpc";

interface DistributorAuthContextType {
  distributor: DistributorProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (distributor: DistributorProfile) => void;
  logout: () => void;
}

const DistributorAuthContext = createContext<DistributorAuthContextType | null>(null);

export function DistributorAuthProvider({ children }: { children: ReactNode }) {
  const [distributor, setDistributor] = useState<DistributorProfile | null>(null);

  // استعادة الجلسة عند تحميل الصفحة عبر httpOnly cookie
  const { isLoading } = trpc.distributors.me.useQuery(undefined, {
    retry: false,
    // as any: onSuccess/onError ليسا في النوع الرسمي لـ useQuery في tRPC v11
    // لكنهما مدعومان في TanStack Query v5 الذي يُشغّله tRPC
    onSuccess: (data: any) => setDistributor(data as DistributorProfile),
    onError: () => setDistributor(null),
  } as any);

  const logoutMutation = trpc.distributors.logout.useMutation({
    onSettled: () => setDistributor(null),
  });

  const login = (newDistributor: DistributorProfile) => {
    setDistributor(newDistributor);
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  return (
    <DistributorAuthContext.Provider
      value={{ distributor, isAuthenticated: !!distributor, isLoading, login, logout }}
    >
      {children}
    </DistributorAuthContext.Provider>
  );
}

export function useDistributorAuth() {
  const ctx = useContext(DistributorAuthContext);
  if (!ctx) throw new Error("useDistributorAuth must be used inside DistributorAuthProvider");
  return ctx;
}
