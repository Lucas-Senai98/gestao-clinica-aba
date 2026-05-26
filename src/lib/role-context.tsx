import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/lib/mock-data";

type Ctx = { role: Role; setRole: (r: Role) => void };
const RoleContext = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("therapist");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("aba-role") : null;
    if (stored === "admin" || stored === "therapist" || stored === "parent") {
      setRoleState(stored);
    }
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== "undefined") localStorage.setItem("aba-role", r);
  };

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
