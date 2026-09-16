/**
 * Server Functions para a Agenda Clínica Integrada.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId } from "@/db/db";
import { getSessionUser } from "@/queries/auth";
import { logAuditEvent } from "@/queries/notifications_audit";

const AppointmentStatus = z.enum([
  "Agendada",
  "Confirmada",
  "Em andamento",
  "Concluída",
  "Cancelada",
  "Remarcada",
]);

const AppointmentInput = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1),
  therapistId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.number().int().positive().max(480),
  type: z.string().min(2),
  room: z.string().optional(),
  status: AppointmentStatus.default("Agendada"),
  notes: z.string().optional(),
});

export interface AppointmentItem {
  id: string;
  time: string;
  duration: string;
  durationMin: number;
  patient: string;
  patientId: string;
  therapist: string;
  therapistId: string;
  type: string;
  room: string;
  status: z.infer<typeof AppointmentStatus>;
  date: string;
  notes: string | null;
}

function splitScheduledAt(value: unknown) {
  const raw = String(value || "");
  const [date = "", timeWithSeconds = "08:00"] = raw.split(" ");
  return { date, time: timeWithSeconds.slice(0, 5) };
}

async function requireAdminOrTherapist() {
  const user = await getSessionUser();
  if (!user) throw new Error("Sessão expirada.");
  if (user.role === "parent") throw new Error("Responsáveis não podem alterar a agenda.");
  return user;
}

export const getAppointments = createServerFn({ method: "GET" })
  .validator(z.object({ date: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");

    const rows = await getDB()
      .prepare(
        `SELECT
           a.id, a.patient_id, a.therapist_id, a.scheduled_at, a.duration_min,
           a.therapy_type, a.room, a.status, a.notes,
           p.name AS patient_name,
           u.name AS therapist_name
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         JOIN users u ON u.id = a.therapist_id
         WHERE (?1 IS NULL OR date(a.scheduled_at) = ?1)
         ORDER BY a.scheduled_at ASC`,
      )
      .bind(data?.date ?? null)
      .all<Record<string, unknown>>();

    return rows.results.map((r): AppointmentItem => {
      const scheduled = splitScheduledAt(r.scheduled_at);
      const durationMin = Number(r.duration_min) || 50;
      return {
        id: String(r.id),
        time: scheduled.time,
        duration: `${durationMin}min`,
        durationMin,
        patient: String(r.patient_name || "Paciente"),
        patientId: String(r.patient_id),
        therapist: String(r.therapist_name || "Terapeuta"),
        therapistId: String(r.therapist_id),
        type: String(r.therapy_type || "ABA Intensivo"),
        room: String(r.room || "Sala 01"),
        status: (r.status as AppointmentItem["status"]) || "Agendada",
        date: scheduled.date,
        notes: r.notes == null ? null : String(r.notes),
      };
    });
  });

export const saveAppointment = createServerFn({ method: "POST" })
  .validator((d: unknown) => AppointmentInput.parse(d))
  .handler(async ({ data }) => {
    const user = await requireAdminOrTherapist();
    const db = getDB();
    const scheduledAt = `${data.date} ${data.time}:00`;

    if (data.id) {
      await db
        .prepare(
          `UPDATE appointments
           SET patient_id = ?1, therapist_id = ?2, scheduled_at = ?3,
               duration_min = ?4, therapy_type = ?5, room = ?6,
               status = ?7, notes = ?8, updated_at = datetime('now')
           WHERE id = ?9`,
        )
        .bind(
          data.patientId,
          data.therapistId,
          scheduledAt,
          data.durationMin,
          data.type,
          data.room || null,
          data.status,
          data.notes || null,
          data.id,
        )
        .run();
      await logAuditEvent(user.id, "UPDATE_APPOINTMENT", "appointments", data.patientId);
      return { id: data.id };
    }

    const id = generateId();
    await db
      .prepare(
        `INSERT INTO appointments
           (id, patient_id, therapist_id, scheduled_at, duration_min, therapy_type, room, status, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      )
      .bind(
        id,
        data.patientId,
        data.therapistId,
        scheduledAt,
        data.durationMin,
        data.type,
        data.room || null,
        data.status,
        data.notes || null,
      )
      .run();
    await logAuditEvent(user.id, "CREATE_APPOINTMENT", "appointments", data.patientId);
    return { id };
  });

export const updateAppointmentStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), status: AppointmentStatus }))
  .handler(async ({ data }) => {
    const user = await requireAdminOrTherapist();
    const row = await getDB()
      .prepare(`SELECT patient_id FROM appointments WHERE id = ?1`)
      .bind(data.id)
      .first<{ patient_id: string }>();

    await getDB()
      .prepare(`UPDATE appointments SET status = ?1, updated_at = datetime('now') WHERE id = ?2`)
      .bind(data.status, data.id)
      .run();
    await logAuditEvent(user.id, `STATUS_APPOINTMENT_${data.status}`, "appointments", row?.patient_id);
    return { ok: true };
  });

export const deleteAppointment = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireAdminOrTherapist();
    const row = await getDB()
      .prepare(`SELECT patient_id FROM appointments WHERE id = ?1`)
      .bind(data.id)
      .first<{ patient_id: string }>();

    await getDB().prepare(`DELETE FROM appointments WHERE id = ?1`).bind(data.id).run();
    await logAuditEvent(user.id, "DELETE_APPOINTMENT", "appointments", row?.patient_id);
    return { ok: true };
  });

export const getParentAppointments = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getSessionUser();
  if (!user) throw new Error("Sessão expirada.");

  const rows = await getDB()
    .prepare(
      `SELECT
         a.id, a.scheduled_at, a.therapy_type, a.status,
         p.name AS patient_name, u.name AS therapist_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN users u ON u.id = a.therapist_id
       JOIN patient_guardian pg ON pg.patient_id = a.patient_id
       WHERE pg.guardian_id = ?1
       ORDER BY a.scheduled_at ASC
       LIMIT 10`,
    )
    .bind(user.id)
    .all<Record<string, unknown>>();

  return rows.results.map((r) => {
    const scheduled = splitScheduledAt(r.scheduled_at);
    return {
      id: String(r.id),
      day: scheduled.date.slice(8, 10),
      date: scheduled.date,
      time: scheduled.time,
      type: String(r.therapy_type || "Atendimento Clínico"),
      therapist: String(r.therapist_name || "Terapeuta"),
      status: String(r.status || "Confirmada"),
    };
  });
});
