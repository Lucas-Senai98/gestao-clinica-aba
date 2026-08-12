/**
 * src/server/queries/communication.ts
 *
 * Server Functions para Comunicação Real (Etapa 6):
 * - Feed de Devolutivas Diárias (Portal dos Pais com RBAC por patient_guardian)
 * - Quadro de Avisos Gerais (Announcements)
 * - Fórum Clínico Interno (Threads e mensagens por paciente com RBAC por patient_therapist)
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId } from "@/server/db";
import { getSessionUser } from "@/queries/auth";
import { sendNotificationHelper, logAuditEvent } from "@/queries/notifications_audit";

// ─────────────────────────────────────────────────────────────────────────────
// 1. PORTAL DOS PAIS: FEED DE DEVOLUTIVAS DIÁRIAS
// ─────────────────────────────────────────────────────────────────────────────

/** Busca o feed de devolutivas para o responsável logado (ou por paciente) */
export const getParentFeed = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string().optional() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");

    const db = getDB();

    // Se o usuário for pai (parent), busca apenas os pacientes vinculados a ele em patient_guardian
    if (user.role === "parent") {
      const guardianLinks = await db
        .prepare(`SELECT patient_id FROM patient_guardian WHERE guardian_id = ?1`)
        .bind(user.id)
        .all<{ patient_id: string }>();

      const linkedPatientIds = guardianLinks.results.map((r) => r.patient_id);
      if (linkedPatientIds.length === 0) {
        return [];
      }

      // Se passou um patientId específico, garante que está vinculado
      const targetPatientId = data.patientId;
      if (targetPatientId && !linkedPatientIds.includes(targetPatientId)) {
        throw new Error("Acesso negado: Você só pode visualizar devolutivas do seu filho.");
      }

      const queryFilter = targetPatientId
        ? `WHERE pf.patient_id = ?1`
        : `WHERE pf.patient_id IN (${linkedPatientIds.map((_, i) => `?${i + 1}`).join(",")})`;

      const bindArgs = targetPatientId ? [targetPatientId] : linkedPatientIds;

      const records = await db
        .prepare(
          `SELECT
             pf.id, pf.patient_id, pf.title, pf.body, pf.mood,
             pf.home_practices, pf.published_at,
             p.name AS patient_name, u.name AS author_name
           FROM parent_feed pf
           JOIN patients p ON p.id = pf.patient_id
           JOIN users u ON u.id = pf.author_id
           ${queryFilter}
           ORDER BY pf.published_at DESC`,
        )
        .bind(...bindArgs)
        .all<{
          id: string;
          patient_id: string;
          title: string;
          body: string;
          mood: string;
          home_practices: string | null;
          published_at: string;
          patient_name: string;
          author_name: string;
        }>();

      return records.results;
    }

    // Se for therapist ou admin, busca devolutivas do paciente solicitado (ou todas)
    const queryFilter = data.patientId ? `WHERE pf.patient_id = ?1` : ``;
    const bindArgs    = data.patientId ? [data.patientId] : [];

    const records = await db
      .prepare(
        `SELECT
           pf.id, pf.patient_id, pf.title, pf.body, pf.mood,
           pf.home_practices, pf.published_at,
           p.name AS patient_name, u.name AS author_name
         FROM parent_feed pf
         JOIN patients p ON p.id = pf.patient_id
         JOIN users u ON u.id = pf.author_id
         ${queryFilter}
         ORDER BY pf.published_at DESC`,
      )
      .bind(...bindArgs)
      .all<{
        id: string;
        patient_id: string;
        title: string;
        body: string;
        mood: string;
        home_practices: string | null;
        published_at: string;
        patient_name: string;
        author_name: string;
      }>();

    return records.results;
  });

/** Terapeuta ou Admin cria uma devolutiva diária para os pais */
const CreateDevolutivaInput = z.object({
  patientId:     z.string(),
  dailyRecordId: z.string().optional(),
  title:         z.string().min(1, "Título é obrigatório"),
  body:          z.string().min(1, "Texto da devolutiva é obrigatório"),
  mood:          z.enum(["ótimo", "bom", "neutro", "difícil"]).default("bom"),
  homePractices: z.string().optional(), // ex: "Praticar contato visual antes do lanche"
});

export const createDevolutiva = createServerFn({ method: "POST" })
  .validator((d: unknown) => CreateDevolutivaInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role === "parent") throw new Error("Responsáveis não criam devolutivas.");

    const db = getDB();

    // Verificação de vínculo RBAC para terapeutas
    if (user.role === "therapist") {
      const link = await db
        .prepare(`SELECT 1 FROM patient_therapist WHERE patient_id = ?1 AND therapist_id = ?2 LIMIT 1`)
        .bind(data.patientId, user.id)
        .first();
      if (!link) throw new Error("Acesso negado: Terapeuta não está vinculado a este paciente.");
    }

    const id = generateId();
    await db
      .prepare(
        `INSERT INTO parent_feed
           (id, patient_id, daily_record_id, author_id, title, body, mood, home_practices)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .bind(
        id,
        data.patientId,
        data.dailyRecordId ?? null,
        user.id,
        data.title,
        data.body,
        data.mood,
        data.homePractices ?? null,
      )
      .run();

    // Dispara Notificação para todos os responsáveis do paciente
    const guardians = await db
      .prepare(`SELECT guardian_id FROM patient_guardian WHERE patient_id = ?1`)
      .bind(data.patientId)
      .all<{ guardian_id: string }>();

    for (const g of guardians.results) {
      await sendNotificationHelper(
        g.guardian_id,
        "Nova Devolutiva de Sessão 💜",
        `O terapeuta ${user.name} publicou a devolutiva da sessão. Acesse o portal para visualizar.`,
        "devolutiva",
      );
    }

    // Grava Log de Auditoria LGPD
    await logAuditEvent(user.id, "CREATE_DEVOLUTIVA", "parent_feed", data.patientId);

    return { id };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 2. QUADRO DE AVISOS GERAIS (ANNOUNCEMENTS)
// ─────────────────────────────────────────────────────────────────────────────

export const getAnnouncements = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDB();
  const records = await db
    .prepare(
      `SELECT
         a.id, a.title, a.body, a.is_active, a.published_at,
         u.name AS author_name
       FROM announcements a
       JOIN users u ON u.id = a.author_id
       WHERE a.is_active = 1
       ORDER BY a.published_at DESC`,
    )
    .all<{
      id: string;
      title: string;
      body: string;
      is_active: number;
      published_at: string;
      author_name: string;
    }>();

  return records.results;
});

const CreateAnnouncementInput = z.object({
  title: z.string().min(1, "Título do aviso é obrigatório"),
  body:  z.string().min(1, "Conteúdo do aviso é obrigatório"),
});

export const createAnnouncement = createServerFn({ method: "POST" })
  .validator((d: unknown) => CreateAnnouncementInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role !== "admin") throw new Error("Apenas o perfil de Supervisão/Admin pode publicar avisos gerais.");

    const db = getDB();
    const id = generateId();

    await db
      .prepare(
        `INSERT INTO announcements (id, author_id, title, body)
         VALUES (?1, ?2, ?3, ?4)`,
      )
      .bind(id, user.id, data.title, data.body)
      .run();

    await logAuditEvent(user.id, "CREATE_ANNOUNCEMENT", "announcements");

    return { id };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .validator(z.object({ announcementId: z.string() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role !== "admin") throw new Error("Apenas Admin pode remover avisos.");

    await getDB()
      .prepare(`UPDATE announcements SET is_active = 0 WHERE id = ?1`)
      .bind(data.announcementId)
      .run();

    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 3. FÓRUM CLÍNICO INTERNO (THREADS E RESPOSTAS POR PACIENTE)
// ─────────────────────────────────────────────────────────────────────────────

export const getForumThreads = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string().optional() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role === "parent") throw new Error("Acesso negado ao fórum clínico interno.");

    const db = getDB();

    // Terapeutas só acessam discussões de pacientes vinculados a eles em patient_therapist (ou assuntos gerais)
    if (user.role === "therapist") {
      const linked = await db
        .prepare(`SELECT patient_id FROM patient_therapist WHERE therapist_id = ?1`)
        .bind(user.id)
        .all<{ patient_id: string }>();

      const linkedIds = linked.results.map((r) => r.patient_id);

      // Busca tópicos vinculados aos seus pacientes ou gerais (patient_id IS NULL)
      let queryFilter = `WHERE ft.patient_id IS NULL`;
      let bindArgs: string[] = [];

      if (linkedIds.length > 0) {
        queryFilter = `WHERE (ft.patient_id IS NULL OR ft.patient_id IN (${linkedIds.map((_, i) => `?${i + 1}`).join(",")}))`;
        bindArgs = linkedIds;
      }

      if (data.patientId) {
        if (!linkedIds.includes(data.patientId)) {
          throw new Error("Acesso negado: Você não possui vínculo com este paciente.");
        }
        queryFilter = `WHERE ft.patient_id = ?1`;
        bindArgs    = [data.patientId];
      }

      const threads = await db
        .prepare(
          `SELECT
             ft.id, ft.title, ft.preview, ft.is_pinned, ft.created_at, ft.patient_id,
             p.name AS patient_name, u.name AS author_name, u.avatar_initials AS author_avatar,
             (SELECT COUNT(*) FROM forum_replies fr WHERE fr.thread_id = ft.id) AS replies_count
           FROM forum_threads ft
           LEFT JOIN patients p ON p.id = ft.patient_id
           JOIN users u ON u.id = ft.author_id
           ${queryFilter}
           ORDER BY ft.is_pinned DESC, ft.created_at DESC`,
        )
        .bind(...bindArgs)
        .all<{
          id: string;
          title: string;
          preview: string | null;
          is_pinned: number;
          created_at: string;
          patient_id: string | null;
          patient_name: string | null;
          author_name: string;
          author_avatar: string;
          replies_count: number;
        }>();

      return threads.results;
    }

    // Admin acessa todos
    const queryFilter = data.patientId ? `WHERE ft.patient_id = ?1` : ``;
    const bindArgs    = data.patientId ? [data.patientId] : [];

    const threads = await db
      .prepare(
        `SELECT
           ft.id, ft.title, ft.preview, ft.is_pinned, ft.created_at, ft.patient_id,
           p.name AS patient_name, u.name AS author_name, u.avatar_initials AS author_avatar,
           (SELECT COUNT(*) FROM forum_replies fr WHERE fr.thread_id = ft.id) AS replies_count
         FROM forum_threads ft
         LEFT JOIN patients p ON p.id = ft.patient_id
         JOIN users u ON u.id = ft.author_id
         ${queryFilter}
         ORDER BY ft.is_pinned DESC, ft.created_at DESC`,
      )
      .bind(...bindArgs)
      .all<{
        id: string;
        title: string;
        preview: string | null;
        is_pinned: number;
        created_at: string;
        patient_id: string | null;
        patient_name: string | null;
        author_name: string;
        author_avatar: string;
        replies_count: number;
      }>();

    return threads.results;
  });

const CreateThreadInput = z.object({
  patientId: z.string().optional(),
  title:     z.string().min(1, "Título do tópico obrigatório"),
  preview:   z.string().optional(),
});

export const createForumThread = createServerFn({ method: "POST" })
  .validator((d: unknown) => CreateThreadInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role === "parent") throw new Error("Responsáveis não acessam o fórum interno.");

    const db = getDB();

    if (user.role === "therapist" && data.patientId) {
      const link = await db
        .prepare(`SELECT 1 FROM patient_therapist WHERE patient_id = ?1 AND therapist_id = ?2 LIMIT 1`)
        .bind(data.patientId, user.id)
        .first();
      if (!link) throw new Error("Acesso negado ao criar tópico para paciente não vinculado.");
    }

    const id = generateId();
    await db
      .prepare(
        `INSERT INTO forum_threads (id, author_id, patient_id, title, preview)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
      )
      .bind(id, user.id, data.patientId ?? null, data.title, data.preview ?? null)
      .run();

    return { id };
  });

export const getThreadReplies = createServerFn({ method: "GET" })
  .validator(z.object({ threadId: z.string() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role === "parent") throw new Error("Acesso negado.");

    const db = getDB();

    const replies = await db
      .prepare(
        `SELECT
           fr.id, fr.thread_id, fr.text, fr.created_at,
           u.id AS author_id, u.name AS author_name, u.avatar_initials AS author_avatar, u.role AS author_role
         FROM forum_replies fr
         JOIN users u ON u.id = fr.author_id
         WHERE fr.thread_id = ?1
         ORDER BY fr.created_at ASC`,
      )
      .bind(data.threadId)
      .all<{
        id: string;
        thread_id: string;
        text: string;
        created_at: string;
        author_id: string;
        author_name: string;
        author_avatar: string;
        author_role: string;
      }>();

    return replies.results;
  });

const SendReplyInput = z.object({
  threadId: z.string(),
  text:     z.string().min(1, "Mensagem não pode estar vazia"),
});

export const sendThreadReply = createServerFn({ method: "POST" })
  .validator((d: unknown) => SendReplyInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role === "parent") throw new Error("Sem permissão.");

    const db = getDB();
    const id = generateId();

    await db
      .prepare(
        `INSERT INTO forum_replies (id, thread_id, author_id, text)
         VALUES (?1, ?2, ?3, ?4)`,
      )
      .bind(id, data.threadId, user.id, data.text)
      .run();

    // Atualiza updated_at do tópico
    await db
      .prepare(`UPDATE forum_threads SET updated_at = datetime('now') WHERE id = ?1`)
      .bind(data.threadId)
      .run();

    return { id };
  });
