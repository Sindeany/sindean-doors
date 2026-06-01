import React, { createContext, useContext, useState, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface SupplierProfile {
  id: number;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  categories?: string[] | null;
  status: "pending" | "active" | "suspended";
  rating?: number | null;
  totalQuotes?: number | null;
  wonQuotes?: number | null;
  createdAt: number;
  updatedAt: number;
}

interface SupplierAuthContextType {
  supplier: SupplierProfile | null;
  isLoading: boolean;
  login: (supplier: SupplierProfile) => void;
  logout: () => void;
}

const SupplierAuthContext = createContext<SupplierAuthContextType | null>(null);

export function SupplierAuthProvider({ children }: { children: ReactNode }) {
  const [supplier, setSupplier] = useState<SupplierProfile | null>(null);

  // استعادة الجلسة عند تحميل الصفحة عبر httpOnly cookie
  const { isLoading } = trpc.suppliers.me.useQuery(undefined, {
    retry: false,
    onSuccess: (data: any) => setSupplier(data as SupplierProfile),
    onError: () => setSupplier(null),
  } as any);

  const logoutMutation = trpc.suppliers.logout.useMutation({
    onSettled: () => setSupplier(null),
  });

  const login = (newSupplier: SupplierProfile) => {
    setSupplier(newSupplier);
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  return (
    <SupplierAuthContext.Provider value={{ supplier, isLoading, login, logout }}>
      {children}
    </SupplierAuthContext.Provider>
  );
}

export function useSupplierAuth() {
  const ctx = useContext(SupplierAuthContext);
  if (!ctx) throw new Error("useSupplierAuth must be used within SupplierAuthProvider");
  return ctx;
}
