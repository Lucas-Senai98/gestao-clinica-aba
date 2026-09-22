/**
 * src/server/db.ts
 *
 * Acesso ao banco D1 via ambiente Cloudflare / Nitro / globalThis.
 * Em desenvolvimento local (Node.js), conecta-se de forma transparente
 * ao SQLite gerado pelo Miniflare no diretório .wrangler.
 * Todas as Server Functions importam `getDB()` para obter a instância do D1.
 */

export interface D1Env {
  DB: D1Database;
}

/**
 * Cria um adaptador transparente sobre o node:sqlite para o ambiente dev local.
 */
function tryGetNodeSqlite(): D1Database | null {
  try {
    const g = globalThis as any;
    if (g.__SQLITE_D1_ADAPTER__) return g.__SQLITE_D1_ADAPTER__;

    if (typeof process === "undefined" || !process.versions?.node) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeRequire =
      g.require ||
      (typeof require !== "undefined" ? require : null) ||
      (process as any).mainModule?.require;

    if (!nodeRequire) return null;

    const fs = nodeRequire("fs");
    const path = nodeRequire("path");
    const { DatabaseSync } = nodeRequire("node:sqlite") || {};
    if (!DatabaseSync || !fs || !path) return null;

    const baseDir = path.resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
    if (!fs.existsSync(baseDir)) return null;

    const files = fs.readdirSync(baseDir);
    const dbFile = files.find((f: string) => f.endsWith(".sqlite") && f !== "metadata.sqlite");
    if (!dbFile) return null;

    const dbPath = path.join(baseDir, dbFile);
    const rawDb = new DatabaseSync(dbPath);

    class NodeD1Statement {
      private values: any[] = [];
      constructor(
        private raw: any,
        private sql: string,
      ) {}

      bind(...args: any[]) {
        this.values = args;
        return this;
      }

      async first<T = unknown>(colName?: string): Promise<T | null> {
        try {
          const stmt = this.raw.prepare(this.sql);
          const row = stmt.get(...this.values);
          if (!row) return null;
          if (colName) return ((row as any)[colName] ?? null) as T;
          return { ...(row as any) } as T;
        } catch {
          return null;
        }
      }

      async all<T = unknown>(): Promise<D1Result<T>> {
        try {
          const stmt = this.raw.prepare(this.sql);
          const rows = stmt.all(...this.values);
          return {
            results: rows.map((r: any) => ({ ...r })) as T[],
            success: true,
            meta: {} as any,
          };
        } catch {
          return { results: [] as T[], success: false, meta: {} as any };
        }
      }

      async run<T = unknown>(): Promise<any> {
        try {
          const stmt = this.raw.prepare(this.sql);
          const info = stmt.run(...this.values);
          return {
            success: true,
            meta: {
              changes: info.changes,
              last_row_id: Number(info.lastInsertRowid),
              duration: 0,
              rows_read: 0,
              rows_written: info.changes,
              size_after: 0,
            },
          };
        } catch (e) {
          console.error("SQLite dev query error:", e);
          return { success: false, meta: {} as any };
        }
      }
    }

    const adapter = {
      prepare(sql: string) {
        return new NodeD1Statement(rawDb, sql);
      },
      async batch<T = unknown>(stmts: any[]): Promise<D1Result<T>[]> {
        const res = [];
        for (const s of stmts) {
          res.push(await s.run());
        }
        return res as D1Result<T>[];
      },
      async exec(sql: string): Promise<D1ExecResult> {
        rawDb.exec(sql);
        return { count: 1, duration: 0 };
      },
    } as unknown as D1Database;

    g.__SQLITE_D1_ADAPTER__ = adapter;
    return adapter;
  } catch {
    return null;
  }
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

  // 2. Em ambiente Node local de desenvolvimento, conecta ao SQLite do D1
  const localDb = tryGetNodeSqlite();
  if (localDb) {
    return localDb;
  }

  // 3. Retorna um mock/dummy D1 para garantir que a renderização SSR e build estático não quebrem
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
