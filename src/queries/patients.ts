/**
 * src/server/queries/patients.ts
 *
 * Server Functions para o módulo de Pacientes.
 * Todas as funções são executadas no servidor (Cloudflare Workers)
 * e acessam o banco D1 diretamente.
 *
 * Uso nas rotas:
 *   import { getPatients, getPatientById } from "@/queries/patients";
 *   const patients = await getPatients({ data: { role: "therapist", userId: "..." } });
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId, now } from "@/db/db";
import type { DbPatient, PatientSummary } from "@/db/types";

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
 * Busca pacientes do banco D1 com filtro por perfil (RBAC):
 *  - admin: todos os pacientes ativos
 *  - therapist: apenas os pacientes vinculados na tabela patient_therapist
 *  - parent: apenas o(s) paciente(s) vinculados na tabela patient_guardian
 *
 * Retorna PatientSummary[] pronto para renderização.
 */
export const getPatients = createServerFn({ method: "GET" })
  .validator((data: unknown) => GetPatientsInput.parse(data))
  .handler(async ({ data }) => {
    const db = getDB();
    const { role, userId } = data;

    let rows: PatientSummary[];

    if (role === "admin") {
      // Admin vê todos os pacientes ativos com o terapeuta de referência (principal)
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
      rows = result.results;
    } else if (role === "therapist") {
      // Terapeuta vê apenas seus pacientes vinculados
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
      rows = result.results;
    } else {
      // Parent vê apenas o(s) filho(s) vinculado(s)
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
      rows = result.results;
    }

    return rows;
  });

/**
 * Busca um paciente completo por ID com verificação de acesso (RBAC).
 * Lança 403 se o usuário não tiver vínculo com o paciente.
 */
export const getPatientById = createServerFn({ method: "GET" })
  .validator((data: unknown) => GetPatientByIdInput.parse(data))
  .handler(async ({ data }) => {
    const db = getDB();
    const { patientId, userId, role } = data;

    // Verificação de acesso por vínculo
    if (role === "therapist") {
      const link = await db
        .prepare(
          `SELECT 1 FROM patient_therapist WHERE patient_id = ?1 AND therapist_id = ?2`,
        )
        .bind(patientId, userId)
        .first();
      if (!link) {
        throw new Error("Acesso negado: este paciente não está vinculado à sua conta.");
      }
    } else if (role === "parent") {
      const link = await db
        .prepare(
          `SELECT 1 FROM patient_guardian WHERE patient_id = ?1 AND guardian_id = ?2`,
        )
        .bind(patientId, userId)
        .first();
      if (!link) {
        throw new Error("Acesso negado: este paciente não está vinculado à sua conta.");
      }
    }

    const patient = await db
      .prepare(`SELECT * FROM patients WHERE id = ?1`)
      .bind(patientId)
      .first<DbPatient>();

    if (!patient) {
      throw new Error(`Paciente '${patientId}' não encontrado.`);
    }

    // Busca terapias indicadas
    const therapiesResult = await db
      .prepare(`SELECT therapy FROM patient_therapies WHERE patient_id = ?1 ORDER BY therapy`)
      .bind(patientId)
      .all<{ therapy: string }>();

    return {
      ...patient,
      therapies: therapiesResult.results.map((r) => r.therapy),
    };
  });

/**
 * ──────────────────────────────────────────────────────────────────────────
 * SERVER FUNCTION DE TESTE DE CONECTIVIDADE D1
 * ──────────────────────────────────────────────────────────────────────────
 * Endpoint de diagnóstico. Pode ser chamado de qualquer página para
 * validar que o binding D1 está funcionando corretamente.
 *
 * Retorna: { ok: true, patients_count: number, db_time: string }
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
    patients_count: countResult?.total ?? 0,
    db_time: timeResult?.db_time ?? "unknown",
    message: "Banco D1 conectado com sucesso! ✅",
  };
});
