/**
 * src/queries/team.ts
 *
 * Server Functions para gestão da Equipe Clínica (D1 + PBKDF2 + LGPD Audit):
 * - Consulta de membros da equipe (admin e terapeutas)
 * - Cadastro de novos membros com senha inicial padrão e hash seguro
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId } from "@/db/db";
import { getSessionUser, generateSalt, pbkdf2Hash, registerDevUser } from "@/queries/auth";
import { logAuditEvent } from "@/queries/notifications_audit";

export interface TeamMemberItem {
  id: string;
  email: string;
  name: string;
  role: "admin" | "therapist";
  registry: string | null;
  avatar_initials: string | null;
  is_active: number;
  is_master?: number;
  change_password_required?: number;
  caseload: number;
  weeklyHours: number;
  status: string;
}

// ── In-Memory Store de Desenvolvimento (Garante que novos cadastros apareçam na hora) ──

const INITIAL_DEV_TEAM: TeamMemberItem[] = [
  {
    id: "u-master-01",
    email: "master@gizeclinica.com.br",
    name: "Usuário Master",
    role: "admin",
    registry: null,
    avatar_initials: "UM",
    is_active: 1,
    is_master: 1,
    caseload: 0,
    weeklyHours: 40,
    status: "Ativa",
  },
  {
    id: "tm1",
    email: "ana.lopes@gizeclinica.com.br",
    name: "Ana Beatriz Lopes",
    role: "therapist",
    registry: "CRP 06/12345",
    avatar_initials: "AB",
    is_active: 1,
    caseload: 8,
    weeklyHours: 32,
    status: "Ativa",
  },
  {
    id: "tm2",
    email: "carla.mendes@gizeclinica.com.br",
    name: "Carla Mendes",
    role: "therapist",
    registry: "CRFa 2-98765",
    avatar_initials: "CM",
    is_active: 1,
    caseload: 6,
    weeklyHours: 24,
    status: "Ativa",
  },
  {
    id: "tm3",
    email: "diego.ramos@gizeclinica.com.br",
    name: "Diego Ramos",
    role: "therapist",
    registry: "CRP 06/54321",
    avatar_initials: "DR",
    is_active: 1,
    caseload: 7,
    weeklyHours: 30,
    status: "Ativa",
  },
  {
    id: "tm4",
    email: "fernanda.souza@gizeclinica.com.br",
    name: "Fernanda Souza",
    role: "therapist",
    registry: "CREFITO 3/11223",
    avatar_initials: "FS",
    is_active: 1,
    caseload: 5,
    weeklyHours: 20,
    status: "Ativa",
  },
  {
    id: "tm5",
    email: "marina.duarte@gizeclinica.com.br",
    name: "Marina Duarte",
    role: "admin",
    registry: "CRP 06/77889",
    avatar_initials: "MD",
    is_active: 1,
    caseload: 3,
    weeklyHours: 36,
    status: "Ativa",
  },
];

export const DEV_TEAM_MEMBERS: TeamMemberItem[] = [...INITIAL_DEV_TEAM];

// ── Server Function: getClinicTeam ───────────────────────────────────────────

export const getClinicTeam = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    throw new Error("Acesso negado: privilégios de supervisão necessários.");
  }

  const db = getDB();

  try {
    const rows = await db
      .prepare(
        `SELECT
           u.id, u.email, u.name, u.role, u.registry, u.avatar_initials, u.is_active,
           COALESCE(u.is_master, 0) AS is_master,
           COUNT(DISTINCT pt.patient_id) AS caseload
         FROM users u
         LEFT JOIN patient_therapist pt ON pt.therapist_id = u.id
         WHERE u.role IN ('admin', 'therapist')
         GROUP BY u.id
         ORDER BY u.name ASC`,
      )
      .all<{
        id: string;
        email: string;
        name: string;
        role: "admin" | "therapist";
        registry: string | null;
        avatar_initials: string | null;
        is_active: number;
        is_master: number;
        caseload: number;
      }>();

    if (rows?.results && rows.results.length > 0) {
      const d1Members = rows.results.map((r: {
        id: string;
        email: string;
        name: string;
        role: "admin" | "therapist";
        registry: string | null;
        avatar_initials: string | null;
        is_active: number;
        is_master: number;
        caseload: number;
      }): TeamMemberItem => {
        const roleTyped = (r.role === "admin" ? "admin" : "therapist") as "admin" | "therapist";
        return {
          id: r.id,
          email: r.email,
          name: r.name,
          role: roleTyped,
          registry: r.registry,
          avatar_initials: r.avatar_initials,
          is_active: r.is_active,
          is_master: r.is_master,
          caseload: r.caseload,
          weeklyHours: roleTyped === "admin" ? 40 : Math.min(40, Math.max(16, r.caseload * 4)),
          status: r.is_active === 1 ? "Ativa" : "Inativo",
        };
      });

      // Mescla com membros criados dinamicamente no ambiente de dev que não estejam duplicados
      const d1Emails = new Set(d1Members.map((m: TeamMemberItem) => m.email.toLowerCase()));
      const extraDevMembers = DEV_TEAM_MEMBERS.filter((m) => !d1Emails.has(m.email.toLowerCase()));

      return [...d1Members, ...extraDevMembers];
    }
  } catch {
    // Fallback gracioso para ambiente sem binding D1 nativo
  }

  return [...DEV_TEAM_MEMBERS];
});

// ── Server Function: createTeamMember ────────────────────────────────────────

const CreateTeamMemberInput = z.object({
  name: z.string().min(2, "O nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Formato de e-mail inválido"),
  registry: z.string().optional(),
  role: z.enum(["therapist", "admin"]),
  isMaster: z.boolean().optional(),
  password: z.string().min(6, "A senha inicial deve ter no mínimo 6 caracteres"),
});

export type CreateTeamMemberData = z.infer<typeof CreateTeamMemberInput>;

export const createTeamMember = createServerFn({ method: "POST" })
  .validator((d: unknown) => CreateTeamMemberInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user || user.role !== "admin" || user.is_master !== 1) {
      throw new Error("Acesso negado: apenas o usuário master pode cadastrar usuários.");
    }

    const cleanEmail = data.email.trim().toLowerCase();
    const db = getDB();

    // 1. Validação de e-mail duplicado no banco e na lista dev
    const existingDev = DEV_TEAM_MEMBERS.find((m) => m.email.toLowerCase() === cleanEmail);
    if (existingDev) {
      throw new Error("Este e-mail já está cadastrado no sistema.");
    }

    try {
      const existing = await db
        .prepare(`SELECT id FROM users WHERE email = ?1 LIMIT 1`)
        .bind(cleanEmail)
        .first<{ id: string }>();

      if (existing) {
        throw new Error("Este e-mail já está cadastrado no sistema.");
      }
    } catch {
      // Ignora erro se DB mock
    }

    // 2. Criptografia PBKDF2
    const newId = generateId();
    const saltHex = generateSalt();
    const hashHex = await pbkdf2Hash(data.password, saltHex);

    // Iniciais para avatar
    const names = data.name.trim().split(/\s+/);
    const avatar_initials = names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : names[0].slice(0, 2).toUpperCase();

    // 3. Persistência no D1 com fallback de segurança
    try {
      await db
        .prepare(
          `INSERT INTO users
             (id, email, name, role, password_hash, password_salt, registry, avatar_initials, is_active, change_password_required, is_master)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, 1, ?9)`,
        )
        .bind(
          newId,
          cleanEmail,
          data.name.trim(),
          data.role,
          hashHex,
          saltHex,
          data.registry?.trim() || null,
          avatar_initials,
          data.role === "admin" && data.isMaster ? 1 : 0,
        )
        .run();
    } catch {
      try {
        await db
          .prepare(
            `INSERT INTO users
               (id, email, name, role, password_hash, password_salt, registry, avatar_initials, is_active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1)`,
          )
          .bind(
            newId,
            cleanEmail,
            data.name.trim(),
            data.role,
            hashHex,
            saltHex,
            data.registry?.trim() || null,
            avatar_initials,
          )
          .run();
      } catch {
        // Mock fallback
      }
    }

    // 4. Adiciona ao In-Memory Store para listagem imediata e autenticação no dev
    const newMember: TeamMemberItem = {
      id: newId,
      email: cleanEmail,
      name: data.name.trim(),
      role: data.role,
      registry: data.registry?.trim() || null,
      avatar_initials,
      is_active: 1,
      is_master: data.role === "admin" && data.isMaster ? 1 : 0,
      change_password_required: 1,
      caseload: 0,
      weeklyHours: data.role === "admin" ? 40 : 20,
      status: "Ativa",
    };

    DEV_TEAM_MEMBERS.push(newMember);
    registerDevUser(
      {
        id: newId,
        email: cleanEmail,
        name: data.name.trim(),
        role: data.role,
        avatar_initials,
        is_master: data.role === "admin" && data.isMaster ? 1 : 0,
      },
      data.password,
      hashHex,
      saltHex,
    );

    // 5. Trilha de auditoria LGPD
    await logAuditEvent(user.id, "CREATE_USER", "users", null);

    return {
      success: true,
      id: newId,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password,
    };
  });

const UpdateTeamMemberInput = z.object({
  id: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  registry: z.string().optional(),
  role: z.enum(["therapist", "admin"]),
  isMaster: z.boolean().optional(),
});

export const updateTeamMember = createServerFn({ method: "POST" })
  .validator((d: unknown) => UpdateTeamMemberInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user || user.role !== "admin" || user.is_master !== 1) {
      throw new Error("Acesso negado: apenas o usuário master pode editar usuários.");
    }

    const cleanEmail = data.email.trim().toLowerCase();
    const names = data.name.trim().split(/\s+/);
    const avatar = names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : names[0].slice(0, 2).toUpperCase();

    await getDB()
      .prepare(
        `UPDATE users
         SET name = ?1, email = ?2, registry = ?3, role = ?4,
             avatar_initials = ?5, is_master = ?6, updated_at = datetime('now')
         WHERE id = ?7`,
      )
      .bind(
        data.name.trim(),
        cleanEmail,
        data.registry?.trim() || null,
        data.role,
        avatar,
        data.role === "admin" && data.isMaster ? 1 : 0,
        data.id,
      )
      .run();

    const idx = DEV_TEAM_MEMBERS.findIndex((m) => m.id === data.id);
    if (idx !== -1) {
      DEV_TEAM_MEMBERS[idx] = {
        ...DEV_TEAM_MEMBERS[idx],
        name: data.name.trim(),
        email: cleanEmail,
        registry: data.registry?.trim() || null,
        role: data.role,
        avatar_initials: avatar,
        is_master: data.role === "admin" && data.isMaster ? 1 : 0,
      };
    }

    await logAuditEvent(user.id, "UPDATE_USER", "users", null);
    return { ok: true };
  });

export const setTeamMemberActive = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), active: z.boolean() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user || user.role !== "admin" || user.is_master !== 1) {
      throw new Error("Acesso negado: apenas o usuário master pode alterar status.");
    }
    if (data.id === user.id && !data.active) {
      throw new Error("Você não pode desativar sua própria conta.");
    }

    await getDB()
      .prepare(`UPDATE users SET is_active = ?1, updated_at = datetime('now') WHERE id = ?2`)
      .bind(data.active ? 1 : 0, data.id)
      .run();

    const idx = DEV_TEAM_MEMBERS.findIndex((m) => m.id === data.id);
    if (idx !== -1) {
      DEV_TEAM_MEMBERS[idx] = {
        ...DEV_TEAM_MEMBERS[idx],
        is_active: data.active ? 1 : 0,
        status: data.active ? "Ativa" : "Inativo",
      };
    }

    await logAuditEvent(user.id, data.active ? "ACTIVATE_USER" : "DEACTIVATE_USER", "users", null);
    return { ok: true };
  });

export const resetTeamMemberPassword = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), email: z.string().email().optional(), password: z.string().min(6) }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user || user.role !== "admin" || user.is_master !== 1) {
      throw new Error("Acesso negado: apenas o usuário master pode redefinir senhas.");
    }

    const saltHex = generateSalt();
    const hashHex = await pbkdf2Hash(data.password, saltHex);
    const cleanEmail = data.email?.trim().toLowerCase();
    const db = getDB();
    let target = await db
      .prepare(`SELECT id, email, name, role, avatar_initials, COALESCE(is_master, 0) AS is_master FROM users WHERE id = ?1 LIMIT 1`)
      .bind(data.id)
      .first<{
        id: string;
        email: string;
        name: string;
        role: "admin" | "therapist";
        avatar_initials: string | null;
        is_master: number;
      }>()
      .catch(() => null);

    if (!target && cleanEmail) {
      target = await db
        .prepare(`SELECT id, email, name, role, avatar_initials, COALESCE(is_master, 0) AS is_master FROM users WHERE email = ?1 LIMIT 1`)
        .bind(cleanEmail)
        .first<{
          id: string;
          email: string;
          name: string;
          role: "admin" | "therapist";
          avatar_initials: string | null;
          is_master: number;
        }>()
        .catch(() => null);
    }

    const targetId = target?.id || data.id;
    const targetEmail = target?.email?.trim().toLowerCase() || cleanEmail;

    try {
      await db
        .prepare(
          `UPDATE users
           SET password_hash = ?1, password_salt = ?2,
               change_password_required = 1, updated_at = datetime('now')
           WHERE id = ?3 OR (?4 IS NOT NULL AND email = ?4)`,
        )
        .bind(hashHex, saltHex, targetId, targetEmail || null)
        .run();
    } catch {
      await db
        .prepare(
          `UPDATE users
           SET password_hash = ?1, password_salt = ?2, updated_at = datetime('now')
           WHERE id = ?3 OR (?4 IS NOT NULL AND email = ?4)`,
        )
        .bind(hashHex, saltHex, targetId, targetEmail || null)
        .run();
    }

    await db
      .prepare(`DELETE FROM auth_sessions WHERE user_id = ?1`)
      .bind(targetId)
      .run()
      .catch(() => null);

    const member = DEV_TEAM_MEMBERS.find(
      (m) => m.id === data.id || (!!targetEmail && m.email.toLowerCase() === targetEmail),
    );
    if (member) {
      registerDevUser(
        {
          id: targetId,
          email: targetEmail || member.email,
          name: target?.name || member.name,
          role: target?.role || member.role,
          avatar_initials: target?.avatar_initials || member.avatar_initials || null,
          is_master: target?.is_master || member.is_master || 0,
        },
        data.password,
        hashHex,
        saltHex,
      );
    }

    await logAuditEvent(user.id, "RESET_USER_PASSWORD", "users", null);
    return { ok: true, password: data.password };
  });
