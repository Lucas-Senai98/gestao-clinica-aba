-- ============================================================
-- SISTEMA DE GESTÃO CLÍNICA GIZÉ'S — Migração 0000: Schema Inicial
-- Banco: Cloudflare D1 (SQLite)
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- USUÁRIOS E CONTROLE DE ACESSO (RBAC)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,                                       -- UUID v4
  email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK(role IN ('admin', 'therapist', 'parent')),
  password_hash TEXT NOT NULL,                                        -- PBKDF2-SHA256 (hex)
  password_salt TEXT NOT NULL,                                        -- salt aleatório (hex)
  registry    TEXT,                                                   -- CRP, CRFa, CREFITO etc.
  avatar_initials TEXT,                                               -- ex: "AB"
  is_active   INTEGER NOT NULL DEFAULT 1,                             -- 0 = inativo
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- PACIENTES
-- ============================================================

CREATE TABLE IF NOT EXISTS patients (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  birth_date      TEXT NOT NULL,                                      -- ISO 8601: YYYY-MM-DD
  gender          TEXT CHECK(gender IN ('Feminino', 'Masculino', 'Não informar')),
  cpf             TEXT,
  diagnosis       TEXT NOT NULL,                                      -- ex: "TEA Nível 2 + TDAH"
  school          TEXT,
  avatar_initials TEXT,                                               -- ex: "LA"
  -- Convênio
  insurance       TEXT DEFAULT 'Particular',
  insurance_number TEXT,
  weekly_hours    TEXT,                                               -- ex: "8h"
  status          TEXT NOT NULL DEFAULT 'Ativo'
                    CHECK(status IN ('Ativo', 'Em avaliação', 'Pausado', 'Alta')),
  -- Responsável principal
  guardian_name   TEXT NOT NULL,
  guardian_relation TEXT,
  guardian_phone  TEXT,
  guardian_email  TEXT,
  address         TEXT,
  -- Observações clínicas internas
  clinical_notes  TEXT,
  progress        INTEGER NOT NULL DEFAULT 0,                         -- 0–100%
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Terapias indicadas para o paciente (1-N)
CREATE TABLE IF NOT EXISTS patient_therapies (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapy     TEXT NOT NULL,                                          -- ex: "ABA Intensivo"
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TABELAS PIVÔ: VÍNCULOS DE ACESSO
-- ============================================================

-- Limita quais terapeutas têm acesso a cada paciente
CREATE TABLE IF NOT EXISTS patient_therapist (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_case  TEXT DEFAULT 'principal',                             -- 'principal' | 'co-terapeuta'
  assigned_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(patient_id, therapist_id)
);

-- Vincula um responsável (parent) ao seu filho/paciente
CREATE TABLE IF NOT EXISTS patient_guardian (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  guardian_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- user com role='parent'
  relation      TEXT,                                                   -- ex: "Mãe", "Pai"
  assigned_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(patient_id, guardian_id)
);

-- ============================================================
-- PEP CLÍNICO — CHECKLIST CLÍNICO ABA (8 PASSOS)
-- ============================================================

CREATE TABLE IF NOT EXISTS clinical_checklists (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id),
  -- 8 passos do checklist clínico (checkbox + campo de texto)
  step1_done  INTEGER NOT NULL DEFAULT 0,
  step1_text  TEXT,                   -- "O que está acontecendo (descrição topográfica)"
  step2_done  INTEGER NOT NULL DEFAULT 0,
  step2_text  TEXT,                   -- "Contexto (demandas, pessoas, ambiente)"
  step3_done  INTEGER NOT NULL DEFAULT 0,
  step3_text  TEXT,                   -- "Padrão (duração, frequência, escalada)"
  step4_done  INTEGER NOT NULL DEFAULT 0,
  step4_text  TEXT,                   -- "Hipótese inicial da função (fuga, atenção, auto-estimulação)"
  step5_done  INTEGER NOT NULL DEFAULT 0,
  step5_text  TEXT,                   -- "O que falta no repertório"
  step6_done  INTEGER NOT NULL DEFAULT 0,
  step6_text  TEXT,                   -- "Prioridade clínica"
  step7_done  INTEGER NOT NULL DEFAULT 0,
  step7_text  TEXT,                   -- "Estratégia de intervenção proposta"
  step8_done  INTEGER NOT NULL DEFAULT 0,
  step8_text  TEXT,                   -- "Indicadores de progresso / critério de encerramento"
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- PEP CLÍNICO — REPERTÓRIO INICIAL DE HABILIDADES
-- ============================================================

CREATE TABLE IF NOT EXISTS repertoire_records (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id),
  -- Área de habilidade
  category    TEXT NOT NULL,                                          -- ex: "Atenção", "Imitação"
  skill       TEXT NOT NULL,                                          -- ex: "Mantém contato visual por 3s"
  level       TEXT NOT NULL
                CHECK(level IN ('Não iniciado', 'Em aquisição', 'Adquirido', 'Em manutenção')),
  start_date  TEXT,                                                   -- YYYY-MM-DD
  end_date    TEXT,                                                   -- YYYY-MM-DD (null = em andamento)
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- PEP CLÍNICO — MAPEAMENTO DE REFORÇADORES E PREFERÊNCIAS
-- ============================================================

CREATE TABLE IF NOT EXISTS reinforcer_records (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id),
  item        TEXT NOT NULL,                                          -- ex: "Bolhas de sabão"
  category    TEXT NOT NULL,                                          -- ex: "Sensorial", "Comestível"
  preference  TEXT NOT NULL CHECK(preference IN ('Alta', 'Média', 'Baixa')),
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Padrões autoestimulatórios (dentro do módulo de Mapeamento)
CREATE TABLE IF NOT EXISTS stereotypy_records (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id),
  category    TEXT NOT NULL,                                          -- ex: "Motora", "Vocal"
  topography  TEXT NOT NULL,                                          -- ex: "Bater palmas repetidamente"
  frequency   TEXT NOT NULL CHECK(frequency IN ('Alta', 'Média', 'Baixa')),
  intensity   TEXT NOT NULL CHECK(intensity IN ('Leve', 'Moderada', 'Intensa')),
  context     TEXT,                                                   -- ex: "Ao ouvir música"
  probable_function TEXT,                                             -- ex: "Auto-regulação sensorial"
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- FOLHA DE REGISTRO DIÁRIO — SESSÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_records (
  id              TEXT PRIMARY KEY,
  patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id    TEXT NOT NULL REFERENCES users(id),
  session_date    TEXT NOT NULL,                                      -- YYYY-MM-DD
  session_time    TEXT,                                               -- HH:MM
  duration_min    INTEGER,                                            -- Duração em minutos
  -- Seção 1: Comportamentos (Sim/Não)
  cooperation     INTEGER NOT NULL DEFAULT 1,                         -- 0/1
  attention       INTEGER NOT NULL DEFAULT 1,
  inappropriate   INTEGER NOT NULL DEFAULT 0,
  -- Seção 1: Escalas (radio groups)
  transitions     TEXT DEFAULT 'facil'
                    CHECK(transitions IN ('facil', 'moderada', 'dificil')),
  eye_contact     TEXT DEFAULT 'adequado'
                    CHECK(eye_contact IN ('adequado', 'parcial', 'ausente')),
  communication   TEXT DEFAULT 'parcial'
                    CHECK(communication IN ('adequada', 'parcial', 'ausente')),
  -- Seção 3 e 4
  reinforcers_used TEXT,
  general_notes   TEXT,
  -- Controle
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK(status IN ('draft', 'submitted', 'approved')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- FOLHA DE REGISTRO — PROGRAMAS DE ENSINO (ALVOS)
-- ============================================================

CREATE TABLE IF NOT EXISTS target_records (
  id              TEXT PRIMARY KEY,
  daily_record_id TEXT NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  target_name     TEXT NOT NULL,                                      -- ex: "Pareamento por cor"
  trials          INTEGER NOT NULL DEFAULT 0,                         -- tentativas
  correct         INTEGER NOT NULL DEFAULT 0,                         -- acertos
  -- Calculado: performance = (correct / trials) * 100
  -- Mantemos os valores brutos para recalcular quando necessário
  notes           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- FOLHA DE REGISTRO — COMPORTAMENTOS-PROBLEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS behavior_records (
  id              TEXT PRIMARY KEY,
  daily_record_id TEXT NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  topography      TEXT NOT NULL,                                      -- descrição do comportamento
  duration_min    REAL,                                               -- duração em minutos (decimal)
  intensity       TEXT NOT NULL
                    CHECK(intensity IN ('Leve', 'Moderada', 'Intensa')),
  context         TEXT,                                               -- contexto do episódio
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- PEI — PLANO DE ENSINO INDIVIDUALIZADO
-- ============================================================

CREATE TABLE IF NOT EXISTS pei_goals (
  id           TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  responsible_id TEXT REFERENCES users(id),
  area         TEXT NOT NULL,                                         -- ex: "Comunicação"
  goal         TEXT NOT NULL,                                         -- descrição da meta
  criteria     TEXT NOT NULL,                                         -- critério de domínio
  baseline     INTEGER NOT NULL DEFAULT 0,                            -- 0–100
  current_val  INTEGER NOT NULL DEFAULT 0,
  target_val   INTEGER NOT NULL DEFAULT 80,
  status       TEXT NOT NULL DEFAULT 'Em andamento'
                 CHECK(status IN ('Em andamento', 'Atingida', 'Suspensa')),
  review_date  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pei_history (
  id           TEXT PRIMARY KEY,
  goal_id      TEXT NOT NULL REFERENCES pei_goals(id) ON DELETE CASCADE,
  patient_id   TEXT NOT NULL REFERENCES patients(id),
  author_id    TEXT NOT NULL REFERENCES users(id),
  note         TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- AGENDA / APPOINTMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS appointments (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id  TEXT NOT NULL REFERENCES users(id),
  scheduled_at  TEXT NOT NULL,                                        -- ISO 8601 datetime
  duration_min  INTEGER NOT NULL DEFAULT 50,
  therapy_type  TEXT NOT NULL,                                        -- ex: "ABA Intensivo"
  room          TEXT,
  status        TEXT NOT NULL DEFAULT 'Agendada'
                  CHECK(status IN ('Agendada', 'Confirmada', 'Em andamento', 'Concluída', 'Cancelada', 'Remarcada')),
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- PORTAL DOS PAIS — DEVOLUTIVAS DIÁRIAS
-- ============================================================

CREATE TABLE IF NOT EXISTS parent_feed (
  id              TEXT PRIMARY KEY,
  patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  daily_record_id TEXT REFERENCES daily_records(id),                  -- vínculo com a sessão
  author_id       TEXT NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,                                      -- linguagem acessível (sem jargão)
  mood            TEXT DEFAULT 'bom'
                    CHECK(mood IN ('ótimo', 'bom', 'neutro', 'difícil')),
  home_practices  TEXT,                                               -- dicas para casa (JSON array)
  published_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- PORTAL DOS PAIS — QUADRO DE AVISOS
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  -- null = aviso global para todos os pais; preenchido = apenas pacientes desta clínica
  target_patient_id TEXT REFERENCES patients(id),
  is_active   INTEGER NOT NULL DEFAULT 1,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT                                                   -- null = sem expiração
);

-- ============================================================
-- FÓRUM CLÍNICO INTERNO
-- ============================================================

CREATE TABLE IF NOT EXISTS forum_threads (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id),
  patient_id  TEXT REFERENCES patients(id),                           -- null = assunto geral
  title       TEXT NOT NULL,
  preview     TEXT,
  is_pinned   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS forum_replies (
  id          TEXT PRIMARY KEY,
  thread_id   TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id),
  text        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- NOTIFICAÇÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK(kind IN ('alerta', 'info', 'aviso')),
  is_read     INTEGER NOT NULL DEFAULT 0,
  link        TEXT,                                                   -- rota interna opcional
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- SESSÕES DE AUTENTICAÇÃO
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_sessions (
  id          TEXT PRIMARY KEY,                                       -- token da sessão (UUID v4)
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,                                          -- ISO 8601 datetime
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address  TEXT,
  user_agent  TEXT
);

-- ============================================================
-- ÍNDICES PARA CONSULTAS FREQUENTES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_patients_status           ON patients(status);
CREATE INDEX IF NOT EXISTS idx_pt_patient                ON patient_therapist(patient_id);
CREATE INDEX IF NOT EXISTS idx_pt_therapist              ON patient_therapist(therapist_id);
CREATE INDEX IF NOT EXISTS idx_pg_guardian               ON patient_guardian(guardian_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_patient     ON daily_records(patient_id, session_date);
CREATE INDEX IF NOT EXISTS idx_daily_records_therapist   ON daily_records(therapist_id, session_date);
CREATE INDEX IF NOT EXISTS idx_target_records_daily      ON target_records(daily_record_id);
CREATE INDEX IF NOT EXISTS idx_behavior_records_daily    ON behavior_records(daily_record_id);
CREATE INDEX IF NOT EXISTS idx_repertoire_patient        ON repertoire_records(patient_id, category);
CREATE INDEX IF NOT EXISTS idx_reinforcer_patient        ON reinforcer_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_stereotypy_patient        ON stereotypy_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_pei_goals_patient         ON pei_goals(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_pei_history_goal          ON pei_history(goal_id);
CREATE INDEX IF NOT EXISTS idx_checklist_patient         ON clinical_checklists(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient      ON appointments(patient_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist    ON appointments(therapist_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_parent_feed_patient       ON parent_feed(patient_id, published_at);
CREATE INDEX IF NOT EXISTS idx_forum_threads_patient     ON forum_threads(patient_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread      ON forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user        ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user        ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires     ON auth_sessions(expires_at);
