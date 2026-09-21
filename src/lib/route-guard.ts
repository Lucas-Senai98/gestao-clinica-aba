/**
 * src/lib/route-guard.ts
 *
 * Funções utilitárias de beforeLoad para proteção de rotas com RBAC granular.
 * Uso:
 *   beforeLoad: requireAuth()                       → qualquer usuário logado
 *   beforeLoad: requireRole("admin")                → apenas admin (ou master)
 *   beforeLoad: requirePermission("financial:view") → usuário com permissão explícita (ou master)
 */
import { redirect } from "@tanstack/react-router";
import type { RouterContext } from "@/router";
import { hasPermission, type PermissionSlug } from "@/lib/permissions";
import type { Role } from "@/db/types";

type BeforeLoadCtx = { context: RouterContext };

/** Redireciona para /login se não houver sessão ativa. */
export function requireAuth() {
  return ({ context }: BeforeLoadCtx) => {
    if (!context.user) {
      throw redirect({ to: "/login", search: { redirect: undefined } });
    }
  };
}

/** Redireciona para /login (sem sessão) ou para / (role errada, exceto master). */
export function requireRole(role: Role) {
  return ({ context }: BeforeLoadCtx) => {
    if (!context.user) {
      throw redirect({ to: "/login" });
    }
    if (context.user.is_master === 1) {
      return;
    }
    if (context.user.role !== role) {
      throw redirect({ to: "/" });
    }
  };
}

/** Redireciona para /login (sem sessão) ou para / se não possuir a permissão necessária. */
export function requirePermission(permission: PermissionSlug | string, requiredRole?: Role) {
  return ({ context }: BeforeLoadCtx) => {
    if (!context.user) {
      throw redirect({ to: "/login" });
    }
    if (context.user.is_master === 1) {
      return;
    }
    if (requiredRole && context.user.role !== requiredRole) {
      throw redirect({ to: "/" });
    }
    if (!hasPermission(context.user, permission)) {
      throw redirect({ to: "/" });
    }
  };
}
