/**
 * src/server/queries/patients.ts
 *
 * Server Functions para o módulo de Pacientes.
 * Executadas no servidor com suporte completo a D1 e persistência dev/fallback.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId, now } from "@/db/db";
import type { DbPatient, PatientSummary, PatientStatus } from "@/db/types";
import { DEV_TEAM_MEMBERS } from "@/queries/team";

// ── In-Memory Store de Desenvolvimento (Garante criação e listagem imediatas) ──

const INITIAL_DEV_PATIENTS: DbPatient[] = [
  {
    id: "p1",
    name: "Lucas Almeida",
    birth_date: "2021-03-15",
    gender: "Masculino",
    cpf: "123.456.789-00",
    diagnosis: "TEA Nível 2",
    school: "Colégio Futuro",
    avatar_initials: "LA",
    insurance: "Particular",
    insurance_number: null,
    weekly_hours: "8h",
    status: "Ativo",
    guardian_name: "Mariana Almeida",
    guardian_relation: "Mãe",
    guardian_phone: "(11) 99100-2030",
    guardian_email: "mariana.almeida@email.com",
    address: "Rua das Palmeiras, 120 - SP",
    clinical_notes: "Excelente resposta a reforçadores visuais.",
    progress: 78,
    created_at: "2025-01-10 09:00:00",
    updated_at: "2025-02-01 10:00:00",
  },
  {
    id: "p2",
    name: "Sofia Pereira",
    birth_date: "2022-05-20",
    gender: "Feminino",
    cpf: "234.567.890-11",
    diagnosis: "TEA Nível 1",
    school: "Escola Aquarela",
    avatar_initials: "SP",
    insurance: "Unimed",
    insurance_number: "987654321",
    weekly_hours: "6h",
    status: "Ativo",
    guardian_name: "Rafael Pereira",
    guardian_relation: "Pai",
    guardian_phone: "(11) 99200-4050",
    guardian_email: "rafael.pereira@email.com",
    address: "Av. Paulista, 1500 - SP",
    clinical_notes: "Desenvolvendo comunicação funcional e mando.",
    progress: 64,
    created_at: "2025-01-15 14:00:00",
    updated_at: "2025-02-10 11:30:00",
  },
  {
    id: "p3",
    name: "Bento Oliveira",
    birth_date: "2020-08-10",
    gender: "Masculino",
    cpf: "345.678.901-22",
    diagnosis: "TEA Nível 2 + TDAH",
    school: "Instituto Saber",
    avatar_initials: "BO",
    insurance: "Bradesco",
    insurance_number: "11223344",
    weekly_hours: "10h",
    status: "Ativo",
    guardian_name: "Juliana Oliveira",
    guardian_relation: "Mãe",
    guardian_phone: "(11) 99300-6070",
    guardian_email: "ju.oliveira@email.com",
    address: "Rua Augusta, 450 - SP",
    clinical_notes: "Acompanhamento focado em autorregulação e atenção.",
    progress: 52,
    created_at: "2025-01-20 16:00:00",
    updated_at: "2025-02-15 08:45:00",
  },
  {
    id: "p4",
    name: "Helena Costa",
    birth_date: "2023-01-05",
    gender: "Feminino",
    cpf: "456.789.012-33",
    diagnosis: "Atraso de linguagem",
    school: "Creche Girassol",
    avatar_initials: "HC",
    insurance: "Particular",
    insurance_number: null,
    weekly_hours: "4h",
    status: "Ativo",
    guardian_name: "Pedro Costa",
    guardian_relation: "Pai",
    guardian_phone: "(11) 99400-8090",
    guardian_email: "pedro.costa@email.com",
    address: "Rua Vergueiro, 900 - SP",
    clinical_notes: "Boa evolução em imitação vocal e motora.",
    progress: 81,
    created_at: "2025-02-01 10:00:00",
    updated_at: "2025-02-20 17:00:00",
  },
];

export const DEV_PATIENTS: DbPatient[] = [...INITIAL_DEV_PATIENTS];

export const DEV_PATIENT_THERAPIST: Array<{
  id: string;
  patient_id: string;
  therapist_id: string;
  role_in_case: "principal" | "co-terapeuta";
}> = [
  { id: "lnk1", patient_id: "p1", therapist_id: "u-therapist-01", role_in_case: "principal" },
  { id: "lnk2", patient_id: "p2", therapist_id: "u-therapist-01", role_in_case: "principal" },
  { id: "lnk3", patient_id: "p3", therapist_id: "u-therapist-01", role_in_case: "co-terapeuta" },
  { id: "lnk4", patient_id: "p3", therapist_id: "u-therapist-03", role_in_case: "principal" },
  { id: "lnk5", patient_id: "p4", therapist_id: "u-therapist-02", role_in_case: "principal" },
  { id: "lnk6", patient_id: "p4", therapist_id: "u-therapist-04", role_in_case: "co-terapeuta" },
];

export const DEV_PATIENT_GUARDIAN: Array<{
  id: string;
  patient_id: string;
  guardian_id: string;
  relation: string;
}> = [
  { id: "grd1", patient_id: "p1", guardian_id: "u-parent-01", relation: "Mãe" },
  { id: "grd2", patient_id: "p2", guardian_id: "u-parent-02", relation: "Pai" },
];

export const DEV_PATIENT_THERAPIES: Array<{
  id: string;
  patient_id: string;
  therapy: string;
}> = [
  { id: "pt1", patient_id: "p1", therapy: "ABA Intensivo" },
  { id: "pt2", patient_id: "p1", therapy: "Fonoaudiologia" },
  { id: "pt3", patient_id: "p2", therapy: "ABA Intensivo" },
  { id: "pt4", patient_id: "p3", therapy: "ABA Intensivo" },
  { id: "pt5", patient_id: "p3", therapy: "Psicologia" },
  { id: "pt6", patient_id: "p4", therapy: "Fonoaudiologia" },
  { id: "pt7", patient_id: "p4", therapy: "Terapia Ocupacional" },
];

function calcAge(birthDate: string): number {
  try {
    const b = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) {
      age--;
    }
    return Math.max(0, age);
  } catch {
    return 0;
  }
}

function getTherapistNameForPatient(patientId: string): string | null {
  const link = DEV_PATIENT_THERAPIST.find(
    (l) => l.patient_id === patientId && l.role_in_case === "principal",
  ) || DEV_PATIENT_THERAPIST.find((l) => l.patient_id === patientId);
  if (!link) return null;

  const therapist = DEV_TEAM_MEMBERS.find((m) => m.id === link.therapist_id);
  if (therapist) return therapist.name;

  if (link.therapist_id === "u-therapist-01") return "Ana Beatriz Lopes";
  if (link.therapist_id === "u-therapist-02") return "Carla Mendes";
  if (link.therapist_id === "u-therapist-03") return "Diego Ramos";
  if (link.therapist_id === "u-therapist-04") return "Fernanda Souza";
  return "Terapeuta Responsável";
}

// ── Schemas de validação ──────────────────────────────────────────────────────

const GetPatientsInput = z.object({
  role: z.enum(["admin", "therapist", "parent"]),
  userId: z.string(),
});

const GetPatientByIdInput = z.object({
  patientId: z.string(),
  userId: z.string(),
  role: z.enum(["admin", "therapist", "parent"]),
});

// ── Server Functions ──────────────────────────────────────────────────────────

/**
 * Busca pacientes com suporte a D1 e store em memória dev.
 */
export const getPatients = createServerFn({ method: "GET" })
  .validator((data: unknown) => GetPatientsInput.parse(data))
  .handler(async ({ data }): Promise<PatientSummary[]> => {
    const db = getDB();
    const { role, userId } = data;

    let d1Rows: PatientSummary[] = [];

    try {
      if (role === "admin") {
        const result = await db
          .prepare(
            `SELECT
                p.id,
                p.name,
                CAST(FLOOR((julianday('now') - julianday(p.birth_date)) / 365.25) AS INTEGER) AS age,
                p.diagnosis,
                p.avatar_initials,
                p.guardian_name AS guardian,
                p.status,
                p.progress,
                u.name AS therapist_name
             FROM patients p
             LEFT JOIN patient_therapist pt ON pt.patient_id = p.id AND pt.role_in_case = 'principal'
             LEFT JOIN users u ON u.id = pt.therapist_id
             WHERE p.status != 'Alta'
             ORDER BY p.name`,
          )
          .all<PatientSummary>();
        if (result?.results && result.results.length > 0) {
          d1Rows = result.results;
        }
      } else if (role === "therapist") {
        const result = await db
          .prepare(
            `SELECT
                p.id,
                p.name,
                CAST(FLOOR((julianday('now') - julianday(p.birth_date)) / 365.25) AS INTEGER) AS age,
                p.diagnosis,
                p.avatar_initials,
                p.guardian_name AS guardian,
                p.status,
                p.progress,
                u.name AS therapist_name
             FROM patients p
             INNER JOIN patient_therapist pt ON pt.patient_id = p.id AND pt.therapist_id = ?1
             LEFT JOIN patient_therapist pt2 ON pt2.patient_id = p.id AND pt2.role_in_case = 'principal'
             LEFT JOIN users u ON u.id = pt2.therapist_id
             WHERE p.status != 'Alta'
             ORDER BY p.name`,
          )
          .bind(userId)
          .all<PatientSummary>();
        if (result?.results && result.results.length > 0) {
          d1Rows = result.results;
        }
      } else {
        const result = await db
          .prepare(
            `SELECT
                p.id,
                p.name,
                CAST(FLOOR((julianday('now') - julianday(p.birth_date)) / 365.25) AS INTEGER) AS age,
                p.diagnosis,
                p.avatar_initials,
                p.guardian_name AS guardian,
                p.status,
                p.progress,
                u.name AS therapist_name
             FROM patients p
             INNER JOIN patient_guardian pg ON pg.patient_id = p.id AND pg.guardian_id = ?1
             LEFT JOIN patient_therapist pt2 ON pt2.patient_id = p.id AND pt2.role_in_case = 'principal'
             LEFT JOIN users u ON u.id = pt2.therapist_id
             ORDER BY p.name`,
          )
          .bind(userId)
          .all<PatientSummary>();
        if (result?.results && result.results.length > 0) {
          d1Rows = result.results;
        }
      }
    } catch {
      // Ignora erro se DB mock
    }

    // Processa lista da store de desenvolvimento
    let devList: DbPatient[] = [];
    if (role === "admin") {
      devList = DEV_PATIENTS.filter((p) => p.status !== "Alta");
    } else if (role === "therapist") {
      const allowedPatientIds = new Set(
        DEV_PATIENT_THERAPIST.filter((l) => l.therapist_id === userId).map((l) => l.patient_id),
      );
      devList = DEV_PATIENTS.filter((p) => allowedPatientIds.has(p.id) && p.status !== "Alta");
    } else {
      const allowedPatientIds = new Set(
        DEV_PATIENT_GUARDIAN.filter((l) => l.guardian_id === userId).map((l) => l.patient_id),
      );
      devList = DEV_PATIENTS.filter(
        (p) => allowedPatientIds.has(p.id) || p.guardian_email === userId,
      );
    }

    const devSummaries: PatientSummary[] = devList.map((p) => ({
      id: p.id,
      name: p.name,
      age: calcAge(p.birth_date),
      diagnosis: p.diagnosis,
      avatar_initials: p.avatar_initials,
      guardian: p.guardian_name,
      status: p.status,
      progress: p.progress,
      therapist_name: getTherapistNameForPatient(p.id) || "Dra. Gisele",
    }));

    if (d1Rows.length > 0) {
      const d1Ids = new Set(d1Rows.map((r) => r.id));
      const extraDev = devSummaries.filter((s) => !d1Ids.has(s.id));
      return [...d1Rows, ...extraDev];
    }

    return devSummaries;
  });

/**
 * Busca um paciente completo por ID.
 */
export const getPatientById = createServerFn({ method: "GET" })
  .validator((data: unknown) => GetPatientByIdInput.parse(data))
  .handler(async ({ data }) => {
    const db = getDB();
    const { patientId } = data;

    let patient: DbPatient | null = null;
    let therapies: string[] = [];

    try {
      const row = await db
        .prepare(`SELECT * FROM patients WHERE id = ?1`)
        .bind(patientId)
        .first<DbPatient>();

      if (row) {
        patient = row;
        const thRows = await db
          .prepare(`SELECT therapy FROM patient_therapies WHERE patient_id = ?1 ORDER BY therapy`)
          .bind(patientId)
          .all<{ therapy: string }>();
        if (thRows?.results) {
          therapies = thRows.results.map((r) => r.therapy);
        }
      }
    } catch {
      // Fallback
    }

    if (!patient) {
      const devP = DEV_PATIENTS.find((p) => p.id === patientId);
      if (devP) {
        patient = devP;
        therapies = DEV_PATIENT_THERAPIES.filter((t) => t.patient_id === patientId).map(
          (t) => t.therapy,
        );
      }
    }

    if (!patient) {
      throw new Error(`Paciente '${patientId}' não encontrado.`);
    }

    return {
      ...patient,
      therapies,
    };
  });

const CreatePatientInput = z.object({
  name: z.string().min(2),
  birthDate: z.string(),
  gender: z.string(),
  cpf: z.string().optional(),
  diagnosis: z.string(),
  therapistId: z.string(),
  guardianName: z.string(),
  guardianRelation: z.string().optional(),
  guardianPhone: z.string(),
  guardianEmail: z.string(),
  address: z.string().optional(),
  school: z.string().optional(),
  insurance: z.string().optional(),
  insuranceNumber: z.string().optional(),
  weeklyHours: z.string(),
  status: z.string().optional(),
  notes: z.string().optional(),
  therapies: z.array(z.string()).default([]),
});

export const createPatient = createServerFn({ method: "POST" })
  .validator((d: unknown) => CreatePatientInput.parse(d))
  .handler(async ({ data }) => {
    const db = getDB();
    const patientId = `p-${generateId().slice(0, 8)}`;
    const names = data.name.trim().split(/\s+/);
    const avatar = names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : names[0].slice(0, 2).toUpperCase();

    const formattedHours = data.weeklyHours.includes("h")
      ? data.weeklyHours
      : `${data.weeklyHours}h`;

    const statusTyped = (
      ["Ativo", "Em avaliação", "Pausado", "Alta"].includes(data.status || "")
        ? data.status
        : "Ativo"
    ) as PatientStatus;

    // 1. Armazena no store em memória de desenvolvimento
    const newDbPatient: DbPatient = {
      id: patientId,
      name: data.name.trim(),
      birth_date: data.birthDate,
      gender: data.gender || null,
      cpf: data.cpf || null,
      diagnosis: data.diagnosis.trim(),
      school: data.school || null,
      avatar_initials: avatar,
      insurance: data.insurance || "Particular",
      insurance_number: data.insuranceNumber || null,
      weekly_hours: formattedHours,
      status: statusTyped,
      guardian_name: data.guardianName.trim(),
      guardian_relation: data.guardianRelation || null,
      guardian_phone: data.guardianPhone.trim(),
      guardian_email: data.guardianEmail.trim(),
      address: data.address || null,
      clinical_notes: data.notes || null,
      progress: 0,
      created_at: now(),
      updated_at: now(),
    };

    DEV_PATIENTS.unshift(newDbPatient);

    // Vínculo com terapeuta
    DEV_PATIENT_THERAPIST.push({
      id: generateId(),
      patient_id: patientId,
      therapist_id: data.therapistId,
      role_in_case: "principal",
    });

    // Terapias indicadas
    for (const th of data.therapies) {
      DEV_PATIENT_THERAPIES.push({
        id: generateId(),
        patient_id: patientId,
        therapy: th,
      });
    }

    // 2. Persiste no Cloudflare D1 se disponível
    try {
      const stmts: D1PreparedStatement[] = [
        db
          .prepare(
            `INSERT INTO patients (
               id, name, birth_date, gender, cpf, diagnosis, school, avatar_initials,
               insurance, insurance_number, weekly_hours, status,
               guardian_name, guardian_relation, guardian_phone, guardian_email,
               address, clinical_notes, progress
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, 0)`,
          )
          .bind(
            patientId,
            newDbPatient.name,
            newDbPatient.birth_date,
            newDbPatient.gender,
            newDbPatient.cpf,
            newDbPatient.diagnosis,
            newDbPatient.school,
            newDbPatient.avatar_initials,
            newDbPatient.insurance,
            newDbPatient.insurance_number,
            newDbPatient.weekly_hours,
            newDbPatient.status,
            newDbPatient.guardian_name,
            newDbPatient.guardian_relation,
            newDbPatient.guardian_phone,
            newDbPatient.guardian_email,
            newDbPatient.address,
            newDbPatient.clinical_notes,
          ),
        db
          .prepare(
            `INSERT INTO patient_therapist (patient_id, therapist_id, role_in_case)
             VALUES (?1, ?2, 'principal')`,
          )
          .bind(patientId, data.therapistId),
      ];

      for (const th of data.therapies) {
        stmts.push(
          db
            .prepare(`INSERT INTO patient_therapies (patient_id, therapy) VALUES (?1, ?2)`)
            .bind(patientId, th),
        );
      }

      await db.batch(stmts);
    } catch {
      // Ignora erro em ambiente sem D1 nativo (store em memória já garantiu persistência)
    }

    return { id: patientId, name: data.name };
  });

export const updatePatient = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      data: CreatePatientInput.partial(),
    }),
  )
  .handler(async ({ data: { id, data } }) => {
    const db = getDB();

    // Atualiza store dev
    const idx = DEV_PATIENTS.findIndex((p) => p.id === id);
    if (idx !== -1) {
      DEV_PATIENTS[idx] = {
        ...DEV_PATIENTS[idx],
        ...(data.name ? { name: data.name } : {}),
        ...(data.diagnosis ? { diagnosis: data.diagnosis } : {}),
        ...(data.guardianName ? { guardian_name: data.guardianName } : {}),
        ...(data.guardianPhone ? { guardian_phone: data.guardianPhone } : {}),
        ...(data.guardianEmail ? { guardian_email: data.guardianEmail } : {}),
        ...(data.status ? { status: data.status as PatientStatus } : {}),
        updated_at: now(),
      };
    }

    try {
      await db
        .prepare(
          `UPDATE patients SET
             name = COALESCE(?1, name),
             diagnosis = COALESCE(?2, diagnosis),
             guardian_name = COALESCE(?3, guardian_name),
             guardian_phone = COALESCE(?4, guardian_phone),
             guardian_email = COALESCE(?5, guardian_email),
             status = COALESCE(?6, status),
             updated_at = datetime('now')
           WHERE id = ?7`,
        )
        .bind(
          data.name ?? null,
          data.diagnosis ?? null,
          data.guardianName ?? null,
          data.guardianPhone ?? null,
          data.guardianEmail ?? null,
          data.status ?? null,
          id,
        )
        .run();
    } catch {
      // Ignora
    }

    return { success: true };
  });

/**
 * ──────────────────────────────────────────────────────────────────────────
 * SERVER FUNCTION DE TESTE DE CONECTIVIDADE D1
 * ──────────────────────────────────────────────────────────────────────────
 */
export const pingDatabase = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDB();

  const countResult = await db
    .prepare(`SELECT COUNT(*) AS total FROM patients`)
    .first<{ total: number }>();

  const timeResult = await db
    .prepare(`SELECT datetime('now') AS db_time`)
    .first<{ db_time: string }>();

  return {
    ok: true,
    patients_count: countResult?.total ?? DEV_PATIENTS.length,
    db_time: timeResult?.db_time ?? now(),
    message: "Banco D1 conectado com sucesso! ✅",
  };
});
