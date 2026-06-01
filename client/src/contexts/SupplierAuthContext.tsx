import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  token: string | null;
  isLoading: boolean;
  login: (token: string, supplier: SupplierProfile) => void;
  logout: () => void;
}

const SupplierAuthContext = createContext<SupplierAuthContextType | null>(null);

const STORAGE_KEY = "supplier_auth";

export function SupplierAuthProvider({ children }: { children: ReactNode }) {
  const [supplier, setSupplier] = useState<SupplierProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { token: t, supplier: s } = JSON.parse(stored);
        setToken(t);
        setSupplier(s);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newSupplier: SupplierProfile) => {
    setToken(newToken);
    setSupplier(newSupplier);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, supplier: newSupplier }));
  };

  const logout = () => {
    setToken(null);
    setSupplier(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SupplierAuthContext.Provider value={{ supplier, token, isLoading, login, logout }}>
      {children}
    </SupplierAuthContext.Provider>
  );
}

export function useSupplierAuth() {
  const ctx = useContext(SupplierAuthContext);
  if (!ctx) throw new Error("useSupplierAuth must be used within SupplierAuthProvider");
  return ctx;
}
