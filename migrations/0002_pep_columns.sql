-- ============================================================
-- Migração 0002: Campos adicionais para o PEP clínico
-- ============================================================
PRAGMA foreign_keys = ON;

-- Adiciona campos de avaliação de preferência em reinforcer_records
ALTER TABLE reinforcer_records ADD COLUMN procura_sozinho  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reinforcer_records ADD COLUMN chora_se_retirado INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reinforcer_records ADD COLUMN engagement_min   REAL;          -- duração de engajamento (min em 10 min de avaliação)
ALTER TABLE reinforcer_records ADD COLUMN frequency_pct    REAL;          -- % de escolha em 5 min de avaliação

-- Adiciona campo de interferência no ensino em stereotypy_records
ALTER TABLE stereotypy_records ADD COLUMN interferes_teaching INTEGER NOT NULL DEFAULT 0;
