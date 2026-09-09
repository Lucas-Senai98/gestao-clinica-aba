/**
 * src/queries/pei.ts
 * Server Functions para o Plano de Ensino Individualizado (PEI) no Cloudflare D1.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB } from "@/db/db";
import { getSessionUser } from "@/queries/auth";

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
