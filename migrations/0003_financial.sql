-- ============================================================
-- MIGRATION 0003: MÓDULO FINANCEIRO E DE REPASSE
-- ============================================================

-- Taxas de Faturamento por Paciente (Cobrança Particular ou Convênio)
CREATE TABLE IF NOT EXISTS patient_billing_rates (
  id              TEXT PRIMARY KEY,
  patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  rate_value      REAL NOT NULL DEFAULT 150.0,
  billing_type    TEXT NOT NULL DEFAULT 'particular' CHECK(billing_type IN ('particular', 'convenio')),
  insurance_name  TEXT,                                       -- ex: "Unimed", "Bradesco Saúde", null se particular
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Taxas de Repasse aos Terapeutas (Hora/aula ou Sessão)
CREATE TABLE IF NOT EXISTS therapist_payment_rates (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hourly_rate     REAL NOT NULL DEFAULT 80.0,                 -- valor por hora de atendimento
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para buscas financeiras rápidas
CREATE INDEX IF NOT EXISTS idx_patient_billing_patient ON patient_billing_rates(patient_id);
CREATE INDEX IF NOT EXISTS idx_therapist_payment_user  ON therapist_payment_rates(user_id);
