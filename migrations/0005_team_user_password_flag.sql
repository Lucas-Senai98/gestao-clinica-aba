-- ============================================================
-- MIGRATION 0005: CONTROLE DE TROCA DE SENHA OBRIGATÓRIA NO 1º ACESSO
-- ============================================================

ALTER TABLE users ADD COLUMN change_password_required INTEGER NOT NULL DEFAULT 1;
