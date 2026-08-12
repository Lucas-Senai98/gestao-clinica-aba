/**
 * src/server/types.ts
 *
 * Tipos TypeScript que espelham as linhas retornadas pelo D1.
 * Esses tipos são usados nas Server Functions e podem ser importados
 * pelo cliente com segurança de tipos via TanStack Start.
 */

// ── Enums compartilhados ──────────────────────────────────────────────────────

export type Role = "admin" | "therapist" | "parent";
export type PatientStatus = "Ativo" | "Em avaliação" | "Pausado" | "Alta";
export type SkillLevel = "Não iniciado" | "Em aquisição" | "Adquirido" | "Em manutenção";
export type Preference = "Alta" | "Média" | "Baixa";
export type Intensity = "Leve" | "Moderada" | "Intensa";
export type Frequency = "Alta" | "Média" | "Baixa";
export type PeiStatus = "Em andamento" | "Atingida" | "Suspensa";
export type Mood = "ótimo" | "bom" | "neutro" | "difícil";
export type AppointmentStatus =
  | "Agendada"
  | "Confirmada"
  | "Em andamento"
  | "Concluída"
  | "Cancelada"
  | "Remarcada";
export type RecordStatus = "draft" | "submitted" | "approved";

// ── Entidades do banco ────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  registry: string | null;
  avatar_initials: string | null;
  is_active: number; // 0 | 1 (SQLite boolean)
  created_at: string;
  updated_at: string;
}

export interface DbPatient {
  id: string;
  name: string;
  birth_date: string;
  gender: string | null;
  cpf: string | null;
  diagnosis: string;
  school: string | null;
  avatar_initials: string | null;
  insurance: string | null;
  insurance_number: string | null;
  weekly_hours: string | null;
  status: PatientStatus;
  guardian_name: string;
  guardian_relation: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  address: string | null;
  clinical_notes: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
}

/** Paciente com lista de terapias e terapeuta de referência (para listagem). */
export interface PatientSummary {
  id: string;
  name: string;
  age: number; // calculado no servidor: FLOOR((today - birth_date) / 365.25)
  diagnosis: string;
  avatar_initials: string | null;
  guardian: string;
  status: PatientStatus;
  progress: number;
  therapist_name: string | null;
}

export interface DbRepertoireRecord {
  id: string;
  patient_id: string;
  author_id: string;
  category: string;
  skill: string;
  level: SkillLevel;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbReinforcerRecord {
  id: string;
  patient_id: string;
  author_id: string;
  item: string;
  category: string;
  preference: Preference;
  notes: string | null;
  created_at: string;
}

export interface DbStereotypyRecord {
  id: string;
  patient_id: string;
  author_id: string;
  category: string;
  topography: string;
  frequency: Frequency;
  intensity: Intensity;
  context: string | null;
  probable_function: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbClinicalChecklist {
  id: string;
  patient_id: string;
  author_id: string;
  step1_done: number;
  step1_text: string | null;
  step2_done: number;
  step2_text: string | null;
  step3_done: number;
  step3_text: string | null;
  step4_done: number;
  step4_text: string | null;
  step5_done: number;
  step5_text: string | null;
  step6_done: number;
  step6_text: string | null;
  step7_done: number;
  step7_text: string | null;
  step8_done: number;
  step8_text: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DbDailyRecord {
  id: string;
  patient_id: string;
  therapist_id: string;
  session_date: string;
  session_time: string | null;
  duration_min: number | null;
  cooperation: number;
  attention: number;
  inappropriate: number;
  transitions: "facil" | "moderada" | "dificil";
  eye_contact: "adequado" | "parcial" | "ausente";
  communication: "adequada" | "parcial" | "ausente";
  reinforcers_used: string | null;
  general_notes: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface DbTargetRecord {
  id: string;
  daily_record_id: string;
  patient_id: string;
  target_name: string;
  trials: number;
  correct: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
  /** Calculado no servidor: (correct / trials) * 100 */
  performance_pct?: number;
}

export interface DbBehaviorRecord {
  id: string;
  daily_record_id: string;
  patient_id: string;
  topography: string;
  duration_min: number | null;
  intensity: Intensity;
  context: string | null;
  notes: string | null;
  created_at: string;
}

export interface DbPeiGoal {
  id: string;
  patient_id: string;
  responsible_id: string | null;
  area: string;
  goal: string;
  criteria: string;
  baseline: number;
  current_val: number;
  target_val: number;
  status: PeiStatus;
  review_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAppointment {
  id: string;
  patient_id: string;
  therapist_id: string;
  scheduled_at: string;
  duration_min: number;
  therapy_type: string;
  room: string | null;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbParentFeed {
  id: string;
  patient_id: string;
  daily_record_id: string | null;
  author_id: string;
  title: string;
  body: string;
  mood: Mood;
  home_practices: string | null; // JSON array
  published_at: string;
}

export interface DbForumThread {
  id: string;
  author_id: string;
  patient_id: string | null;
  title: string;
  preview: string | null;
  is_pinned: number;
  created_at: string;
  updated_at: string;
}

export interface DbForumReply {
  id: string;
  thread_id: string;
  author_id: string;
  text: string;
  created_at: string;
  updated_at: string;
}
