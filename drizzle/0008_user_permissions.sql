-- ============================================================
-- Migração Drizzle 0008: Sistema de Permissões Granulares
-- ============================================================

ALTER TABLE users ADD COLUMN permissions TEXT;

UPDATE users
SET permissions = '["*"]'
WHERE is_master = 1;

