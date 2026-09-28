-- drizzle/0009_cash_closings.sql
-- Fechamento de Caixa mensal do módulo financeiro

CREATE TABLE IF NOT EXISTS cash_closings (
  id TEXT PRIMARY KEY,
  period_month TEXT NOT NULL,
  closed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  opening_balance REAL NOT NULL DEFAULT 0,
  total_inflows REAL NOT NULL DEFAULT 0,
  total_outflows REAL NOT NULL DEFAULT 0,
  expected_balance REAL NOT NULL DEFAULT 0,
  counted_balance REAL NOT NULL DEFAULT 0,
  difference REAL NOT NULL DEFAULT 0,
  pending_receivables REAL NOT NULL DEFAULT 0,
  pending_payables REAL NOT NULL DEFAULT 0,
  overdue_total REAL NOT NULL DEFAULT 0,
  entries_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'closed' CHECK(status IN ('draft', 'closed', 'reopened')),
  closed_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_closings_period_month
ON cash_closings(period_month);

CREATE INDEX IF NOT EXISTS idx_cash_closings_closed_at
ON cash_closings(closed_at);

