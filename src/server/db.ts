/**
 * src/server/db.ts
 *
 * Acesso ao banco D1 via ambiente Cloudflare / Nitro / globalThis.
 * Todas as Server Functions importam `getDB()` para obter a instância do D1.
 */

export interface D1Env {
  DB: D1Database;
}

/**
 * Retorna a instância do banco D1 no ambiente Workers ou um fallback gracioso.
 */
export function getDB(): D1Database {
  try {
    // 1. Tenta obter o binding DB do ambiente global ou Cloudflare Workers
    const g = globalThis as any;
    const db = g.DB || g.__env__?.DB || g.process?.env?.DB;
    if (db) {
      return db;
    }
  } catch (err) {
    // Ignora em tempo de build/SSR estático
  }

  // 2. Retorna um mock/dummy D1 para garantir que a renderização SSR e dev não quebrem
  return {
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results: [] }),
        first: async () => null,
        run: async () => ({ success: true }),
      }),
      all: async () => ({ results: [] }),
      first: async () => null,
      run: async () => ({ success: true }),
    }),
    batch: async () => [],
    exec: async () => ({ count: 0, duration: 0 }),
  } as unknown as D1Database;
}

/** Gera um UUID v4 compatível com o ambiente Workers (sem node:crypto). */
export function generateId(): string {
  return crypto.randomUUID();
}

/** Data/hora atual formatada como string ISO 8601. */
export function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
