-- ============================================================
-- SEED DE DESENVOLVIMENTO — Sistema GiZé's
-- ⚠️  NUNCA RODAR EM PRODUÇÃO (senhas são exemplos simples)
-- ============================================================
-- Senhas geradas com PBKDF2-SHA256, 100000 iterações.
-- Senha de todos os usuários de exemplo: "Gizes@2025"
-- Salt: gizes_dev_salt_2025 (fixo para reprodutibilidade em dev)
-- hash = sha256(pbkdf2(senha, salt, 100000)) — a Server Function valida isso.
--
-- Para geração real em produção, use a tela de configuração ou
-- o script `scripts/hash-password.mjs`.
-- ============================================================

-- Usuários
INSERT OR IGNORE INTO users (id, email, name, role, password_hash, password_salt, registry, avatar_initials, is_active) VALUES
  ('u-admin-01',     'supervisora@gizeclinica.com.br', 'Marina Duarte',      'admin',     'PLACEHOLDER_HASH', 'PLACEHOLDER_SALT', 'CRP 06/77889',      'MD', 1),
  ('u-therapist-01', 'ana.lopes@gizeclinica.com.br',  'Ana Beatriz Lopes',  'therapist', 'PLACEHOLDER_HASH', 'PLACEHOLDER_SALT', 'CRP 06/12345',      'AB', 1),
  ('u-therapist-02', 'carla.mendes@gizeclinica.com.br','Carla Mendes',       'therapist', 'PLACEHOLDER_HASH', 'PLACEHOLDER_SALT', 'CRFa 2-98765',      'CM', 1),
  ('u-therapist-03', 'diego.ramos@gizeclinica.com.br', 'Diego Ramos',        'therapist', 'PLACEHOLDER_HASH', 'PLACEHOLDER_SALT', 'CRP 06/54321',      'DR', 1),
  ('u-therapist-04', 'fernanda.souza@gizeclinica.com.br','Fernanda Souza',   'therapist', 'PLACEHOLDER_HASH', 'PLACEHOLDER_SALT', 'CREFITO 3/11223',   'FS', 1),
  ('u-parent-01',    'mariana.almeida@email.com',      'Mariana Almeida',    'parent',    'PLACEHOLDER_HASH', 'PLACEHOLDER_SALT', NULL,                 'MA', 1),
  ('u-parent-02',    'rafael.pereira@email.com',       'Rafael Pereira',     'parent',    'PLACEHOLDER_HASH', 'PLACEHOLDER_SALT', NULL,                 'RP', 1);

-- Pacientes
INSERT OR IGNORE INTO patients (id, name, birth_date, gender, diagnosis, avatar_initials, insurance, weekly_hours, status, guardian_name, guardian_phone, guardian_email, guardian_relation, progress) VALUES
  ('p1', 'Lucas Almeida',  '2021-03-15', 'Masculino', 'TEA Nível 2',         'LA', 'Particular', '8h',  'Ativo', 'Mariana Almeida', '(11) 99100-2030', 'mariana.almeida@email.com', 'Mãe', 78),
  ('p2', 'Sofia Pereira',  '2022-05-20', 'Feminino',  'TEA Nível 1',         'SP', 'Unimed',     '6h',  'Ativo', 'Rafael Pereira',  '(11) 99200-4050', 'rafael.pereira@email.com',  'Pai', 64),
  ('p3', 'Bento Oliveira', '2020-08-10', 'Masculino', 'TEA Nível 2 + TDAH',  'BO', 'Bradesco',   '10h', 'Ativo', 'Juliana Oliveira','(11) 99300-6070', 'ju.oliveira@email.com',     'Mãe', 52),
  ('p4', 'Helena Costa',   '2023-01-05', 'Feminino',  'Atraso de linguagem', 'HC', 'Particular', '4h',  'Ativo', 'Pedro Costa',     '(11) 99400-8090', 'pedro.costa@email.com',     'Pai', 81);

-- Terapias indicadas
INSERT OR IGNORE INTO patient_therapies (id, patient_id, therapy) VALUES
  ('pt1', 'p1', 'ABA Intensivo'),
  ('pt2', 'p1', 'Fonoaudiologia'),
  ('pt3', 'p2', 'ABA Intensivo'),
  ('pt4', 'p3', 'ABA Intensivo'),
  ('pt5', 'p3', 'Psicologia'),
  ('pt6', 'p4', 'Fonoaudiologia'),
  ('pt7', 'p4', 'Terapia Ocupacional');

-- Vínculos terapeuta-paciente
INSERT OR IGNORE INTO patient_therapist (id, patient_id, therapist_id, role_in_case) VALUES
  ('lnk1', 'p1', 'u-therapist-01', 'principal'),
  ('lnk2', 'p2', 'u-therapist-01', 'principal'),
  ('lnk3', 'p3', 'u-therapist-01', 'co-terapeuta'),
  ('lnk4', 'p3', 'u-therapist-03', 'principal'),
  ('lnk5', 'p4', 'u-therapist-02', 'principal'),
  ('lnk6', 'p4', 'u-therapist-04', 'co-terapeuta');

-- Vínculos responsável-paciente
INSERT OR IGNORE INTO patient_guardian (id, patient_id, guardian_id, relation) VALUES
  ('grd1', 'p1', 'u-parent-01', 'Mãe'),
  ('grd2', 'p2', 'u-parent-02', 'Pai');

-- Repertório inicial de Lucas (p1)
INSERT OR IGNORE INTO repertoire_records (id, patient_id, author_id, category, skill, level, start_date, end_date) VALUES
  ('rr01', 'p1', 'u-therapist-01', 'Atenção',             'Mantém contato visual por 3s',     'Adquirido',    '2025-02-10', '2025-03-22'),
  ('rr02', 'p1', 'u-therapist-01', 'Atenção',             'Atenção compartilhada',            'Em aquisição', '2025-04-01', NULL),
  ('rr03', 'p1', 'u-therapist-01', 'Atenção',             'Resposta ao nome',                 'Adquirido',    '2025-02-10', '2025-02-28'),
  ('rr04', 'p1', 'u-therapist-01', 'Imitação',            'Imita motor grosso',               'Adquirido',    '2025-02-10', '2025-03-15'),
  ('rr05', 'p1', 'u-therapist-01', 'Imitação',            'Imita motor fino',                 'Em aquisição', '2025-03-20', NULL),
  ('rr06', 'p1', 'u-therapist-01', 'Imitação',            'Imita vocal simples',              'Em aquisição', '2025-04-01', NULL),
  ('rr07', 'p1', 'u-therapist-01', 'Linguagem Receptiva', 'Segue 1 instrução simples',        'Adquirido',    '2025-02-10', '2025-03-10'),
  ('rr08', 'p1', 'u-therapist-01', 'Linguagem Receptiva', 'Identifica objetos comuns',        'Em aquisição', '2025-03-15', NULL),
  ('rr09', 'p1', 'u-therapist-01', 'Linguagem Expressiva','Solicita reforçador (mando)',       'Em aquisição', '2025-03-01', NULL),
  ('rr10', 'p1', 'u-therapist-01', 'Linguagem Expressiva','Nomeia 10 figuras (tato)',          'Não iniciado', NULL,         NULL),
  ('rr11', 'p1', 'u-therapist-01', 'Pré-Acadêmicas',      'Pareamento de cores',              'Adquirido',    '2025-02-10', '2025-03-05'),
  ('rr12', 'p1', 'u-therapist-01', 'Pré-Acadêmicas',      'Conta até 5',                      'Em aquisição', '2025-03-10', NULL);

-- Reforçadores de Lucas (p1)
INSERT OR IGNORE INTO reinforcer_records (id, patient_id, author_id, item, category, preference) VALUES
  ('ref1', 'p1', 'u-therapist-01', 'Bolhas de sabão',   'Sensorial',   'Alta'),
  ('ref2', 'p1', 'u-therapist-01', 'Carrinho azul',     'Brinquedo',   'Alta'),
  ('ref3', 'p1', 'u-therapist-01', 'Música infantil',   'Auditivo',    'Média'),
  ('ref4', 'p1', 'u-therapist-01', 'Biscoito recheado', 'Comestível',  'Alta'),
  ('ref5', 'p1', 'u-therapist-01', 'Elogio + palmas',   'Social',      'Média');

-- Padrões autoestimulatórios de Lucas (p1)
INSERT OR IGNORE INTO stereotypy_records (id, patient_id, author_id, category, topography, frequency, intensity, context, probable_function) VALUES
  ('ste1', 'p1', 'u-therapist-01', 'Motora', 'Bater palmas repetidamente', 'Alta', 'Moderada', 'Ao ouvir música',  'Auto-regulação sensorial'),
  ('ste2', 'p1', 'u-therapist-01', 'Vocal',  'Repetição de palavras (ecolalia)', 'Média', 'Leve', 'Durante transições', 'Auto-estimulação / fuga'),
  ('ste3', 'p1', 'u-therapist-01', 'Visual', 'Observar luzes piscando', 'Baixa', 'Leve', 'Ambiente novo', 'Estimulação visual');

-- Metas PEI de Lucas (p1)
INSERT OR IGNORE INTO pei_goals (id, patient_id, responsible_id, area, goal, criteria, baseline, current_val, target_val, status, review_date) VALUES
  ('g1', 'p1', 'u-therapist-01', 'Comunicação',       'Solicitar 10 itens preferidos com fala funcional',    '80% de acerto em 3 sessões consecutivas', 20, 62, 80, 'Em andamento', '2025-06-15'),
  ('g2', 'p1', 'u-therapist-03', 'Habilidades Sociais','Aguardar a vez em jogo de turnos por 3 rodadas',     '3 rodadas sem suporte físico',              10, 45, 75, 'Em andamento', '2025-06-10'),
  ('g3', 'p1', 'u-therapist-04', 'Autonomia',          'Lavar as mãos com encadeamento completo',             'Independência em 5 tentativas',             30, 90, 85, 'Atingida',     NULL),
  ('g4', 'p1', 'u-therapist-01', 'Pré-Acadêmicas',    'Identificar números de 1 a 10',                       '90% de acerto em 2 sessões',                15, 38, 90, 'Em andamento', '2025-06-20'),
  ('g5', 'p1', 'u-admin-01',     'Comportamento',      'Reduzir fuga de demanda para até 2 episódios/sessão', 'Média semanal ≤ 2 episódios',               70, 55, 30, 'Suspensa',     NULL);
