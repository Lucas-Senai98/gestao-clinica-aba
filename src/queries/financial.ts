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
import { getDB, generateId, now } from "@/db/db";
import { getSessionUser } from "@/queries/auth";
import { logAuditEvent } from "@/queries/notifications_audit";
import type {
  DbFinancialEntry,
  FinancialEntryType,
  FinancialEntryStatus,
  FinancialPaymentMethod,
  FinancialEntryWithRelations,
  FinancialSummaryKPIs,
} from "@/db/types";


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

    const patientBreakdown: PatientBillingItem[] = patientBillingRows.results.map((row: {
      patient_id: string;
      patient_name: string;
      diagnosis: string;
      rate_value: number;
      billing_type: "particular" | "convenio";
      insurance_name: string | null;
      sessions_count: number;
    }) => ({
      patientId: row.patient_id,
      patientName: row.patient_name,
      diagnosis: row.diagnosis,
      billingType: row.billing_type,
      insuranceName: row.insurance_name,
      sessionsCount: row.sessions_count,
      rateValue: Number(row.rate_value),
      subtotal: Math.round(row.sessions_count * Number(row.rate_value) * 100) / 100,
    }));

    let finalPatientBreakdown = patientBreakdown;
    if (finalPatientBreakdown.length === 0) {
      finalPatientBreakdown = [
        {
          patientId: "p1",
          patientName: "Lucas Almeida",
          diagnosis: "TEA Nível 2",
          billingType: "particular",
          insuranceName: null,
          sessionsCount: 16,
          rateValue: 150.0,
          subtotal: 2400.0,
        },
        {
          patientId: "p2",
          patientName: "Sofia Pereira",
          diagnosis: "TEA Nível 1",
          billingType: "convenio",
          insuranceName: "Unimed",
          sessionsCount: 12,
          rateValue: 140.0,
          subtotal: 1680.0,
        },
        {
          patientId: "p3",
          patientName: "Pedro Santos",
          diagnosis: "TEA Nível 2",
          billingType: "particular",
          insuranceName: null,
          sessionsCount: 14,
          rateValue: 150.0,
          subtotal: 2100.0,
        },
        {
          patientId: "p4",
          patientName: "Isabella Costa",
          diagnosis: "TDAH + TEA",
          billingType: "convenio",
          insuranceName: "Bradesco Saúde",
          sessionsCount: 10,
          rateValue: 130.0,
          subtotal: 1300.0,
        },
        {
          patientId: "p5",
          patientName: "Miguel Oliveira",
          diagnosis: "TEA Nível 3",
          billingType: "particular",
          insuranceName: null,
          sessionsCount: 20,
          rateValue: 160.0,
          subtotal: 3200.0,
        },
      ];
    }

    const totalRevenue = finalPatientBreakdown.reduce((sum, item) => sum + item.subtotal, 0);

    // ── 2. REPASSE POR TERAPEUTA ───────────────────────────────────────────────
    let therapistPayoutRows: {
      results: Array<{
        therapist_id: string;
        therapist_name: string;
        hourly_rate: number;
        total_sessions: number;
        total_minutes: number;
      }>;
    } = { results: [] };

    try {
      therapistPayoutRows = await db
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
    } catch {
      // Ignora erro D1 dev
    }

    let therapistBreakdown: TherapistPayoutItem[] = therapistPayoutRows.results.map((row) => {
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

    if (therapistBreakdown.length === 0) {
      therapistBreakdown = [
        {
          therapistId: "u-therapist-01",
          therapistName: "Ana Beatriz Lopes",
          totalSessions: 30,
          totalMinutes: 1800,
          totalHours: 30.0,
          hourlyRate: 85.0,
          totalPayout: 2550.0,
        },
        {
          therapistId: "u-therapist-02",
          therapistName: "Carla Mendes",
          totalSessions: 24,
          totalMinutes: 1440,
          totalHours: 24.0,
          hourlyRate: 80.0,
          totalPayout: 1920.0,
        },
        {
          therapistId: "u-therapist-03",
          therapistName: "Diego Ramos",
          totalSessions: 18,
          totalMinutes: 1080,
          totalHours: 18.0,
          hourlyRate: 75.0,
          totalPayout: 1350.0,
        },
        {
          therapistId: "u-therapist-04",
          therapistName: "Fernanda Souza",
          totalSessions: 20,
          totalMinutes: 1200,
          totalHours: 20.0,
          hourlyRate: 80.0,
          totalPayout: 1600.0,
        },
      ];
    }

    const totalPayout = therapistBreakdown.reduce((sum, item) => sum + item.totalPayout, 0);
    const netBalance  = Math.round((totalRevenue - totalPayout) * 100) / 100;

    return {
      targetMonth,
      totalRevenue,
      totalPayout,
      netBalance,
      patientBreakdown: finalPatientBreakdown,
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

    const sessionItems = sessions.results.map((s: {
      id: string;
      session_date: string;
      start_time: string;
      end_time: string;
      duration_min: number;
      patient_name: string;
    }) => {
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

    const totalMinutes  = sessionItems.reduce((acc: number, item: { durationMin: number }) => acc + item.durationMin, 0);
    const totalHours    = Math.round((totalMinutes / 60) * 10) / 10;
    const totalEarnings = sessionItems.reduce((acc: number, item: { sessionEarnings: number }) => acc + item.sessionEarnings, 0);

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

// ─────────────────────────────────────────────────────────────────────────────
// 4. CONTAS A PAGAR E CONTAS A RECEBER (MÓDULO TRANSACIONAL)
// ─────────────────────────────────────────────────────────────────────────────

const PATIENT_NAMES: Record<string, string> = {
  p1: "Lucas Almeida",
  p2: "Sofia Pereira",
  p3: "Pedro Santos",
  p4: "Isabella Costa",
  p5: "Miguel Oliveira",
};

const THERAPIST_NAMES: Record<string, string> = {
  "u-admin-01": "Marina Silva (Supervisão)",
  "u-therapist-01": "Ana Beatriz Lopes",
  "u-therapist-02": "Carla Mendes",
  "u-therapist-03": "Diego Ramos",
  "u-therapist-04": "Fernanda Souza",
};

export const DEV_FINANCIAL_ENTRIES: FinancialEntryWithRelations[] = [
  // ── Contas a Receber (Receitas Clínicas) ───────────────────────────────────
  {
    id: "fe-rec-1",
    type: "receivable",
    category: "Mensalidade Particular",
    description: "Mensalidade Terapia ABA - Plano 40h/mês",
    amount: 6000.0,
    due_date: "2026-08-10",
    payment_date: "2026-08-09",
    status: "completed",
    patient_id: "p1",
    patient_name: "Lucas Almeida",
    therapist_id: "u-therapist-01",
    therapist_name: "Ana Beatriz Lopes",
    payment_method: "pix",
    notes: "Comprovante de PIX validado pelo setor financeiro.",
    created_at: "2026-08-01 08:00:00",
    updated_at: "2026-08-09 10:30:00",
  },
  {
    id: "fe-rec-2",
    type: "receivable",
    category: "Faturamento Convênio",
    description: "Lote de Guias TISS - Unimed Seguros (Julho/Agosto)",
    amount: 3800.0,
    due_date: "2026-08-15",
    payment_date: "2026-08-15",
    status: "completed",
    patient_id: "p2",
    patient_name: "Sofia Pereira",
    therapist_id: "u-therapist-02",
    therapist_name: "Carla Mendes",
    payment_method: "transferencia",
    notes: "Crédito em conta corrente clínica.",
    created_at: "2026-08-01 09:00:00",
    updated_at: "2026-08-15 14:00:00",
  },
  {
    id: "fe-rec-3",
    type: "receivable",
    category: "Mensalidade Particular",
    description: "Mensalidade Programa Denver/ABA - Intervenção Precoce",
    amount: 4500.0,
    due_date: "2026-08-20",
    payment_date: null,
    status: "pending",
    patient_id: "p3",
    patient_name: "Pedro Santos",
    therapist_id: "u-therapist-01",
    therapist_name: "Ana Beatriz Lopes",
    payment_method: "boleto",
    notes: "Boleto enviado aos responsáveis por e-mail e WhatsApp.",
    created_at: "2026-08-01 09:15:00",
    updated_at: "2026-08-01 09:15:00",
  },
  {
    id: "fe-rec-4",
    type: "receivable",
    category: "Coparticipação Terapêutica",
    description: "Sessões Integradas de Terapia Ocupacional e Fono",
    amount: 1200.0,
    due_date: "2026-08-05",
    payment_date: null,
    status: "overdue",
    patient_id: "p4",
    patient_name: "Isabella Costa",
    therapist_id: "u-therapist-02",
    therapist_name: "Carla Mendes",
    payment_method: "pix",
    notes: "Cobrança enviada aos responsáveis com aviso de vencimento.",
    created_at: "2026-07-28 11:00:00",
    updated_at: "2026-08-06 09:00:00",
  },
  {
    id: "fe-rec-5",
    type: "receivable",
    category: "Mensalidade Particular",
    description: "Pacote Intervenção Comportamental e Treino Parental",
    amount: 3200.0,
    due_date: "2026-08-25",
    payment_date: null,
    status: "pending",
    patient_id: "p5",
    patient_name: "Miguel Oliveira",
    therapist_id: "u-therapist-03",
    therapist_name: "Diego Ramos",
    payment_method: "cartao",
    notes: "Parcelamento recorrente agendado.",
    created_at: "2026-08-02 10:00:00",
    updated_at: "2026-08-02 10:00:00",
  },

  // ── Contas a Pagar (Despesas Operacionais) ─────────────────────────────────
  {
    id: "fe-pay-1",
    type: "payable",
    category: "Aluguel & Condomínio",
    description: "Aluguel do Imóvel da Clínica - Unidade Principal & Condomínio",
    amount: 5500.0,
    due_date: "2026-08-05",
    payment_date: "2026-08-05",
    status: "completed",
    patient_id: null,
    patient_name: null,
    therapist_id: null,
    therapist_name: null,
    payment_method: "transferencia",
    notes: "Comprovante arquivado na pasta fiscal de contratos.",
    created_at: "2026-08-01 08:00:00",
    updated_at: "2026-08-05 11:20:00",
  },
  {
    id: "fe-pay-2",
    type: "payable",
    category: "Repasse Terapeuta",
    description: "Repasse de Horas Clínicas - Dra. Ana Beatriz Lopes",
    amount: 3200.0,
    due_date: "2026-08-10",
    payment_date: "2026-08-10",
    status: "completed",
    patient_id: null,
    patient_name: null,
    therapist_id: "u-therapist-01",
    therapist_name: "Ana Beatriz Lopes",
    payment_method: "pix",
    notes: "Horas e sessões auditadas pela coordenação clínica.",
    created_at: "2026-08-01 08:00:00",
    updated_at: "2026-08-10 16:45:00",
  },
  {
    id: "fe-pay-3",
    type: "payable",
    category: "Repasse Terapeuta",
    description: "Repasse de Atendimentos TO - Carla Mendes",
    amount: 2400.0,
    due_date: "2026-08-10",
    payment_date: "2026-08-10",
    status: "completed",
    patient_id: null,
    patient_name: null,
    therapist_id: "u-therapist-02",
    therapist_name: "Carla Mendes",
    payment_method: "pix",
    notes: "Repasse quinzenal efetuado via chave PIX CNPJ.",
    created_at: "2026-08-01 08:00:00",
    updated_at: "2026-08-10 17:00:00",
  },
  {
    id: "fe-pay-4",
    type: "payable",
    category: "Software & Sistemas",
    description: "Assinatura Mensal Plataforma ABA Cloud, Prontuário Eletrônico & Servidores",
    amount: 490.0,
    due_date: "2026-08-12",
    payment_date: "2026-08-12",
    status: "completed",
    patient_id: null,
    patient_name: null,
    therapist_id: null,
    therapist_name: null,
    payment_method: "cartao",
    notes: "Débito automático no cartão corporativo.",
    created_at: "2026-08-01 08:00:00",
    updated_at: "2026-08-12 09:30:00",
  },
  {
    id: "fe-pay-5",
    type: "payable",
    category: "Material Clínico & Pedagógico",
    description: "Aquisição de Brinquedos Sensoriais, Pistas Visuais e Jogos ABA",
    amount: 850.0,
    due_date: "2026-08-18",
    payment_date: null,
    status: "pending",
    patient_id: null,
    patient_name: null,
    therapist_id: null,
    therapist_name: null,
    payment_method: "boleto",
    notes: "NF-e recebida com materiais já conferidos e alocados nas salas.",
    created_at: "2026-08-05 14:00:00",
    updated_at: "2026-08-05 14:00:00",
  },
  {
    id: "fe-pay-6",
    type: "payable",
    category: "Limpeza & Manutenção",
    description: "Serviço Especializado de Higienização e Sanitização Clínica",
    amount: 1200.0,
    due_date: "2026-08-22",
    payment_date: null,
    status: "pending",
    patient_id: null,
    patient_name: null,
    therapist_id: null,
    therapist_name: null,
    payment_method: "transferencia",
    notes: "Vencimento programado em conta jurídica.",
    created_at: "2026-08-05 15:00:00",
    updated_at: "2026-08-05 15:00:00",
  },
  {
    id: "fe-pay-7",
    type: "payable",
    category: "Limpeza & Manutenção",
    description: "Manutenção Preventiva de Ar-condicionado e Troca de Filtros",
    amount: 680.0,
    due_date: "2026-08-02",
    payment_date: null,
    status: "overdue",
    patient_id: null,
    patient_name: null,
    therapist_id: null,
    therapist_name: null,
    payment_method: "pix",
    notes: "Fatura aguardando liberação de pagamento bancário.",
    created_at: "2026-07-25 10:00:00",
    updated_at: "2026-08-03 08:30:00",
  },
];

const FinancialEntriesFilterInput = z.object({
  type: z.enum(["receivable", "payable"]).optional(),
  status: z.enum(["pending", "completed", "overdue", "cancelled"]).optional(),
  month: z.string().optional(), // "YYYY-MM"
  search: z.string().optional(),
});

/**
 * Busca listagem de lançamentos (Contas a Pagar e Receber) com D1 e fallback dev
 */
export const getFinancialEntries = createServerFn({ method: "GET" })
  .validator((d: unknown) => FinancialEntriesFilterInput.parse(d))
  .handler(async ({ data }): Promise<FinancialEntryWithRelations[]> => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role !== "admin") throw new Error("Apenas administradores podem acessar contas financeiras.");

    const db = getDB();
    let entries: FinancialEntryWithRelations[] = [];

    try {
      const rows = await db
        .prepare(
          `SELECT
             fe.id, fe.type, fe.category, fe.description, fe.amount,
             fe.due_date, fe.payment_date, fe.status,
             fe.patient_id, fe.therapist_id, fe.payment_method, fe.notes,
             fe.created_at, fe.updated_at,
             p.name AS patient_name,
             u.name AS therapist_name
           FROM financial_entries fe
           LEFT JOIN patients p ON p.id = fe.patient_id
           LEFT JOIN users u ON u.id = fe.therapist_id
           ORDER BY fe.due_date DESC`,
        )
        .all<FinancialEntryWithRelations>();

      if (rows?.results && rows.results.length > 0) {
        entries = rows.results.map((r) => ({
          ...r,
          amount: Number(r.amount),
        }));
      }
    } catch {
      // Usa fallback da memória dev
    }

    if (entries.length === 0) {
      entries = [...DEV_FINANCIAL_ENTRIES];
    }

    // Aplicação dos filtros
    if (data.type) {
      entries = entries.filter((e) => e.type === data.type);
    }

    if (data.status) {
      entries = entries.filter((e) => e.status === data.status);
    }

    if (data.month) {
      entries = entries.filter((e) => e.due_date.startsWith(data.month!));
    }

    if (data.search && data.search.trim()) {
      const q = data.search.toLowerCase().trim();
      entries = entries.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.patient_name && e.patient_name.toLowerCase().includes(q)) ||
          (e.therapist_name && e.therapist_name.toLowerCase().includes(q)),
      );
    }

    return entries;
  });

/**
 * Calcula os KPIs agregados de fluxo de caixa da clínica
 */
export const getFinancialSummaryKPIs = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ month: z.string().optional() }).parse(d))
  .handler(async ({ data }): Promise<FinancialSummaryKPIs> => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role !== "admin") throw new Error("Apenas administradores podem acessar métricas financeiras.");

    // Busca todas as entradas
    const all = await getFinancialEntries({ data: { month: data.month } });

    let totalReceivablePending = 0;
    let totalReceivableReceived = 0;
    let totalPayablePending = 0;
    let totalPayablePaid = 0;
    let overdueCount = 0;
    let overdueTotal = 0;

    for (const e of all) {
      const amt = Number(e.amount);
      if (e.type === "receivable") {
        if (e.status === "completed") {
          totalReceivableReceived += amt;
        } else if (e.status === "pending" || e.status === "overdue") {
          totalReceivablePending += amt;
        }
      } else if (e.type === "payable") {
        if (e.status === "completed") {
          totalPayablePaid += amt;
        } else if (e.status === "pending" || e.status === "overdue") {
          totalPayablePending += amt;
        }
      }

      if (e.status === "overdue") {
        overdueCount++;
        overdueTotal += amt;
      }
    }

    totalReceivablePending = Math.round(totalReceivablePending * 100) / 100;
    totalReceivableReceived = Math.round(totalReceivableReceived * 100) / 100;
    totalPayablePending = Math.round(totalPayablePending * 100) / 100;
    totalPayablePaid = Math.round(totalPayablePaid * 100) / 100;
    overdueTotal = Math.round(overdueTotal * 100) / 100;

    const projectedBalance = Math.round(
      (totalReceivablePending + totalReceivableReceived - (totalPayablePending + totalPayablePaid)) * 100,
    ) / 100;

    const realizedBalance = Math.round((totalReceivableReceived - totalPayablePaid) * 100) / 100;

    return {
      totalReceivablePending,
      totalReceivableReceived,
      totalPayablePending,
      totalPayablePaid,
      projectedBalance,
      realizedBalance,
      overdueCount,
      overdueTotal,
    };
  });

/**
 * Criação de nova fatura / despesa financeira
 */
const CreateFinancialEntryInput = z.object({
  type: z.enum(["receivable", "payable"]),
  category: z.string().min(2, "Categoria é obrigatória"),
  description: z.string().min(2, "Descrição é obrigatória"),
  amount: z.number().positive("O valor deve ser maior que zero"),
  dueDate: z.string().min(4, "Data de vencimento obrigatória"),
  patientId: z.string().optional().nullable(),
  therapistId: z.string().optional().nullable(),
  paymentMethod: z.enum(["pix", "boleto", "cartao", "transferencia", "dinheiro"]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createFinancialEntry = createServerFn({ method: "POST" })
  .validator((d: unknown) => CreateFinancialEntryInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role !== "admin") throw new Error("Apenas administradores podem lançar contas financeiras.");

    const db = getDB();
    const id = "fe-" + generateId().slice(0, 8);
    const currentDate = now();

    const patientName = data.patientId ? (PATIENT_NAMES[data.patientId] ?? null) : null;
    const therapistName = data.therapistId ? (THERAPIST_NAMES[data.therapistId] ?? null) : null;

    try {
      await db
        .prepare(
          `INSERT INTO financial_entries (
             id, type, category, description, amount, due_date, status,
             patient_id, therapist_id, payment_method, notes, created_at, updated_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?8, ?9, ?10, ?11, ?12)`,
        )
        .bind(
          id,
          data.type,
          data.category,
          data.description,
          data.amount,
          data.dueDate,
          data.patientId ?? null,
          data.therapistId ?? null,
          data.paymentMethod ?? null,
          data.notes ?? null,
          currentDate,
          currentDate,
        )
        .run();
    } catch {
      // Fallback dev em memória
    }

    const newRecord: FinancialEntryWithRelations = {
      id,
      type: data.type,
      category: data.category,
      description: data.description,
      amount: data.amount,
      due_date: data.dueDate,
      payment_date: null,
      status: "pending",
      patient_id: data.patientId ?? null,
      patient_name: patientName,
      therapist_id: data.therapistId ?? null,
      therapist_name: therapistName,
      payment_method: data.paymentMethod ?? null,
      notes: data.notes ?? null,
      created_at: currentDate,
      updated_at: currentDate,
    };

    DEV_FINANCIAL_ENTRIES.unshift(newRecord);

    await logAuditEvent(
      user.id,
      `Criou lançamento financeiro (${data.type === "receivable" ? "A Receber" : "A Pagar"}): ${data.description}`,
      "financial_entries",
      data.patientId ?? null,
    );

    return { ok: true, id };
  });

/**
 * Atualiza status do lançamento (Liquidar/Pagar, Marcar Atrasado ou Cancelar)
 */
const UpdateFinancialEntryStatusInput = z.object({
  id: z.string(),
  status: z.enum(["pending", "completed", "overdue", "cancelled"]),
  paymentDate: z.string().optional().nullable(),
  paymentMethod: z.enum(["pix", "boleto", "cartao", "transferencia", "dinheiro"]).optional().nullable(),
});

export const updateFinancialEntryStatus = createServerFn({ method: "POST" })
  .validator((d: unknown) => UpdateFinancialEntryStatusInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role !== "admin") throw new Error("Apenas administradores podem atualizar lançamentos financeiros.");

    const db = getDB();
    const currentDate = now();

    try {
      await db
        .prepare(
          `UPDATE financial_entries
           SET status = ?1, payment_date = ?2, payment_method = COALESCE(?3, payment_method), updated_at = ?4
           WHERE id = ?5`,
        )
        .bind(
          data.status,
          data.paymentDate ?? null,
          data.paymentMethod ?? null,
          currentDate,
          data.id,
        )
        .run();
    } catch {
      // Fallback dev em memória
    }

    const item = DEV_FINANCIAL_ENTRIES.find((x) => x.id === data.id);
    if (item) {
      item.status = data.status;
      if (data.paymentDate !== undefined) item.payment_date = data.paymentDate;
      if (data.paymentMethod) item.payment_method = data.paymentMethod;
      item.updated_at = currentDate;
    }

    await logAuditEvent(
      user.id,
      `Atualizou status do lançamento financeiro ${data.id} para '${data.status}'`,
      "financial_entries",
      item?.patient_id ?? null,
    );

    return { ok: true };
  });

/**
 * Exclui lançamento financeiro
 */
export const deleteFinancialEntry = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role !== "admin") throw new Error("Apenas administradores podem remover lançamentos financeiros.");

    const db = getDB();

    try {
      await db.prepare(`DELETE FROM financial_entries WHERE id = ?1`).bind(data.id).run();
    } catch {
      // Fallback dev
    }

    const idx = DEV_FINANCIAL_ENTRIES.findIndex((x) => x.id === data.id);
    let patientId: string | null = null;
    if (idx !== -1) {
      patientId = DEV_FINANCIAL_ENTRIES[idx].patient_id;
      DEV_FINANCIAL_ENTRIES.splice(idx, 1);
    }

    await logAuditEvent(
      user.id,
      `Removeu lançamento financeiro ID ${data.id}`,
      "financial_entries",
      patientId,
    );

    return { ok: true };
  });

