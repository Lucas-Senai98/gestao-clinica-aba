/**
 * src/queries/appointments.ts
 * Server Functions para a Agenda Clínica Integrada (Cloudflare D1).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB } from "@/db/db";
import { getSessionUser } from "@/queries/auth";

export interface AppointmentItem {
  id: string;
  time: string;
  duration: string;
  patient: string;
  patientId: string;
  therapist: string;
  type: string;
  room: string;
  status: "Agendada" | "Em andamento" | "Concluída" | "Cancelada";
  date: string;
}

export const getAppointments = createServerFn({ method: "GET" })
  .validator(z.object({ date: z.string().optional() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");

    const db = getDB();
    const query = `
      SELECT
        a.id, a.date, a.start_time, a.end_time, a.type, a.room, a.status,
        p.id AS patient_id, p.name AS patient_name,
        u.name AS therapist_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN users u ON u.id = a.therapist_id
      ${data.date ? "WHERE a.date = ?1" : ""}
      ORDER BY a.date ASC, a.start_time ASC
    `;

    const stmt = db.prepare(query);
    const rows = data.date ? await stmt.bind(data.date).all<Record<string, unknown>>() : await stmt.all<Record<string, unknown>>();

    return rows.results.map((r): AppointmentItem => ({
      id: String(r.id),
      time: String(r.start_time || "08:00"),
      duration: "50min",
      patient: String(r.patient_name || "Paciente"),
      patientId: String(r.patient_id),
      therapist: String(r.therapist_name || "Terapeuta"),
      type: String(r.type || "ABA Intensivo"),
      room: String(r.room || "Sala 01"),
      status: (r.status as AppointmentItem["status"]) || "Agendada",
      date: String(r.date || ""),
    }));
  });

export const getParentAppointments = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getSessionUser();
  if (!user) throw new Error("Sessão expirada.");

  const db = getDB();
  const rows = await db
    .prepare(
      `SELECT
         a.id, a.date, a.start_time, a.end_time, a.type, a.status,
         p.name AS patient_name, u.name AS therapist_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN users u ON u.id = a.therapist_id
       JOIN patient_guardian pg ON pg.patient_id = a.patient_id
       WHERE pg.guardian_id = ?1
       ORDER BY a.date ASC, a.start_time ASC
       LIMIT 10`,
    )
    .bind(user.id)
    .all<Record<string, unknown>>();

  return rows.results.map((r) => ({
    id: String(r.id),
    day: String(r.date).slice(8, 10),
    date: String(r.date),
    time: String(r.start_time || "14:00"),
    type: String(r.type || "Atendimento Clínico"),
    therapist: String(r.therapist_name || "Terapeuta"),
    status: String(r.status || "Confirmada"),
  }));
});
