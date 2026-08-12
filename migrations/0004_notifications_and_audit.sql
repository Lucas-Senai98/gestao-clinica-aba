-- ============================================================
-- MIGRATION 0004: CENTRAL DE NOTIFICAÇÕES E TRILHA DE AUDITORIA LGPD
-- ============================================================

-- Tabela de Notificações In-App para Terapeutas e Responsáveis
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('devolutiva', 'announcement', 'forum', 'info')),
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabela de Trilha de Auditoria e Conformidade LGPD
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id  TEXT REFERENCES patients(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,                                 -- ex: 'VIEW_PEP', 'EDIT_CHECKLIST', 'EXPORT_PDF', 'LOGIN'
  resource    TEXT NOT NULL,                                 -- ex: 'patients', 'daily_records', 'checklist'
  ip_address  TEXT DEFAULT '127.0.0.1',
  timestamp   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para otimização de consultas de notificações e auditoria
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp   ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient     ON audit_logs(patient_id);
