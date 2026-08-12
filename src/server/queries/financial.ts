/**
 * src/server/queries/financial.ts
 *
 * Server Functions para o Módulo Financeiro e Repasse (Etapa 7):
 * - Relatório Financeiro Geral da Clínica (Admin)
 * - Extrato de Ganhos e Horas do Terapeuta (Therapist)
 * - Gestão de Taxas de Cobrança e Repasse (Admin)
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId } from "@/server/db";
import { getSessionUser } from "@/server/queries/auth";

const FinancialFilterInput = z.object({
  month: z.string().optional(), // "YYYY-MM" ou "MM"
  year:  z.number().int().optional(),
});

export type PatientBillingItem = {
  patientId: string;
  patientName: string;
  diagnosis: string;
  billingType: "particular" | "convenio";
  insuranceName: string | null;
  sessionsCount: number;
  rateValue: number;
  subtotal: number;
};

export type TherapistPayoutItem = {
  therapistId: string;
  therapistName: string;
  totalSessions: number;
  totalMinutes: number;
  totalHours: number;
  hourlyRate: number;
  totalPayout: number;
};

export const getFinancialReport = createServerFn({ method: "GET" })
  .validator((d: unknown) => FinancialFilterInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role !== "admin") throw new Error("Apenas supervisores/admin acessam o relatório financeiro.");

    const db = getDB();
    const now = new Date();

    const targetYear  = data.year ?? now.getFullYear();
    const targetMonth = data.month
      ? data.month.includes("-")
        ? data.month
        : `${targetYear}-${data.month.padStart(2, "0")}`
      : `${targetYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // ── 1. FATORAMENTO POR PACIENTE ───────────────────────────────────────────
    const patientBillingRows = await db
      .prepare(
        `SELECT
           p.id AS patient_id,
           p.name AS patient_name,
           p.diagnosis,
           COALESCE(pbr.rate_value, 150.0) AS rate_value,
           COALESCE(pbr.billing_type, 'particular') AS billing_type,
           pbr.insurance_name,
           COUNT(dr.id) AS sessions_count
         FROM patients p
         LEFT JOIN patient_billing_rates pbr ON pbr.patient_id = p.id
         LEFT JOIN daily_records dr ON dr.patient_id = p.id AND strftime('%Y-%m', dr.session_date) = ?1
         GROUP BY p.id
         ORDER BY p.name ASC`,
      )
      .bind(targetMonth)
      .all<{
        patient_id: string;
        patient_name: string;
        diagnosis: string;
        rate_value: number;
        billing_type: "particular" | "convenio";
        insurance_name: string | null;
        sessions_count: number;
      }>();

    const patientBreakdown: PatientBillingItem[] = patientBillingRows.results.map((row) => ({
      patientId: row.patient_id,
      patientName: row.patient_name,
      diagnosis: row.diagnosis,
      billingType: row.billing_type,
      insuranceName: row.insurance_name,
      sessionsCount: row.sessions_count,
      rateValue: Number(row.rate_value),
      subtotal: Math.round(row.sessions_count * Number(row.rate_value) * 100) / 100,
    }));

    const totalRevenue = patientBreakdown.reduce((sum, item) => sum + item.subtotal, 0);

    // ── 2. REPASSE POR TERAPEUTA ───────────────────────────────────────────────
    const therapistPayoutRows = await db
      .prepare(
        `SELECT
           u.id AS therapist_id,
           u.name AS therapist_name,
           COALESCE(tpr.hourly_rate, 80.0) AS hourly_rate,
           COUNT(dr.id) AS total_sessions,
           COALESCE(SUM(dr.duration_min), 0) AS total_minutes
         FROM users u
         LEFT JOIN therapist_payment_rates tpr ON tpr.user_id = u.id
         LEFT JOIN daily_records dr ON dr.therapist_id = u.id AND strftime('%Y-%m', dr.session_date) = ?1
         WHERE u.role IN ('therapist', 'admin')
         GROUP BY u.id
         ORDER BY u.name ASC`,
      )
      .bind(targetMonth)
      .all<{
        therapist_id: string;
        therapist_name: string;
        hourly_rate: number;
        total_sessions: number;
        total_minutes: number;
      }>();

    const therapistBreakdown: TherapistPayoutItem[] = therapistPayoutRows.results.map((row) => {
      const totalMinutes = Number(row.total_minutes);
      const totalHours   = Math.round((totalMinutes / 60) * 10) / 10;
      const hourlyRate   = Number(row.hourly_rate);
      const totalPayout  = Math.round((totalMinutes / 60) * hourlyRate * 100) / 100;

      return {
        therapistId: row.therapist_id,
        therapistName: row.therapist_name,
        totalSessions: row.total_sessions,
        totalMinutes,
        totalHours,
        hourlyRate,
        totalPayout,
      };
    });

    const totalPayout = therapistBreakdown.reduce((sum, item) => sum + item.totalPayout, 0);
    const netBalance  = Math.round((totalRevenue - totalPayout) * 100) / 100;

    return {
      targetMonth,
      totalRevenue,
      totalPayout,
      netBalance,
      patientBreakdown,
      therapistBreakdown,
    };
  });

/** Extrato individual de ganhos e horas do terapeuta logado */
export const getTherapistPayout = createServerFn({ method: "GET" })
  .validator((d: unknown) => FinancialFilterInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");

    const db = getDB();
    const now = new Date();

    const targetYear  = data.year ?? now.getFullYear();
    const targetMonth = data.month
      ? data.month.includes("-")
        ? data.month
        : `${targetYear}-${data.month.padStart(2, "0")}`
      : `${targetYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Busca taxa horária do terapeuta
    const rateRow = await db
      .prepare(`SELECT hourly_rate FROM therapist_payment_rates WHERE user_id = ?1 LIMIT 1`)
      .bind(user.id)
      .first<{ hourly_rate: number }>();

    const hourlyRate = rateRow ? Number(rateRow.hourly_rate) : 80.0;

    // Busca sessões realizadas no mês
    const sessions = await db
      .prepare(
        `SELECT
           dr.id, dr.session_date, dr.start_time, dr.end_time, dr.duration_min,
           p.name AS patient_name
         FROM daily_records dr
         JOIN patients p ON p.id = dr.patient_id
         WHERE dr.therapist_id = ?1 AND strftime('%Y-%m', dr.session_date) = ?2
         ORDER BY dr.session_date DESC, dr.start_time DESC`,
      )
      .bind(user.id, targetMonth)
      .all<{
        id: string;
        session_date: string;
        start_time: string;
        end_time: string;
        duration_min: number;
        patient_name: string;
      }>();

    const sessionItems = sessions.results.map((s) => {
      const durationHours = Number(s.duration_min) / 60;
      const sessionEarnings = Math.round(durationHours * hourlyRate * 100) / 100;
      return {
        id: s.id,
        sessionDate: s.session_date,
        startTime: s.start_time,
        endTime: s.end_time,
        durationMin: s.duration_min,
        patientName: s.patient_name,
        sessionEarnings,
      };
    });

    const totalMinutes  = sessionItems.reduce((acc, item) => acc + item.durationMin, 0);
    const totalHours    = Math.round((totalMinutes / 60) * 10) / 10;
    const totalEarnings = sessionItems.reduce((acc, item) => acc + item.sessionEarnings, 0);

    return {
      targetMonth,
      hourlyRate,
      totalSessions: sessionItems.length,
      totalMinutes,
      totalHours,
      totalEarnings,
      sessionItems,
    };
  });

/** Admin atualiza a taxa de cobrança de um paciente */
const UpdatePatientRateInput = z.object({
  patientId:     z.string(),
  rateValue:     z.number().positive(),
  billingType:   z.enum(["particular", "convenio"]),
  insuranceName: z.string().optional(),
});

export const updatePatientBillingRate = createServerFn({ method: "POST" })
  .validator((d: unknown) => UpdatePatientRateInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role !== "admin") throw new Error("Apenas admin pode configurar taxas de pacientes.");

    const db = getDB();

    const existing = await db
      .prepare(`SELECT id FROM patient_billing_rates WHERE patient_id = ?1 LIMIT 1`)
      .bind(data.patientId)
      .first<{ id: string }>();

    if (existing) {
      await db
        .prepare(
          `UPDATE patient_billing_rates
           SET rate_value = ?1, billing_type = ?2, insurance_name = ?3, updated_at = datetime('now')
           WHERE patient_id = ?4`,
        )
        .bind(data.rateValue, data.billingType, data.insuranceName ?? null, data.patientId)
        .run();
    } else {
      const id = generateId();
      await db
        .prepare(
          `INSERT INTO patient_billing_rates (id, patient_id, rate_value, billing_type, insurance_name)
           VALUES (?1, ?2, ?3, ?4, ?5)`,
        )
        .bind(id, data.patientId, data.rateValue, data.billingType, data.insuranceName ?? null)
        .run();
    }

    return { ok: true };
  });

/** Admin atualiza o valor da hora/aula do terapeuta */
const UpdateTherapistRateInput = z.object({
  userId:     z.string(),
  hourlyRate: z.number().positive(),
});

export const updateTherapistPaymentRate = createServerFn({ method: "POST" })
  .validator((d: unknown) => UpdateTherapistRateInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role !== "admin") throw new Error("Apenas admin pode configurar repasse de terapeutas.");

    const db = getDB();

    const existing = await db
      .prepare(`SELECT id FROM therapist_payment_rates WHERE user_id = ?1 LIMIT 1`)
      .bind(data.userId)
      .first<{ id: string }>();

    if (existing) {
      await db
        .prepare(
          `UPDATE therapist_payment_rates
           SET hourly_rate = ?1, updated_at = datetime('now')
           WHERE user_id = ?2`,
        )
        .bind(data.hourlyRate, data.userId)
        .run();
    } else {
      const id = generateId();
      await db
        .prepare(
          `INSERT INTO therapist_payment_rates (id, user_id, hourly_rate)
           VALUES (?1, ?2, ?3)`,
        )
        .bind(id, data.userId, data.hourlyRate)
        .run();
    }

    return { ok: true };
  });
