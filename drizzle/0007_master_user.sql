-- ============================================================
-- Migração 0007: usuário master e permissão superior de usuários
-- ============================================================

ALTER TABLE users ADD COLUMN is_master INTEGER NOT NULL DEFAULT 0;

INSERT OR IGNORE INTO users (
  id, email, name, role, password_hash, password_salt,
  registry, avatar_initials, is_active, is_master, change_password_required
) VALUES (
  'u-master-01',
  'master@gizeclinica.com.br',
  'Usuário Master',
  'admin',
  '0e517388945986804754395d9b37010671c11f89aa9ef16963a4e98870af9b3b',
  '709c439ebfab66302a49b49a48a3a513872f74b73004667f334d133b5b22040f',
  NULL,
  'UM',
  1,
  1,
  0
);

UPDATE users
SET is_master = 1
WHERE email = 'master@gizeclinica.com.br';
