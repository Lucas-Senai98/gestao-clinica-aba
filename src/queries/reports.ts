import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId } from "@/db/db";
import { getSessionUser } from "@/queries/auth";
import { logAuditEvent } from "@/queries/notifications_audit";

export interface ClinicalReportItem {
  id: string;
  patientId: string;
  patient: string;
  templateId: string;
  template: string;
  title: string;
  content: string;
  author: string;
  date: string;
  status: "Rascunho" | "Emitido" | "Arquivado";
}

const ReportInput = z.object({
  patientId: z.string().min(1),
  templateId: z.string().min(1),
  templateName: z.string().min(1),
  title: z.string().min(2),
  content: z.string().min(5),
  status: z.enum(["Rascunho", "Emitido", "Arquivado"]).default("Rascunho"),
});

export const getClinicalReports = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");

    const rows = await getDB()
      .prepare(
        `SELECT
           r.id, r.patient_id, r.template_id, r.title, r.content, r.status, r.created_at,
           p.name AS patient_name,
           u.name AS author_name
         FROM clinical_reports r
         JOIN patients p ON p.id = r.patient_id
         JOIN users u ON u.id = r.author_id
         WHERE (?1 IS NULL OR r.patient_id = ?1)
         ORDER BY r.created_at DESC
         LIMIT 80`,
      )
      .bind(data?.patientId ?? null)
      .all<Record<string, unknown>>();

    return rows.results.map((r): ClinicalReportItem => ({
      id: String(r.id),
      patientId: String(r.patient_id),
      patient: String(r.patient_name || "Paciente"),
      templateId: String(r.template_id),
      template: String(r.template_id),
      title: String(r.title),
      content: String(r.content),
      author: String(r.author_name || "Profissional"),
      date: String(r.created_at).slice(0, 10),
      status: (r.status as ClinicalReportItem["status"]) || "Rascunho",
    }));
  });

export const createClinicalReport = createServerFn({ method: "POST" })
  .validator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role === "parent") throw new Error("Responsáveis não podem gerar relatórios clínicos.");

    const id = generateId();
    await getDB()
      .prepare(
        `INSERT INTO clinical_reports
           (id, patient_id, author_id, template_id, title, content, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      )
      .bind(id, data.patientId, user.id, data.templateId, data.title, data.content, data.status)
      .run();

    await logAuditEvent(user.id, "CREATE_CLINICAL_REPORT", "clinical_reports", data.patientId);
    return { id };
  });

export const updateClinicalReportStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), status: z.enum(["Rascunho", "Emitido", "Arquivado"]) }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role === "parent") throw new Error("Responsáveis não podem alterar relatórios.");

    const row = await getDB()
      .prepare(`SELECT patient_id FROM clinical_reports WHERE id = ?1`)
      .bind(data.id)
      .first<{ patient_id: string }>();

    await getDB()
      .prepare(`UPDATE clinical_reports SET status = ?1, updated_at = datetime('now') WHERE id = ?2`)
      .bind(data.status, data.id)
      .run();
    await logAuditEvent(user.id, `STATUS_CLINICAL_REPORT_${data.status}`, "clinical_reports", row?.patient_id);
    return { ok: true };
  });

export const deleteClinicalReport = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role !== "admin") throw new Error("Apenas supervisores podem excluir relatórios.");

    const row = await getDB()
      .prepare(`SELECT patient_id FROM clinical_reports WHERE id = ?1`)
      .bind(data.id)
      .first<{ patient_id: string }>();

    await getDB().prepare(`DELETE FROM clinical_reports WHERE id = ?1`).bind(data.id).run();
    await logAuditEvent(user.id, "DELETE_CLINICAL_REPORT", "clinical_reports", row?.patient_id);
    return { ok: true };
  });
