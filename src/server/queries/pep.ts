/**
 * src/server/queries/pep.ts
 *
 * Server Functions para o Prontuário Eletrônico do Paciente (PEP):
 * - Checklist Clínico ABA (8 passos)
 * - Avaliação de Repertório Inicial (5 categorias)
 * - Mapeamento de Reforçadores e Estereotipias
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId } from "@/server/db";
import { getSessionUser } from "@/server/queries/auth";
import { logAuditEvent } from "@/server/queries/notifications_audit";

// ─────────────────────────────────────────────────────────────────────────────
// CHECKLIST CLÍNICO ABA — 8 PASSOS
// ─────────────────────────────────────────────────────────────────────────────

const ChecklistInput = z.object({
  patientId: z.string(),
  step1_done: z.boolean(), step1_text: z.string().optional(),
  step2_done: z.boolean(), step2_text: z.string().optional(),
  step3_done: z.boolean(), step3_text: z.string().optional(),
  step4_done: z.boolean(), step4_text: z.string().optional(),
  step5_done: z.boolean(), step5_text: z.string().optional(),
  step6_done: z.boolean(), step6_text: z.string().optional(),
  step7_done: z.boolean(), step7_text: z.string().optional(),
  step8_done: z.boolean(), step8_text: z.string().optional(),
});

export const getClinicalChecklist = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (user) {
      await logAuditEvent(user.id, "VIEW_PEP", "clinical_checklists", data.patientId);
    }
    const db = getDB();
    return db
      .prepare(
        `SELECT * FROM clinical_checklists
         WHERE patient_id = ?1
         ORDER BY version DESC LIMIT 1`,
      )
      .bind(data.patientId)
      .first<Record<string, unknown>>();
  });

export const saveClinicalChecklist = createServerFn({ method: "POST" })
  .validator((d: unknown) => ChecklistInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    if (user.role === "parent") throw new Error("Sem permissão.");

    await logAuditEvent(user.id, "EDIT_CHECKLIST", "clinical_checklists", data.patientId);

    const db  = getDB();
    const now = new Date().toISOString();

    // Verifica se já existe um registro
    const existing = await db
      .prepare(`SELECT id, version FROM clinical_checklists WHERE patient_id = ?1 ORDER BY version DESC LIMIT 1`)
      .bind(data.patientId)
      .first<{ id: string; version: number }>();

    if (existing) {
      await db
        .prepare(
          `UPDATE clinical_checklists SET
             author_id = ?1,
             step1_done=?2,step1_text=?3, step2_done=?4,step2_text=?5,
             step3_done=?6,step3_text=?7, step4_done=?8,step4_text=?9,
             step5_done=?10,step5_text=?11,step6_done=?12,step6_text=?13,
             step7_done=?14,step7_text=?15,step8_done=?16,step8_text=?17,
             updated_at=?18
           WHERE id = ?19`,
        )
        .bind(
          user.id,
          data.step1_done?1:0, data.step1_text??null,
          data.step2_done?1:0, data.step2_text??null,
          data.step3_done?1:0, data.step3_text??null,
          data.step4_done?1:0, data.step4_text??null,
          data.step5_done?1:0, data.step5_text??null,
          data.step6_done?1:0, data.step6_text??null,
          data.step7_done?1:0, data.step7_text??null,
          data.step8_done?1:0, data.step8_text??null,
          now, existing.id,
        )
        .run();
      return { id: existing.id };
    }

    const id = generateId();
    await db
      .prepare(
        `INSERT INTO clinical_checklists
           (id, patient_id, author_id,
            step1_done,step1_text,step2_done,step2_text,
            step3_done,step3_text,step4_done,step4_text,
            step5_done,step5_text,step6_done,step6_text,
            step7_done,step7_text,step8_done,step8_text)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)`,
      )
      .bind(
        id, data.patientId, user.id,
        data.step1_done?1:0, data.step1_text??null,
        data.step2_done?1:0, data.step2_text??null,
        data.step3_done?1:0, data.step3_text??null,
        data.step4_done?1:0, data.step4_text??null,
        data.step5_done?1:0, data.step5_text??null,
        data.step6_done?1:0, data.step6_text??null,
        data.step7_done?1:0, data.step7_text??null,
        data.step8_done?1:0, data.step8_text??null,
      )
      .run();
    return { id };
  });

// ─────────────────────────────────────────────────────────────────────────────
// REPERTÓRIO INICIAL — 5 CATEGORIAS
// ─────────────────────────────────────────────────────────────────────────────

export const getRepertoireRecords = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string() }))
  .handler(async ({ data }) => {
    const db = getDB();
    const result = await db
      .prepare(
        `SELECT id, category, skill, level, start_date, end_date, notes
         FROM repertoire_records
         WHERE patient_id = ?1
         ORDER BY category, rowid`,
      )
      .bind(data.patientId)
      .all<{
        id: string; category: string; skill: string;
        level: string; start_date: string|null; end_date: string|null; notes: string|null;
      }>();
    return result.results;
  });

const RepertoireRowInput = z.object({
  patientId:  z.string(),
  skillId:    z.string().optional(),  // null = nova skill
  category:   z.string(),
  skill:      z.string(),
  level:      z.enum(["Sem Entrada", "Em Aquisição", "Adquirido", "Em manutenção"]),
  start_date: z.string().optional(),
  end_date:   z.string().optional(),
  notes:      z.string().optional(),
});

export const saveRepertoireRecord = createServerFn({ method: "POST" })
  .validator((d: unknown) => RepertoireRowInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");

    const db  = getDB();
    const now = new Date().toISOString();

    if (data.skillId) {
      await db
        .prepare(
          `UPDATE repertoire_records SET
             level=?1, start_date=?2, end_date=?3, notes=?4, updated_at=?5
           WHERE id=?6 AND patient_id=?7`,
        )
        .bind(
          data.level,
          data.start_date ?? null,
          data.end_date   ?? null,
          data.notes      ?? null,
          now,
          data.skillId,
          data.patientId,
        )
        .run();
      return { id: data.skillId };
    }

    const id = generateId();
    await db
      .prepare(
        `INSERT INTO repertoire_records
           (id,patient_id,author_id,category,skill,level,start_date,end_date,notes)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`,
      )
      .bind(
        id, data.patientId, user.id,
        data.category, data.skill, data.level,
        data.start_date ?? null, data.end_date ?? null, data.notes ?? null,
      )
      .run();
    return { id };
  });

/** Salva TODAS as skills de uma categoria de uma vez (upsert em batch). */
export const saveRepertoireBatch = createServerFn({ method: "POST" })
  .validator(
    z.object({
      patientId: z.string(),
      rows: z.array(RepertoireRowInput),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");

    const db  = getDB();
    const now = new Date().toISOString();

    const stmts = data.rows.map((row) => {
      if (row.skillId) {
        return db
          .prepare(
            `UPDATE repertoire_records SET level=?1,start_date=?2,end_date=?3,updated_at=?4
             WHERE id=?5 AND patient_id=?6`,
          )
          .bind(row.level, row.start_date??null, row.end_date??null, now, row.skillId, data.patientId);
      }
      return db
        .prepare(
          `INSERT OR IGNORE INTO repertoire_records
             (id,patient_id,author_id,category,skill,level,start_date,end_date)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`,
        )
        .bind(generateId(), data.patientId, user.id, row.category, row.skill, row.level,
              row.start_date??null, row.end_date??null);
    });

    await db.batch(stmts);
    return { saved: stmts.length };
  });

// ─────────────────────────────────────────────────────────────────────────────
// REFORÇADORES E ESTEREOTIPIAS
// ─────────────────────────────────────────────────────────────────────────────

export const getReinforcerData = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string() }))
  .handler(async ({ data }) => {
    const db = getDB();
    const [reinforcers, stereotypies] = await Promise.all([
      db.prepare(
        `SELECT id,item,category,preference,procura_sozinho,chora_se_retirado,
                engagement_min,frequency_pct,notes
         FROM reinforcer_records WHERE patient_id=?1 ORDER BY category,item`,
      ).bind(data.patientId).all<Record<string,unknown>>(),
      db.prepare(
        `SELECT id,category,topography,frequency,intensity,context,
                interferes_teaching,probable_function,notes
         FROM stereotypy_records WHERE patient_id=?1 ORDER BY category`,
      ).bind(data.patientId).all<Record<string,unknown>>(),
    ]);
    return { reinforcers: reinforcers.results, stereotypies: stereotypies.results };
  });

const ReinforcerInput = z.object({
  patientId:        z.string(),
  recordId:         z.string().optional(),
  item:             z.string().min(1),
  category:         z.string(),
  preference:       z.enum(["Alta","Média","Baixa"]),
  procura_sozinho:  z.boolean().default(false),
  chora_se_retirado:z.boolean().default(false),
  engagement_min:   z.number().optional(),
  frequency_pct:    z.number().optional(),
  notes:            z.string().optional(),
});

export const saveReinforcerRecord = createServerFn({ method: "POST" })
  .validator((d: unknown) => ReinforcerInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    const db = getDB();

    if (data.recordId) {
      await db.prepare(
        `UPDATE reinforcer_records SET item=?1,category=?2,preference=?3,
           procura_sozinho=?4,chora_se_retirado=?5,engagement_min=?6,
           frequency_pct=?7,notes=?8 WHERE id=?9 AND patient_id=?10`,
      ).bind(
        data.item, data.category, data.preference,
        data.procura_sozinho?1:0, data.chora_se_retirado?1:0,
        data.engagement_min??null, data.frequency_pct??null,
        data.notes??null, data.recordId, data.patientId,
      ).run();
      return { id: data.recordId };
    }

    const id = generateId();
    await db.prepare(
      `INSERT INTO reinforcer_records
         (id,patient_id,author_id,item,category,preference,
          procura_sozinho,chora_se_retirado,engagement_min,frequency_pct,notes)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,
    ).bind(
      id, data.patientId, user.id, data.item, data.category, data.preference,
      data.procura_sozinho?1:0, data.chora_se_retirado?1:0,
      data.engagement_min??null, data.frequency_pct??null, data.notes??null,
    ).run();
    return { id };
  });

const StereotypyInput = z.object({
  patientId:          z.string(),
  recordId:           z.string().optional(),
  category:           z.string(),
  topography:         z.string().min(1),
  frequency:          z.enum(["Alta","Média","Baixa"]),
  intensity:          z.enum(["Leve","Moderada","Intensa"]),
  context:            z.string().optional(),
  interferes_teaching:z.boolean().default(false),
  probable_function:  z.string().optional(),
  notes:              z.string().optional(),
});

export const saveStereotypyRecord = createServerFn({ method: "POST" })
  .validator((d: unknown) => StereotypyInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    const db = getDB();

    if (data.recordId) {
      await db.prepare(
        `UPDATE stereotypy_records SET category=?1,topography=?2,frequency=?3,
           intensity=?4,context=?5,interferes_teaching=?6,probable_function=?7,
           notes=?8,updated_at=datetime('now')
         WHERE id=?9 AND patient_id=?10`,
      ).bind(
        data.category, data.topography, data.frequency, data.intensity,
        data.context??null, data.interferes_teaching?1:0,
        data.probable_function??null, data.notes??null,
        data.recordId, data.patientId,
      ).run();
      return { id: data.recordId };
    }

    const id = generateId();
    await db.prepare(
      `INSERT INTO stereotypy_records
         (id,patient_id,author_id,category,topography,frequency,intensity,
          context,interferes_teaching,probable_function,notes)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,
    ).bind(
      id, data.patientId, user.id, data.category, data.topography,
      data.frequency, data.intensity, data.context??null,
      data.interferes_teaching?1:0, data.probable_function??null, data.notes??null,
    ).run();
    return { id };
  });

export const deleteReinforcerRecord = createServerFn({ method: "POST" })
  .validator(z.object({ recordId: z.string() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    await getDB().prepare(`DELETE FROM reinforcer_records WHERE id=?1`).bind(data.recordId).run();
    return { ok: true };
  });

export const deleteStereotypyRecord = createServerFn({ method: "POST" })
  .validator(z.object({ recordId: z.string() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");
    await getDB().prepare(`DELETE FROM stereotypy_records WHERE id=?1`).bind(data.recordId).run();
    return { ok: true };
  });
