// ============================================================
// Distributor Auth Context - Sindian Doors
// Simulates login/logout state for the distributor portal
// ============================================================

import { createContext, useContext, useState, ReactNode } from "react";
import { mockDistributor, DistributorProfile } from "@/lib/distributorData";

interface DistributorAuthContextType {
  distributor: DistributorProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const DistributorAuthContext = createContext<DistributorAuthContextType | null>(null);

export function DistributorAuthProvider({ children }: { children: ReactNode }) {
  const [distributor, setDistributor] = useState<DistributorProfile | null>(null);

  const login = (email: string, _password: string): boolean => {
    // Demo: accept any email that contains "@" with any password
    if (email.includes("@")) {
      setDistributor(mockDistributor);
      return true;
    }
    return false;
  };

  const logout = () => {
    setDistributor(null);
  };

  return (
    <DistributorAuthContext.Provider
      value={{ distributor, isAuthenticated: !!distributor, login, logout }}
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
