-- ============================================================
-- MIGRATION 0005: CRUD OPERACIONAL
-- Sessões canceláveis, relatórios persistentes e índices auxiliares
-- ============================================================

ALTER TABLE daily_records ADD COLUMN cancelled_at TEXT;
ALTER TABLE daily_records ADD COLUMN cancel_reason TEXT;

CREATE TABLE IF NOT EXISTS clinical_reports (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id),
  template_id TEXT NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'Rascunho'
                CHECK(status IN ('Rascunho', 'Emitido', 'Arquivado')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clinical_reports_patient ON clinical_reports(patient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clinical_reports_author  ON clinical_reports(author_id, created_at);
