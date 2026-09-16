/**
 * src/queries/pei.ts
 * Server Functions para o Plano de Ensino Individualizado (PEI) no Cloudflare D1.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId } from "@/db/db";
import { getSessionUser } from "@/queries/auth";
import { logAuditEvent } from "@/queries/notifications_audit";

export interface PeiGoalItem {
  id: string;
  area: string;
  goal: string;
  criteria: string;
  baseline: number;
  current: number;
  target: number;
  status: "Em andamento" | "Atingida" | "Suspensa";
  responsible: string;
  review: string;
}

export interface PeiHistoryItem {
  date: string;
  author: string;
  note: string;
}

export const getPeiData = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");

    const db = getDB();

    const [goalsRows, historyRows] = await Promise.all([
      db
        .prepare(
          `SELECT
             g.id, g.area, g.goal, g.criteria, g.baseline,
             g.current_val, g.target_val, g.status, g.review_date,
             u.name AS responsible_name
           FROM pei_goals g
           LEFT JOIN users u ON u.id = g.responsible_id
           WHERE g.patient_id = ?1
           ORDER BY g.created_at ASC`,
        )
        .bind(data.patientId)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT
             h.created_at, h.note, u.name AS author_name
           FROM pei_history h
           JOIN users u ON u.id = h.author_id
           WHERE h.patient_id = ?1
           ORDER BY h.created_at DESC`,
        )
        .bind(data.patientId)
        .all<Record<string, unknown>>(),
    ]);

    const goals: PeiGoalItem[] = goalsRows.results.map((r) => ({
      id: String(r.id),
      area: String(r.area),
      goal: String(r.goal),
      criteria: String(r.criteria),
      baseline: Number(r.baseline) || 0,
      current: Number(r.current_val) || 0,
      target: Number(r.target_val) || 80,
      status: (r.status as PeiGoalItem["status"]) || "Em andamento",
      responsible: String(r.responsible_name || "Terapeuta responsável"),
      review: String(r.review_date || "A definir"),
    }));

    const history: PeiHistoryItem[] = historyRows.results.map((r) => ({
      date: String(r.created_at).slice(0, 10),
      author: String(r.author_name),
      note: String(r.note),
    }));

    return { goals, history };
  });

const PeiGoalInput = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1),
  area: z.string().min(2),
  goal: z.string().min(3),
  criteria: z.string().min(3),
  baseline: z.number().int().min(0).max(100),
  current: z.number().int().min(0).max(100),
  target: z.number().int().min(1).max(100),
  status: z.enum(["Em andamento", "Atingida", "Suspensa"]).default("Em andamento"),
  responsibleId: z.string().optional(),
  review: z.string().optional(),
});

async function requireClinicalUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("Sessão expirada.");
  if (user.role === "parent") throw new Error("Responsáveis não podem alterar o PEI.");
  return user;
}

export const savePeiGoal = createServerFn({ method: "POST" })
  .validator((d: unknown) => PeiGoalInput.parse(d))
  .handler(async ({ data }) => {
    const user = await requireClinicalUser();
    const responsibleId = data.responsibleId || user.id;

    if (data.id) {
      await getDB()
        .prepare(
          `UPDATE pei_goals SET
             area = ?1, goal = ?2, criteria = ?3, baseline = ?4,
             current_val = ?5, target_val = ?6, status = ?7,
             responsible_id = ?8, review_date = ?9, updated_at = datetime('now')
           WHERE id = ?10`,
        )
        .bind(
          data.area,
          data.goal,
          data.criteria,
          data.baseline,
          data.current,
          data.target,
          data.status,
          responsibleId,
          data.review || null,
          data.id,
        )
        .run();
      await logAuditEvent(user.id, "UPDATE_PEI_GOAL", "pei_goals", data.patientId);
      return { id: data.id };
    }

    const id = generateId();
    await getDB()
      .prepare(
        `INSERT INTO pei_goals
           (id, patient_id, responsible_id, area, goal, criteria, baseline, current_val, target_val, status, review_date)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
      )
      .bind(
        id,
        data.patientId,
        responsibleId,
        data.area,
        data.goal,
        data.criteria,
        data.baseline,
        data.current,
        data.target,
        data.status,
        data.review || null,
      )
      .run();
    await logAuditEvent(user.id, "CREATE_PEI_GOAL", "pei_goals", data.patientId);
    return { id };
  });

export const addPeiReview = createServerFn({ method: "POST" })
  .validator(
    z.object({
      goalId: z.string(),
      patientId: z.string(),
      note: z.string().min(3),
      current: z.number().int().min(0).max(100).optional(),
      status: z.enum(["Em andamento", "Atingida", "Suspensa"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireClinicalUser();
    const statements: D1PreparedStatement[] = [
      getDB()
        .prepare(`INSERT INTO pei_history (id, goal_id, patient_id, author_id, note) VALUES (?1, ?2, ?3, ?4, ?5)`)
        .bind(generateId(), data.goalId, data.patientId, user.id, data.note),
    ];

    if (data.current !== undefined || data.status) {
      statements.push(
        getDB()
          .prepare(
            `UPDATE pei_goals
             SET current_val = COALESCE(?1, current_val),
                 status = COALESCE(?2, status),
                 updated_at = datetime('now')
             WHERE id = ?3`,
          )
          .bind(data.current ?? null, data.status ?? null, data.goalId),
      );
    }

    await getDB().batch(statements);
    await logAuditEvent(user.id, "REVIEW_PEI_GOAL", "pei_goals", data.patientId);
    return { ok: true };
  });

export const suspendPeiGoal = createServerFn({ method: "POST" })
  .validator(z.object({ goalId: z.string(), patientId: z.string(), reason: z.string().optional() }))
  .handler(async ({ data }) => {
    const user = await requireClinicalUser();
    await getDB().batch([
      getDB()
        .prepare(`UPDATE pei_goals SET status = 'Suspensa', updated_at = datetime('now') WHERE id = ?1`)
        .bind(data.goalId),
      getDB()
        .prepare(`INSERT INTO pei_history (id, goal_id, patient_id, author_id, note) VALUES (?1, ?2, ?3, ?4, ?5)`)
        .bind(generateId(), data.goalId, data.patientId, user.id, data.reason || "Meta suspensa."),
    ]);
    await logAuditEvent(user.id, "SUSPEND_PEI_GOAL", "pei_goals", data.patientId);
    return { ok: true };
  });

export const deletePeiGoal = createServerFn({ method: "POST" })
  .validator(z.object({ goalId: z.string(), patientId: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireClinicalUser();
    await getDB().prepare(`DELETE FROM pei_goals WHERE id = ?1`).bind(data.goalId).run();
    await logAuditEvent(user.id, "DELETE_PEI_GOAL", "pei_goals", data.patientId);
    return { ok: true };
  });
