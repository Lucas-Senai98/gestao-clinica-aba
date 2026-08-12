/**
 * src/server/db.ts
 *
 * Acesso ao banco D1 via getCloudflareContext().
 * Todas as Server Functions devem importar `getDB()` para obter
 * a instância tipada do banco de dados.
 */
import { getCloudflareContext } from "@cloudflare/vite-plugin/runtime";

// ── Tipos D1 ──────────────────────────────────────────────────────────────────

export interface D1Env {
  DB: D1Database;
}

/**
 * Retorna a instância do banco D1 injetada pelo Cloudflare Workers runtime.
 * Deve ser chamada apenas dentro de Server Functions ou Middleware.
 */
export function getDB(): D1Database {
  const ctx = getCloudflareContext<D1Env>();
  const db = ctx.env.DB;
  if (!db) {
    throw new Error(
      "[GiZé's DB] Binding D1 'DB' não encontrado. " +
        "Verifique a configuração 'd1_databases' no wrangler.jsonc.",
    );
  }
  return db;
}

// ── Helpers utilitários ───────────────────────────────────────────────────────

/** Gera um UUID v4 compatível com o ambiente Workers (sem node:crypto). */
export function generateId(): string {
  return crypto.randomUUID();
}

/** Data/hora atual formatada como string ISO 8601. */
export function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
