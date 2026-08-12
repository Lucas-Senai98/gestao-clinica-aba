/**
 * src/lib/role-context.tsx
 *
 * ⚠️  ARQUIVO LEGADO — mantido apenas para retrocompatibilidade.
 * O controle de acesso agora é feito via auth-context.tsx (sessão real).
 * Novos componentes devem importar diretamente de "@/lib/auth-context".
 */
export { useRole, AuthProvider as RoleProvider } from "@/lib/auth-context";
export type { SessionUser as RoleContext } from "@/queries/auth";
