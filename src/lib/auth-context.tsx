/**
 * src/lib/auth-context.tsx
 *
 * Contexto de autenticação baseado no usuário injetado pelo TanStack Router
 * (via beforeLoad na rota raiz). Substitui o RoleProvider do localStorage.
 */
import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/queries/auth";

// ── Contexto ──────────────────────────────────────────────────────────────────

interface AuthCtx {
  user: SessionUser | null;
}

const AuthContext = createContext<AuthCtx | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Retorna o usuário autenticado ou null se não houver sessão. */
export function useCurrentUser(): SessionUser | null {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useCurrentUser deve ser usado dentro de AuthProvider");
  return ctx.user;
}

/**
 * Alias de compatibilidade — retorna a role do usuário.
 * Substituído progressivamente por useCurrentUser().role.
 */
export function useRole(): SessionUser["role"] {
  const user = useCurrentUser();
  // Fallback seguro: sem sessão, assume "therapist" (será redirecionado pelo beforeLoad)
  return user?.role ?? "therapist";
}
