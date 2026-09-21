-- ============================================================
-- Migração 0009: Sistema de Permissões Granulares por Usuário
-- ============================================================

ALTER TABLE users ADD COLUMN permissions TEXT;

-- Concede acesso total wildcard para os usuários master
UPDATE users
SET permissions = '["*"]'
WHERE is_master = 1;

