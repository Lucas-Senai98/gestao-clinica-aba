/**
 * src/lib/route-guard.ts
 *
 * Funções utilitárias de beforeLoad para proteção de rotas.
 * Uso:
 *   beforeLoad: requireAuth()           → qualquer usuário logado
 *   beforeLoad: requireRole("admin")    → apenas admin
 *   beforeLoad: requireRole("therapist")→ apenas terapeuta
 *   beforeLoad: requireRole("parent")   → apenas responsável
 */
import { redirect } from "@tanstack/react-router";
import type { RouterContext } from "@/router";

type BeforeLoadCtx = { context: RouterContext };

/** Redireciona para /login se não houver sessão ativa. */
export function requireAuth() {
  return ({ context }: BeforeLoadCtx) => {
    if (!context.user) {
      throw redirect({ to: "/login", search: { redirect: undefined } });
    }
  };
}

/** Redireciona para /login (sem sessão) ou para / (role errada). */
export function requireRole(role: "admin" | "therapist" | "parent") {
  return ({ context }: BeforeLoadCtx) => {
    if (!context.user) {
      throw redirect({ to: "/login" });
    }
    if (context.user.role !== role) {
      throw redirect({ to: "/" });
    }
  };
}
