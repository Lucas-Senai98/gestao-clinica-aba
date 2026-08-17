/**
 * src/server/queries/sessions.ts
 *
 * Server Functions para o módulo de Folha de Registro Diário.
 * Usa D1 batch() para escrita atômica (equivalente a transação SQLite).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId } from "@/db/db";
import { getSessionUser } from "@/queries/auth";

// ── Schema de validação ───────────────────────────────────────────────────────

const TargetInput = z.object({
  name:    z.string().min(1, "Nome do alvo obrigatório"),
  trials:  z.number().int().min(0),
  correct: z.number().int().min(0),
  notes:   z.string().optional(),
});

const BehaviorInput = z.object({
  topography:  z.string().min(1),
  duration_min: z.number().min(0).optional(),
  intensity:   z.enum(["Leve", "Moderada", "Intensa"]),
  context:     z.string().optional(),
  notes:       z.string().optional(),
});

const SaveDailyRecordInput = z.object({
  patientId:    z.string().min(1),
  sessionDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)"),
  sessionTime:  z.string().optional(),
  durationMin:  z.number().int().positive().optional(),
  // Seção 1 — Comportamentos (booleans armazenados como 0/1)
  cooperation:   z.boolean(),
  attention:     z.boolean(),
  inappropriate: z.boolean(),
  transitions:   z.enum(["facil", "moderada", "dificil"]),
  eyeContact:    z.enum(["adequado", "parcial", "ausente"]),
  communication: z.enum(["adequada", "parcial", "ausente"]),
  // Seção 2 — Programas de ensino
  targets: z.array(TargetInput).min(1, "Registre ao menos um programa de ensino"),
  // Seção 3 — Reforçadores e observações
  reinforcersUsed: z.string().optional(),
  generalNotes:    z.string().optional(),
  // Seção 4 — Comportamentos-problema (pode ser vazio)
  behaviors: z.array(BehaviorInput).default([]),
});

export type SaveDailyRecordData = z.infer<typeof SaveDailyRecordInput>;

// ── Server Function: saveDailyRecord ─────────────────────────────────────────

/**
 * Persiste uma folha de registro de sessão completa no D1.
 *
 * Fluxo:
 *  1. Valida a sessão do terapeuta via cookie
 *  2. Verifica vínculo RBAC na tabela patient_therapist
 *  3. Monta os statements SQL e os executa em lote (D1 batch = atômico)
 *  4. Retorna o ID do registro criado
 */
export const saveDailyRecord = createServerFn({ method: "POST" })
  .validator((d: unknown) => SaveDailyRecordInput.parse(d))
  .handler(async ({ data }) => {
    // ── 1. Autenticação ──────────────────────────────────────────────────────
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada. Faça login novamente.");

    const db = getDB();

    // ── 2. Verificação RBAC ──────────────────────────────────────────────────
    if (user.role === "therapist") {
      const link = await db
        .prepare(
          `SELECT 1 FROM patient_therapist
           WHERE patient_id = ?1 AND therapist_id = ?2 LIMIT 1`,
        )
        .bind(data.patientId, user.id)
        .first();

      if (!link) {
        throw new Error(
          "Acesso negado: este paciente não está vinculado à sua conta.",
        );
      }
    } else if (user.role === "parent") {
      throw new Error("Responsáveis não têm permissão para registrar sessões.");
    }
    // admin pode registrar para qualquer paciente

    // ── 3. Prepara IDs ───────────────────────────────────────────────────────
    const recordId = generateId();

    // ── 4. Monta statements para D1 batch ────────────────────────────────────

    const statements: D1PreparedStatement[] = [];

    // 4a. Registro principal da sessão
    statements.push(
      db
        .prepare(
          `INSERT INTO daily_records
             (id, patient_id, therapist_id, session_date, session_time, duration_min,
              cooperation, attention, inappropriate,
              transitions, eye_contact, communication,
              reinforcers_used, general_notes, status)
           VALUES
             (?1, ?2, ?3, ?4, ?5, ?6,
              ?7, ?8, ?9,
              ?10, ?11, ?12,
              ?13, ?14, 'submitted')`,
        )
        .bind(
          recordId,
          data.patientId,
          user.id,
          data.sessionDate,
          data.sessionTime ?? null,
          data.durationMin ?? null,
          data.cooperation   ? 1 : 0,
          data.attention     ? 1 : 0,
          data.inappropriate ? 1 : 0,
          data.transitions,
          data.eyeContact,
          data.communication,
          data.reinforcersUsed ?? null,
          data.generalNotes    ?? null,
        ),
    );

    // 4b. Programas de ensino (target_records)
    data.targets.forEach((t, idx) => {
      const pct =
        t.trials > 0 ? Math.round((t.correct / t.trials) * 100) : 0;

      statements.push(
        db
          .prepare(
            `INSERT INTO target_records
               (id, daily_record_id, patient_id, target_name,
                trials, correct, notes, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
          )
          .bind(
            generateId(),
            recordId,
            data.patientId,
            t.name,
            t.trials,
            t.correct,
            // guardamos a % calculada nos notes para auditoria rápida
            t.notes ?? `Desempenho: ${pct}%`,
            idx,
          ),
      );
    });

    // 4c. Comportamentos-problema (behavior_records)
    data.behaviors.forEach((b) => {
      statements.push(
        db
          .prepare(
            `INSERT INTO behavior_records
               (id, daily_record_id, patient_id, topography,
                duration_min, intensity, context, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
          )
          .bind(
            generateId(),
            recordId,
            data.patientId,
            b.topography,
            b.duration_min ?? null,
            b.intensity,
            b.context ?? null,
            b.notes   ?? null,
          ),
      );
    });

    // ── 5. Executa em lote (atômico no D1) ───────────────────────────────────
    await db.batch(statements);

    return {
      recordId,
      targets_saved:   data.targets.length,
      behaviors_saved: data.behaviors.length,
    };
  });

// ── Server Function: getSessionRecords ───────────────────────────────────────

/**
 * Busca os registros de sessão de um paciente (para histórico).
 * Retorna as últimas 30 sessões com desempenho calculado.
 */
export const getSessionRecords = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");

    const db = getDB();

    const records = await db
      .prepare(
        `SELECT
           dr.id, dr.session_date, dr.session_time, dr.duration_min,
           dr.status, u.name AS therapist_name,
           COUNT(DISTINCT tr.id) AS targets_count,
           COUNT(DISTINCT br.id) AS behaviors_count,
           ROUND(AVG(CASE WHEN tr.trials > 0 THEN CAST(tr.correct AS REAL)/tr.trials*100 ELSE NULL END), 1) AS avg_performance
         FROM daily_records dr
         JOIN users u ON u.id = dr.therapist_id
         LEFT JOIN target_records tr ON tr.daily_record_id = dr.id
         LEFT JOIN behavior_records br ON br.daily_record_id = dr.id
         WHERE dr.patient_id = ?1
         GROUP BY dr.id
         ORDER BY dr.session_date DESC, dr.session_time DESC
         LIMIT 30`,
      )
      .bind(data.patientId)
      .all<{
        id: string;
        session_date: string;
        session_time: string | null;
        duration_min: number | null;
        status: string;
        therapist_name: string;
        targets_count: number;
        behaviors_count: number;
        avg_performance: number | null;
      }>();

    return records.results;
  });
