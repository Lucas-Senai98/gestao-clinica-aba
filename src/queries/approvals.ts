/**
 * src/queries/approvals.ts
 * Server Functions para fila de aprovações da supervisão e controle de horas no D1.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB } from "@/db/db";
import { getSessionUser } from "@/queries/auth";

export interface ApprovalItem {
  id: string;
  type: string;
  detail: string;
  requester: string;
  when: string;
  priority: "Alta" | "Média" | "Baixa";
}

export const getPendingApprovals = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") throw new Error("Acesso negado.");

  const db = getDB();
  const rows = await db
    .prepare(
      `SELECT
         dr.id, dr.session_date, dr.session_time, dr.duration_min,
         p.name AS patient_name, u.name AS therapist_name
       FROM daily_records dr
       JOIN patients p ON p.id = dr.patient_id
       JOIN users u ON u.id = dr.therapist_id
       WHERE dr.status = 'submitted'
       ORDER BY dr.session_date DESC, dr.session_time DESC`,
    )
    .all<Record<string, unknown>>();

  return rows.results.map((r): ApprovalItem => ({
    id: String(r.id),
    type: "Folha de sessão",
    detail: `${r.patient_name} — Atendimento de ${r.duration_min || 50}min`,
    requester: String(r.therapist_name),
    when: String(r.session_date),
    priority: "Média",
  }));
});

export const updateApprovalStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), approved: z.boolean() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") throw new Error("Acesso negado.");

    const db = getDB();
    const newStatus = data.approved ? "approved" : "rejected";
    await db
      .prepare(`UPDATE daily_records SET status = ?1, updated_at = datetime('now') WHERE id = ?2`)
      .bind(newStatus, data.id)
      .run();

    return { success: true };
  });

export interface TherapistHourItem {
  therapist: string;
  date: string;
  sessions: number;
  hours: number;
}

export const getTherapistHours = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") throw new Error("Acesso negado.");

  const db = getDB();
  const rows = await db
    .prepare(
      `SELECT
         u.name AS therapist_name,
         dr.session_date,
         COUNT(dr.id) AS sessions_count,
         COALESCE(SUM(dr.duration_min), 0) AS total_minutes
       FROM daily_records dr
       JOIN users u ON u.id = dr.therapist_id
       GROUP BY u.id, dr.session_date
       ORDER BY dr.session_date DESC, u.name ASC
       LIMIT 50`,
    )
    .all<Record<string, unknown>>();

  return rows.results.map((r): TherapistHourItem => ({
    therapist: String(r.therapist_name),
    date: String(r.session_date),
    sessions: Number(r.sessions_count) || 0,
    hours: Math.round(((Number(r.total_minutes) || 0) / 60) * 10) / 10,
  }));
});
