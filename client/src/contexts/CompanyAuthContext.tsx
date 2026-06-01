// ============================================================
// Company Auth Context - Sindian Doors B2B Portal
// Simulates login/logout state for company accounts
// ============================================================

import { createContext, useContext, useState, ReactNode } from "react";
import { mockCompany, CompanyProfile } from "@/lib/companyData";

interface CompanyAuthContextType {
  company: CompanyProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const CompanyAuthContext = createContext<CompanyAuthContextType | null>(null);

export function CompanyAuthProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  const login = (email: string, _password: string): boolean => {
    if (email.includes("@")) {
      setCompany(mockCompany);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCompany(null);
  };

  return (
    <CompanyAuthContext.Provider
      value={{ company, isAuthenticated: !!company, login, logout }}
    >
      {children}
    </CompanyAuthContext.Provider>
  );
}

export function useCompanyAuth() {
  const ctx = useContext(CompanyAuthContext);
  if (!ctx) throw new Error("useCompanyAuth must be used inside CompanyAuthProvider");
  return ctx;
}
