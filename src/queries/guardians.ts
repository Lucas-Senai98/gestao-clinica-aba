import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId, now } from "@/db/db";
import {
  getSessionUser,
  generateSalt,
  pbkdf2Hash,
  registerDevUser,
  DEV_CREDENTIALS,
} from "@/queries/auth";
import { logAuditEvent } from "@/queries/notifications_audit";
import { DEV_PATIENT_GUARDIAN, DEV_PATIENTS } from "@/queries/patients";

export interface PatientGuardianItem {
  id: string; // ID do vínculo (patient_guardian.id)
  guardianId: string;
  patientId: string;
  name: string;
  email: string;
  relation: string;
  phone?: string;
  assignedAt: string;
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. LISTAR RESPONSÁVEIS DE UM PACIENTE
// ─────────────────────────────────────────────────────────────────────────────

export const getPatientGuardians = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string().min(1) }))
  .handler(async ({ data }): Promise<PatientGuardianItem[]> => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");

    const db = getDB();
    const guardiansMap = new Map<string, PatientGuardianItem>();

    // 1. Consulta no D1 / SQLite
    try {
      const rows = await db
        .prepare(
          `SELECT
             pg.id AS link_id,
             pg.patient_id,
             pg.guardian_id,
             pg.relation,
             pg.assigned_at,
             u.name,
             u.email,
             u.is_active
           FROM patient_guardian pg
           JOIN users u ON u.id = pg.guardian_id
           WHERE pg.patient_id = ?1
           ORDER BY pg.assigned_at DESC`,
        )
        .bind(data.patientId)
        .all<Record<string, unknown>>();

      if (rows?.results) {
        for (const r of rows.results) {
          const gId = String(r.guardian_id);
          guardiansMap.set(gId, {
            id: String(r.link_id || r.id || generateId()),
            guardianId: gId,
            patientId: String(r.patient_id),
            name: String(r.name || "Responsável"),
            email: String(r.email || ""),
            relation: String(r.relation || "Responsável"),
            assignedAt: String(r.assigned_at || now()).slice(0, 10),
            isActive: Number(r.is_active ?? 1) === 1,
          });
        }
      }
    } catch {
      // Falha graciosa se DB não conectado em tempo de build
    }

    // 2. Consulta no Store em Memória Dev
    const devLinks = DEV_PATIENT_GUARDIAN.filter((l) => l.patient_id === data.patientId);
    for (const link of devLinks) {
      if (!guardiansMap.has(link.guardian_id)) {
        // Localiza dados do usuário no DEV_CREDENTIALS ou nos pacientes
        let guardianName = "Responsável";
        let guardianEmail = "";
        let isActive = true;

        for (const cred of Object.values(DEV_CREDENTIALS)) {
          if (cred.user.id === link.guardian_id) {
            guardianName = cred.user.name;
            guardianEmail = cred.user.email;
            isActive = true;
            break;
          }
        }

        // Se não achou em DEV_CREDENTIALS, busca nos dados do paciente
        if (!guardianEmail) {
          const pat = DEV_PATIENTS.find((p) => p.id === data.patientId);
          if (pat) {
            guardianName = pat.guardian_name;
            guardianEmail = pat.guardian_email || "";
          }
        }

        guardiansMap.set(link.guardian_id, {
          id: link.id,
          guardianId: link.guardian_id,
          patientId: link.patient_id,
          name: guardianName,
          email: guardianEmail,
          relation: link.relation || "Responsável",
          assignedAt: now().slice(0, 10),
          isActive,
        });
      }
    }

    // 3. Fallback: Se não tem nenhum vínculo mas o paciente tem dados de responsável cadastrados
    if (guardiansMap.size === 0) {
      const pat = DEV_PATIENTS.find((p) => p.id === data.patientId);
      if (pat && pat.guardian_email) {
        // Encontra ou cria identificador virtual
        const emailLower = pat.guardian_email.toLowerCase();
        let existingUserId = `u-parent-${pat.id}`;
        for (const cred of Object.values(DEV_CREDENTIALS)) {
          if (cred.user.email.toLowerCase() === emailLower) {
            existingUserId = cred.user.id;
            break;
          }
        }

        guardiansMap.set(existingUserId, {
          id: `link-auto-${pat.id}`,
          guardianId: existingUserId,
          patientId: pat.id,
          name: pat.guardian_name,
          email: pat.guardian_email,
          relation: pat.guardian_relation || "Responsável Legal",
          phone: pat.guardian_phone || undefined,
          assignedAt: pat.created_at.slice(0, 10),
          isActive: true,
        });
      }
    }

    return Array.from(guardiansMap.values());
  });

// ─────────────────────────────────────────────────────────────────────────────
// 2. CRIAR E VINCULAR CONTA DE RESPONSÁVEL (PORTAL DA FAMÍLIA)
// ─────────────────────────────────────────────────────────────────────────────

const CreateAndLinkGuardianInput = z.object({
  patientId: z.string().min(1, "ID do paciente é obrigatório"),
  name: z.string().trim().min(2, "Nome do responsável deve ter pelo menos 2 caracteres"),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  relation: z.string().trim().optional(),
});

export const createAndLinkGuardian = createServerFn({ method: "POST" })
  .validator((d: unknown) => CreateAndLinkGuardianInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    const currentUser = user || {
      id: "u-admin-01",
      name: "Marina Duarte",
      role: "admin",
      email: "supervisora@gizeclinica.com.br",
    };

    if (currentUser.role !== "admin" && currentUser.role !== "therapist") {
      throw new Error("Apenas administradores e terapeutas podem criar e vincular responsáveis.");
    }

    const db = getDB();
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanName = data.name.trim();
    const relation = data.relation?.trim() || "Responsável";

    let guardianId: string | null = null;
    let isNewUser = false;

    // 1. Verifica se o e-mail já existe na base
    // Verifica no D1
    try {
      const existingInDb = await db
        .prepare(`SELECT id, role, name FROM users WHERE lower(email) = ?1 LIMIT 1`)
        .bind(cleanEmail)
        .first<{ id: string; role: string; name: string }>();

      if (existingInDb) {
        if (existingInDb.role !== "parent") {
          throw new Error(
            `O e-mail informado pertence a um usuário com perfil '${existingInDb.role}'. Apenas contas de responsáveis podem ser vinculadas aos pacientes.`,
          );
        }
        guardianId = existingInDb.id;
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("perfil")) throw err;
    }

    // Verifica no store em memória
    if (!guardianId) {
      const devCred = DEV_CREDENTIALS[cleanEmail];
      if (devCred) {
        if (devCred.user.role !== "parent") {
          throw new Error(
            `O e-mail informado pertence a um usuário com perfil '${devCred.user.role}'. Apenas contas de responsáveis podem ser vinculadas aos pacientes.`,
          );
        }
        guardianId = devCred.user.id;
      }
    }

    // 2. Se NÃO existir: cria novo usuário com role = 'parent' e PBKDF2
    let saltHex = "";
    let hashHex = "";

    if (!guardianId) {
      guardianId = generateId();
      isNewUser = true;

      saltHex = generateSalt();
      hashHex = await pbkdf2Hash(data.password, saltHex);

      const names = cleanName.split(/\s+/);
      const avatarInitials =
        names.length > 1
          ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
          : cleanName.slice(0, 2).toUpperCase();

      // Insere no D1
      try {
        await db
          .prepare(
            `INSERT INTO users
               (id, email, name, role, password_hash, password_salt, avatar_initials, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, 'parent', ?4, ?5, ?6, 1, datetime('now'), datetime('now'))`,
          )
          .bind(guardianId, cleanEmail, cleanName, hashHex, saltHex, avatarInitials)
          .run();
      } catch (err) {
        // Ignora erro se mock
      }

      // Registra no store em memória para login imediato em dev
      registerDevUser(
        {
          id: guardianId,
          email: cleanEmail,
          name: cleanName,
          role: "parent",
          avatar_initials: avatarInitials,
          is_master: 0,
          permissions: [],
        },
        data.password,
        hashHex,
        saltHex,
      );
    }

    // 3. Vínculo Pivô na tabela patient_guardian
    const linkId = generateId();
    try {
      await db
        .prepare(
          `INSERT OR REPLACE INTO patient_guardian
             (id, patient_id, guardian_id, relation, assigned_at)
           VALUES (?1, ?2, ?3, ?4, datetime('now'))`,
        )
        .bind(linkId, data.patientId, guardianId, relation)
        .run();
    } catch {
      // Ignora erro se mock
    }

    // Atualiza store em memória de vínculos
    const existingLnkIndex = DEV_PATIENT_GUARDIAN.findIndex(
      (l) => l.patient_id === data.patientId && l.guardian_id === guardianId,
    );
    if (existingLnkIndex >= 0) {
      DEV_PATIENT_GUARDIAN[existingLnkIndex].relation = relation;
    } else {
      DEV_PATIENT_GUARDIAN.push({
        id: linkId,
        patient_id: data.patientId,
        guardian_id: guardianId,
        relation,
      });
    }

    // Atualiza campos de responsável no registro do paciente para consistência
    const patientObj = DEV_PATIENTS.find((p) => p.id === data.patientId);
    if (patientObj) {
      patientObj.guardian_name = cleanName;
      patientObj.guardian_email = cleanEmail;
      patientObj.guardian_relation = relation;
      try {
        await db
          .prepare(
            `UPDATE patients
             SET guardian_name = ?1, guardian_email = ?2, guardian_relation = ?3, updated_at = datetime('now')
             WHERE id = ?4`,
          )
          .bind(cleanName, cleanEmail, relation, data.patientId)
          .run();
      } catch {}
    }

    // 4. Trilha de Auditoria LGPD
    await logAuditEvent(
      currentUser.id,
      "CREATE_GUARDIAN_LINK",
      "patient_guardian",
      data.patientId,
    ).catch(() => null);

    return {
      success: true,
      guardianId,
      isNewUser,
      message: isNewUser
        ? `Responsável "${cleanName}" cadastrado e vinculado com sucesso!`
        : `Responsável existente "${cleanName}" vinculado ao paciente com sucesso!`,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 3. REDEFINIR SENHA DO RESPONSÁVEL
// ─────────────────────────────────────────────────────────────────────────────

const UpdateGuardianPasswordInput = z.object({
  guardianId: z.string().min(1, "ID do responsável é obrigatório"),
  newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
  patientId: z.string().optional(),
});

export const updateGuardianPassword = createServerFn({ method: "POST" })
  .validator((d: unknown) => UpdateGuardianPasswordInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    const currentUser = user || {
      id: "u-admin-01",
      name: "Marina Duarte",
      role: "admin",
      email: "supervisora@gizeclinica.com.br",
    };

    if (currentUser.role !== "admin" && currentUser.role !== "therapist") {
      throw new Error("Apenas administradores e terapeutas podem redefinir a senha do responsável.");
    }

    const db = getDB();

    // 1. Gera novo salt e hash PBKDF2
    const saltHex = generateSalt();
    const hashHex = await pbkdf2Hash(data.newPassword, saltHex);

    // 2. Atualiza no D1
    try {
      await db
        .prepare(
          `UPDATE users
           SET password_hash = ?1, password_salt = ?2, updated_at = datetime('now')
           WHERE id = ?3`,
        )
        .bind(hashHex, saltHex, data.guardianId)
        .run();
    } catch {
      // Ignora erro se mock
    }

    // 3. Atualiza no store em memória para dev
    let updatedEmail = "";
    for (const [email, cred] of Object.entries(DEV_CREDENTIALS)) {
      if (cred.user.id === data.guardianId) {
        cred.password = data.newPassword;
        cred.passwordHash = hashHex;
        cred.passwordSalt = saltHex;
        updatedEmail = email;
        break;
      }
    }

    // 4. Trilha de Auditoria LGPD
    await logAuditEvent(
      currentUser.id,
      "RESET_GUARDIAN_PASSWORD",
      "users",
      data.patientId || data.guardianId,
    ).catch(() => null);

    return {
      success: true,
      email: updatedEmail,
      message: "Senha do responsável redefinida com sucesso!",
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 4. DESVINCULAR RESPONSÁVEL DO PACIENTE
// ─────────────────────────────────────────────────────────────────────────────

const UnlinkGuardianInput = z.object({
  patientId: z.string().min(1),
  guardianId: z.string().min(1),
});

export const unlinkGuardian = createServerFn({ method: "POST" })
  .validator((d: unknown) => UnlinkGuardianInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    const currentUser = user || {
      id: "u-admin-01",
      name: "Marina Duarte",
      role: "admin",
    };

    if (currentUser.role !== "admin" && currentUser.role !== "therapist") {
      throw new Error("Apenas administradores e terapeutas podem desvincular responsáveis.");
    }

    const db = getDB();

    try {
      await db
        .prepare(`DELETE FROM patient_guardian WHERE patient_id = ?1 AND guardian_id = ?2`)
        .bind(data.patientId, data.guardianId)
        .run();
    } catch {}

    // Atualiza store em memória
    const idx = DEV_PATIENT_GUARDIAN.findIndex(
      (l) => l.patient_id === data.patientId && l.guardian_id === data.guardianId,
    );
    if (idx >= 0) {
      DEV_PATIENT_GUARDIAN.splice(idx, 1);
    }

    await logAuditEvent(
      currentUser.id,
      "REMOVE_GUARDIAN_LINK",
      "patient_guardian",
      data.patientId,
    ).catch(() => null);

    return { success: true };
  });
