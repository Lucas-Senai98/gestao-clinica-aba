/**
 * src/server/queries/notifications_audit.ts
 *
 * Server Functions para a Central de Notificações In-App e Trilha de Auditoria (LGPD):
 * - Registro e consulta de alertas/notificações em tempo real
 * - Registro de logs de auditoria imutáveis para conformidade com a LGPD
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId } from "@/server/db";
import { getSessionUser } from "@/server/queries/auth";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CENTRAL DE NOTIFICAÇÕES IN-APP
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "devolutiva" | "announcement" | "forum" | "info";
  is_read: number;
  created_at: string;
};

/** Busca as notificações do usuário logado */
export const getNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getSessionUser();
  if (!user) throw new Error("Sessão expirada.");

  const db = getDB();
  const records = await db
    .prepare(
      `SELECT id, user_id, title, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = ?1
       ORDER BY created_at DESC
       LIMIT 50`,
    )
    .bind(user.id)
    .all<NotificationItem>();

  return records.results;
});

/** Busca contagem de notificações não lidas para o badge */
export const getUnreadNotificationCount = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getSessionUser();
  if (!user) return { count: 0 };

  const db = getDB();
  const res = await db
    .prepare(`SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?1 AND is_read = 0`)
    .bind(user.id)
    .first<{ count: number }>();

  return { count: res?.count ?? 0 };
});

/** Marca uma notificação como lida */
export const markNotificationAsRead = createServerFn({ method: "POST" })
  .validator(z.object({ notificationId: z.string() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");

    const db = getDB();
    await db
      .prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?1 AND user_id = ?2`)
      .bind(data.notificationId, user.id)
      .run();

    return { ok: true };
  });

/** Marca todas as notificações como lidas */
export const markAllNotificationsAsRead = createServerFn({ method: "POST" }).handler(async () => {
  const user = await getSessionUser();
  if (!user) throw new Error("Sessão expirada.");

  const db = getDB();
  await db
    .prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?1`)
    .bind(user.id)
    .run();

  return { ok: true };
});

/** Função auxiliar interna para enviar notificações */
export async function sendNotificationHelper(
  userId: string,
  title: string,
  message: string,
  type: "devolutiva" | "announcement" | "forum" | "info" = "info",
) {
  const db = getDB();
  const id = generateId();

  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, title, message, type)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(id, userId, title, message, type)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TRILHA DE AUDITORIA LGPD (IMUTÁVEL)
// ─────────────────────────────────────────────────────────────────────────────

export type AuditLogItem = {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  patient_id: string | null;
  patient_name: string | null;
  action: string;
  resource: string;
  ip_address: string | null;
  timestamp: string;
};

/** Função auxiliar interna para registrar log de auditoria */
export async function logAuditEvent(
  userId: string,
  action: string,
  resource: string,
  patientId?: string | null,
  ipAddress: string = "127.0.0.1",
) {
  try {
    const db = getDB();
    const id = generateId();

    await db
      .prepare(
        `INSERT INTO audit_logs (id, user_id, patient_id, action, resource, ip_address)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      )
      .bind(id, userId, patientId ?? null, action, resource, ipAddress)
      .run();
  } catch (err) {
    console.error("Erro ao gravar log de auditoria LGPD:", err);
  }
}

/** Server Function exposta para registrar eventos de auditoria do frontend (ex: exportação de PDF) */
const RecordAuditInput = z.object({
  action:    z.string().min(1),
  resource:  z.string().min(1),
  patientId: z.string().optional(),
});

export const recordAuditLog = createServerFn({ method: "POST" })
  .validator((d: unknown) => RecordAuditInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) return { ok: false };

    await logAuditEvent(user.id, data.action, data.resource, data.patientId);
    return { ok: true };
  });

/** Busca todos os logs de auditoria (Apenas ADMIN) */
export const getAuditLogs = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getSessionUser();
  if (!user) throw new Error("Sessão expirada.");
  if (user.role !== "admin") throw new Error("Acesso negado: Apenas supervisores/admin acessam a auditoria LGPD.");

  const db = getDB();
  const records = await db
    .prepare(
      `SELECT
         al.id, al.user_id, al.patient_id, al.action, al.resource, al.ip_address, al.timestamp,
         u.name AS user_name, u.role AS user_role,
         p.name AS patient_name
       FROM audit_logs al
       JOIN users u ON u.id = al.user_id
       LEFT JOIN patients p ON p.id = al.patient_id
       ORDER BY al.timestamp DESC
       LIMIT 100`,
    )
    .all<AuditLogItem>();

  return records.results;
});
