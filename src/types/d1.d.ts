/**
 * src/types/d1.d.ts
 * Declaração global dos tipos do Cloudflare D1 Database para o TypeScript.
 */

export {};

declare global {
  interface D1Result<T = Record<string, unknown>> {
    results: T[];
    success: boolean;
    meta?: {
      duration?: number;
      size_after?: number;
      rows_read?: number;
      rows_written?: number;
      last_row_id?: number;
      changed_db?: boolean;
      changes?: number;
    };
    error?: string;
  }

  interface D1ExecResult {
    count: number;
    duration: number;
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
    run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
    all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<D1ExecResult>;
  }
}
