-- ============================================================
-- MIGRATION 0010: NORMALIZAR TABELA DE NOTIFICAÇÕES (SCHEMA NOTIFICATIONS_AUDIT)
-- ============================================================

DROP TABLE IF EXISTS notifications;

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('devolutiva', 'announcement', 'forum', 'info')),
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

