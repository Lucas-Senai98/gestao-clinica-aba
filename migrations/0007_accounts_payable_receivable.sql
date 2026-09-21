-- migrations/0007_accounts_payable_receivable.sql
-- Módulo de Contas a Pagar e Contas a Receber (Gestão Financeira Completa)

CREATE TABLE IF NOT EXISTS financial_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('receivable', 'payable')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  payment_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'overdue', 'cancelled')),
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  therapist_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_financial_entries_type_status ON financial_entries(type, status);
CREATE INDEX IF NOT EXISTS idx_financial_entries_due_date ON financial_entries(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_entries_patient_id ON financial_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_therapist_id ON financial_entries(therapist_id);

