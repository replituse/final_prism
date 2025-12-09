import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User, Company } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  company: Company | null;
  selectedDate: Date;
  isAuthenticated: boolean;
  login: (user: User, company: Company | null) => void;
  logout: () => Promise<void>;
  setSelectedDate: (date: Date) => void;
  setCompany: (company: Company | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("prism_user");
    return stored ? JSON.parse(stored) : null;
  });
  
  const [company, setCompanyState] = useState<Company | null>(() => {
    const stored = localStorage.getItem("prism_company");
    return stored ? JSON.parse(stored) : null;
  });
  
  const [selectedDate, setSelectedDateState] = useState<Date>(() => new Date());

  const login = (user: User, company: Company | null) => {
    setUser(user);
    setCompanyState(company);
    localStorage.setItem("prism_user", JSON.stringify(user));
    if (company) {
      localStorage.setItem("prism_company", JSON.stringify(company));
    }
  };

  const logout = async () => {
    // Call server to destroy session
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Continue with local logout even if server call fails
    }
    setUser(null);
    setCompanyState(null);
    localStorage.removeItem("prism_user");
    localStorage.removeItem("prism_company");
  };

  const setSelectedDate = (date: Date) => {
    setSelectedDateState(date);
  };

  const setCompany = (company: Company | null) => {
    setCompanyState(company);
    if (company) {
      localStorage.setItem("prism_company", JSON.stringify(company));
    } else {
      localStorage.removeItem("prism_company");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        selectedDate,
        isAuthenticated: !!user,
        login,
        logout,
        setSelectedDate,
        setCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
