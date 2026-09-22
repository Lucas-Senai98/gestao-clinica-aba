import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB, generateId, now } from "@/db/db";
import { getSessionUser, DEV_CREDENTIALS } from "@/queries/auth";
import { logAuditEvent, sendNotificationHelper } from "@/queries/notifications_audit";
import { DEV_PATIENTS, DEV_PATIENT_GUARDIAN } from "@/queries/patients";

export interface ClinicalReportItem {
  id: string;
  patientId: string;
  patient: string;
  templateId: string;
  template: string;
  title: string;
  content: string;
  author: string;
  authorId?: string;
  date: string;
  status: "Rascunho" | "Emitido" | "Arquivado";
  sharedWithPatient: boolean;
  sharedAt?: string | null;
}

// ── In-Memory Store de Desenvolvimento (Garante persistência imediata em dev e fallback) ──

const INITIAL_DEV_CLINICAL_REPORTS: ClinicalReportItem[] = [
  {
    id: "rep-01",
    patientId: "p1",
    patient: "Lucas Almeida",
    templateId: "rt1",
    template: "Relatório trimestral de evolução",
    title: "Relatório trimestral de evolução — Lucas Almeida",
    content: `RELATÓRIO TRIMESTRAL DE EVOLUÇÃO CLÍNICA ABA

1. IDENTIFICAÇÃO DO PACIENTE
Paciente: Lucas Almeida
Diagnóstico / Hipótese: TEA Nível 2
Responsável: Mariana Almeida
Data de Emissão: 15/09/2026
Período de Referência: 3º Trimestre de 2026

2. OBJETIVOS E METAS TERAPÊUTICAS
- Expansão do repertório de comunicação funcional (mando e tato).
- Fortalecimento de habilidades sociais e engajamento em brincadeiras cooperativas.
- Redução de comportamentos interferentes que limitam o aprendizado.
- Aumento da autonomia nas atividades de vida diária (AVDs).

3. DESEMPENHO POR ÁREA DE DOMÍNIO
- Atenção Compartilhada e Contato Visual: Desempenho satisfatório (85% de independência).
- Linguagem Receptiva / Instruções: Responde com consistência a comandos de múltiplos passos.
- Linguagem Expressiva / Comunicação: Aumento expressivo no uso espontâneo de sentenças de 2 a 3 palavras.
- Habilidades Motoras e Imitação: Boa adesão a modelos motores grossos e finos.

4. ANÁLISE DE COMPORTAMENTOS INTERFERENTES
- Foram observadas reduções consistentes na frequência de crises de frustração após a introdução de suportes visuais e treino de comunicação funcional (FCT).
- Média de episódios semanais caiu de 12 para 3 no período avaliado.

5. RECOMENDAÇÕES E ORIENTAÇÕES
- Família: Manter rotina visual estruturada em ambiente domiciliar e reforçar a comunicação funcional.
- Escola: Facilitar intervalos sensoriais e manter contato contínuo com a equipe multidisciplinar.
- Continuidade do PTI: Recomenda-se a continuidade da intervenção na carga horária prescrita de 8h semanais.`,
    author: "Marina Duarte",
    authorId: "u-admin-01",
    date: "2026-09-15",
    status: "Emitido",
    sharedWithPatient: true,
    sharedAt: "2026-09-15 14:30:00",
  },
  {
    id: "rep-02",
    patientId: "p2",
    patient: "Sofia Pereira",
    templateId: "rt2",
    template: "Devolutiva de avaliação inicial",
    title: "Devolutiva de avaliação inicial — Sofia Pereira",
    content: `DEVOLUTIVA DE AVALIAÇÃO INICIAL COMPORTAMENTAL (ABA)

1. DADOS DE IDENTIFICAÇÃO
Paciente: Sofia Pereira
Diagnóstico / Encaminhamento: TEA Nível 1
Responsável: Rafael Pereira
Data da Avaliação: 18/09/2026

2. MOTIVO DA AVALIAÇÃO E HISTÓRICO
Encaminhada para avaliação comportamental abrangente para mapeamento de repertórios básicos, habilidades comunicativas e comportamentos interferentes, visando planejamento de intervenção intensiva baseada na Análise do Comportamento Aplicada (ABA).

3. PROTOCOLOS E INSTRUMENTOS UTILIZADOS
- Avaliação comportamental direta por observação e sondagens clínicas.
- Inventário de marcos do desenvolvimento (VB-MAPP).
- Anamnese clínica detalhada com os pais.

4. SÍNTESE DOS ACHADOS CLÍNICOS
- Linguagem e Comunicação: Bom repertório de mandos espontâneos; necessidade de expansão de intraverbais.
- Interação Social: Boa iniciativa com pares; resposta positiva a reforçadores lúdicos.
- Comportamentos: Sem ocorrência de agressividade ou auto-lesão.

5. PROPOSTA DE INTERVENÇÃO TERAPÊUTICA
- Carga horária recomendada: 6h semanais de intervenção multidisciplinar.
- Focos prioritários: Treino de habilidades intraverbais, flexibilidade cognitiva e autonomia escolar.`,
    author: "Ana Beatriz Lopes",
    authorId: "u-therapist-01",
    date: "2026-09-18",
    status: "Emitido",
    sharedWithPatient: true,
    sharedAt: "2026-09-18 10:15:00",
  },
  {
    id: "rep-03",
    patientId: "p1",
    patient: "Lucas Almeida",
    templateId: "rt4",
    template: "Parecer para convênio / plano de saúde",
    title: "Parecer para convênio / plano de saúde — Lucas Almeida",
    content: `PARECER TÉCNICO PARA OPERADORA DE SAÚDE / CONVÊNIO

1. IDENTIFICAÇÃO DO BENEFICIÁRIO
Beneficiário: Lucas Almeida
CID-10 / Hipótese Diagnóstica: TEA Nível 2
Responsável: Mariana Almeida
Data do Parecer: 20/09/2026

2. JUSTIFICATIVA CLÍNICA DA NECESSIDADE TERAPÊUTICA
O beneficiário apresenta Transtorno do Espectro Autista (TEA) com repercussões significativas no neurodesenvolvimento, requerendo intervenção comportamental intensiva fundamentada na Análise do Comportamento Aplicada (ABA).

3. PLANO TERAPÊUTICO MULTIDISCIPLINAR E CARGA HORÁRIA SOLICITADA
- Psicoterapia Comportamental / Terapia ABA: 8 horas semanais.
- Fonoaudiologia Especializada em TEA: 2 horas semanais.
- Terapia Ocupacional com Abordagem em Integração Sensorial: 2 horas semanais.
- Supervisão Clínica e Alinhamento Familiar: 2 horas mensais.

4. CONCLUSÃO
A manutenção integral da carga horária prescrita é imprescindível para prevenir perdas funcionais e assegurar o avanço no desenvolvimento neuropsicomotor.`,
    author: "Marina Duarte",
    authorId: "u-admin-01",
    date: "2026-09-20",
    status: "Rascunho",
    sharedWithPatient: false,
    sharedAt: null,
  },
];

const gReports = globalThis as unknown as {
  __DEV_CLINICAL_REPORTS__?: ClinicalReportItem[];
};
if (!gReports.__DEV_CLINICAL_REPORTS__) {
  gReports.__DEV_CLINICAL_REPORTS__ = [...INITIAL_DEV_CLINICAL_REPORTS];
}
export const DEV_CLINICAL_REPORTS: ClinicalReportItem[] = gReports.__DEV_CLINICAL_REPORTS__;

/**
 * Função interna para obter o nome real do paciente a partir do D1 ou do store local.
 */
async function getPatientDisplayName(patientId: string): Promise<string> {
  try {
    const db = getDB();
    const row = await db
      .prepare(`SELECT name FROM patients WHERE id = ?1`)
      .bind(patientId)
      .first<{ name: string }>();
    if (row?.name) return row.name;
  } catch {}

  const devP = DEV_PATIENTS.find((p) => p.id === patientId);
  if (devP?.name) return devP.name;

  const names: Record<string, string> = {
    p1: "Lucas Almeida",
    p2: "Sofia Pereira",
    p3: "Bento Oliveira",
    p4: "Helena Costa",
  };
  return names[patientId] || "Paciente";
}

/**
 * Dispara notificação in-app e publica card no feed da família (parent_feed)
 * quando um relatório oficial for emitido ou compartilhado.
 */
async function notifyGuardiansOfClinicalReport(
  patientId: string,
  patientName: string,
  reportTitle: string,
  authorId: string,
) {
  const db = getDB();
  const guardianIds = new Set<string>();

  // 1. Busca IDs de responsáveis vinculados na tabela patient_guardian
  try {
    const links = await db
      .prepare(`SELECT guardian_id FROM patient_guardian WHERE patient_id = ?1`)
      .bind(patientId)
      .all<{ guardian_id: string }>();
    if (links?.results) {
      for (const l of links.results) guardianIds.add(String(l.guardian_id));
    }
  } catch {}

  // 2. Busca por e-mail do responsável no cadastro do paciente
  try {
    const pRows = await db
      .prepare(`SELECT guardian_email FROM patients WHERE id = ?1`)
      .bind(patientId)
      .first<{ guardian_email: string | null }>();
    if (pRows?.guardian_email) {
      const uRows = await db
        .prepare(`SELECT id FROM users WHERE LOWER(email) = ?1`)
        .bind(pRows.guardian_email.toLowerCase().trim())
        .first<{ id: string }>();
      if (uRows?.id) guardianIds.add(uRows.id);
    }
  } catch {}

  // 3. Busca no store DEV_PATIENT_GUARDIAN e DEV_PATIENTS
  for (const l of DEV_PATIENT_GUARDIAN) {
    if (l.patient_id === patientId) guardianIds.add(l.guardian_id);
  }
  const devPat = DEV_PATIENTS.find((p) => p.id === patientId);
  if (devPat?.guardian_email) {
    const emailKey = devPat.guardian_email.toLowerCase().trim();
    if (DEV_CREDENTIALS[emailKey]?.user?.id) {
      guardianIds.add(DEV_CREDENTIALS[emailKey].user.id);
    }
  }

  // Fallbacks conhecidos se ainda não houver vínculo
  if (guardianIds.size === 0) {
    if (patientId === "p1") guardianIds.add("u-parent-01");
    if (patientId === "p2") guardianIds.add("u-parent-02");
  }

  // 4. Envia notificação in-app para cada responsável vinculado
  for (const gId of guardianIds) {
    await sendNotificationHelper(
      gId,
      "📄 Relatório Clínico Oficial Emitido",
      `O relatório "${reportTitle}" foi emitido para ${patientName} e já está disponível para visualização e download em PDF no Portal da Família.`,
      "devolutiva",
    ).catch(() => null);
  }

  // 5. Publica também uma publicação no feed da família (parent_feed)
  const feedId = generateId();
  try {
    await db
      .prepare(
        `INSERT INTO parent_feed
           (id, patient_id, author_id, title, body, mood, home_practices, published_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'ótimo', ?6, datetime('now'))`,
      )
      .bind(
        feedId,
        patientId,
        authorId,
        `📄 Relatório Clínico Oficial: ${reportTitle}`,
        `A equipe multidisciplinar emitiu e disponibilizou um documento oficial de evolução clínica para ${patientName}. O documento está disponível na íntegra para consulta e emissão em PDF no Portal dos Pais.`,
        "Recomendamos que a família consulte as diretrizes e recomendações clínicas presentes no documento.",
      )
      .run();
  } catch {}
}

const ReportInput = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1),
  templateId: z.string().min(1),
  templateName: z.string().min(1),
  title: z.string().min(2),
  content: z.string().min(5),
  status: z.enum(["Rascunho", "Emitido", "Arquivado"]).default("Rascunho"),
  sharedWithPatient: z.boolean().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. LISTAR RELATÓRIOS CLÍNICOS
// ─────────────────────────────────────────────────────────────────────────────

export const getClinicalReports = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    const currentUser = user || {
      id: "u-admin-01",
      name: "Marina Duarte",
      role: "admin",
      email: "supervisora@gizeclinica.com.br",
    };

    const db = getDB();
    let d1Rows: ClinicalReportItem[] = [];

    try {
      const rows = await db
        .prepare(
          `SELECT
             r.id, r.patient_id, r.template_id, r.title, r.content, r.status,
             COALESCE(r.shared_with_patient, 0) AS shared_with_patient,
             r.shared_at, r.created_at,
             p.name AS patient_name,
             u.name AS author_name,
             r.author_id
           FROM clinical_reports r
           LEFT JOIN patients p ON p.id = r.patient_id
           LEFT JOIN users u ON u.id = r.author_id
           WHERE (?1 IS NULL OR r.patient_id = ?1)
           ORDER BY r.created_at DESC
           LIMIT 100`,
        )
        .bind(data?.patientId ?? null)
        .all<Record<string, unknown>>();

      if (rows?.results && rows.results.length > 0) {
        d1Rows = rows.results.map((r): ClinicalReportItem => ({
          id: String(r.id),
          patientId: String(r.patient_id),
          patient: String(r.patient_name || "Paciente"),
          templateId: String(r.template_id),
          template: String(r.template_id),
          title: String(r.title),
          content: String(r.content),
          author: String(r.author_name || "Profissional"),
          authorId: r.author_id ? String(r.author_id) : undefined,
          date: String(r.created_at || now()).slice(0, 10),
          status: (r.status as ClinicalReportItem["status"]) || "Rascunho",
          sharedWithPatient: Boolean(r.shared_with_patient),
          sharedAt: r.shared_at ? String(r.shared_at) : null,
        }));
      }
    } catch {
      // D1 indisponível ou tabela ainda não migrada; usa store local
    }

    // Combina e sincroniza itens da store em memória com os do banco
    const map = new Map<string, ClinicalReportItem>();
    for (const item of DEV_CLINICAL_REPORTS) {
      map.set(item.id, item);
    }
    for (const item of d1Rows) {
      map.set(item.id, item);
    }

    let allReports = Array.from(map.values());

    // Filtro por paciente se solicitado pela equipe técnica
    if (data?.patientId) {
      allReports = allReports.filter((r) => r.patientId === data.patientId);
    }

    // ── CONTROLE DE ACESSO DO RESPONSÁVEL (PARENT) ───────────────────────────
    if (currentUser.role === "parent") {
      const allowedPatientIds = new Set<string>();

      // 1. Busca vínculos diretos em patient_guardian
      try {
        const links = await db
          .prepare(`SELECT patient_id FROM patient_guardian WHERE guardian_id = ?1`)
          .bind(currentUser.id)
          .all<{ patient_id: string }>();
        if (links?.results) {
          for (const l of links.results) allowedPatientIds.add(String(l.patient_id));
        }
      } catch {}

      // 2. Busca por e-mail cadastrado na tabela patients
      const cleanEmail = currentUser.email.toLowerCase().trim();
      try {
        const byEmail = await db
          .prepare(`SELECT id FROM patients WHERE LOWER(guardian_email) = ?1`)
          .bind(cleanEmail)
          .all<{ id: string }>();
        if (byEmail?.results) {
          for (const r of byEmail.results) allowedPatientIds.add(String(r.id));
        }
      } catch {}

      // 3. Busca no store em memória DEV_PATIENT_GUARDIAN e DEV_PATIENTS
      for (const l of DEV_PATIENT_GUARDIAN) {
        if (l.guardian_id === currentUser.id || l.guardian_id.toLowerCase() === cleanEmail) {
          allowedPatientIds.add(l.patient_id);
        }
      }
      for (const p of DEV_PATIENTS) {
        if (p.guardian_email?.toLowerCase().trim() === cleanEmail) {
          allowedPatientIds.add(p.id);
        }
      }

      // 4. Fallback de desenvolvimento
      if (allowedPatientIds.size === 0) {
        if (cleanEmail.includes("mariana") || currentUser.id === "u-parent-01") {
          allowedPatientIds.add("p1");
        } else if (cleanEmail.includes("rafael") || currentUser.id === "u-parent-02") {
          allowedPatientIds.add("p2");
        }
      }

      // O responsável DEVE ver apenas relatórios dos seus filhos que estejam
      // EMITIDOS e compartilhados com a família (sharedWithPatient = true)
      allReports = allReports.filter(
        (r) =>
          allowedPatientIds.has(r.patientId) &&
          r.status === "Emitido" &&
          Boolean(r.sharedWithPatient),
      );
    }

    // Ordena do mais recente para o mais antigo
    allReports.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

    return allReports;
  });

// ─────────────────────────────────────────────────────────────────────────────
// 2. CRIAR RELATÓRIO CLÍNICO (Rascunho ou Emitido)
// ─────────────────────────────────────────────────────────────────────────────

export const createClinicalReport = createServerFn({ method: "POST" })
  .validator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    const currentUser = user || {
      id: "u-admin-01",
      name: "Marina Duarte",
      role: "admin",
      email: "supervisora@gizeclinica.com.br",
    };

    if (currentUser.role === "parent") {
      throw new Error("Responsáveis não possuem permissão para gerar relatórios clínicos.");
    }

    const id = data.id || generateId();
    const isEmitted = data.status === "Emitido";
    const sharedWithPatient = data.sharedWithPatient ?? isEmitted;
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = now();

    const patientName = await getPatientDisplayName(data.patientId);

    const reportItem: ClinicalReportItem = {
      id,
      patientId: data.patientId,
      patient: patientName,
      templateId: data.templateId,
      template: data.templateName,
      title: data.title,
      content: data.content,
      author: currentUser.name || "Profissional",
      authorId: currentUser.id,
      date: dateStr,
      status: data.status,
      sharedWithPatient,
      sharedAt: sharedWithPatient ? timeStr : null,
    };

    // Atualiza store em memória
    const existingIndex = DEV_CLINICAL_REPORTS.findIndex((r) => r.id === id);
    if (existingIndex >= 0) {
      DEV_CLINICAL_REPORTS[existingIndex] = reportItem;
    } else {
      DEV_CLINICAL_REPORTS.unshift(reportItem);
    }

    // Persiste no SQLite / D1
    try {
      const db = getDB();
      await db
        .prepare(
          `INSERT OR REPLACE INTO clinical_reports
             (id, patient_id, author_id, template_id, title, content, status, shared_with_patient, shared_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))`,
        )
        .bind(
          id,
          data.patientId,
          currentUser.id,
          data.templateId,
          data.title,
          data.content,
          data.status,
          sharedWithPatient ? 1 : 0,
          sharedWithPatient ? timeStr : null,
        )
        .run();
    } catch (e) {
      console.error("Erro ao persistir relatório no D1:", e);
    }

    // Se emitido e compartilhado com a família, notifica os pais e alimenta o feed
    if (isEmitted && sharedWithPatient) {
      await notifyGuardiansOfClinicalReport(
        data.patientId,
        patientName,
        data.title,
        currentUser.id,
      ).catch(() => null);
    }

    await logAuditEvent(
      currentUser.id,
      `SAVE_CLINICAL_REPORT_${data.status}`,
      "clinical_reports",
      data.patientId,
    ).catch(() => null);

    return { id, success: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 3. ATUALIZAR RELATÓRIO CLÍNICO EXISTENTE
// ─────────────────────────────────────────────────────────────────────────────

export const updateClinicalReport = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      title: z.string().min(2).optional(),
      content: z.string().min(5).optional(),
      status: z.enum(["Rascunho", "Emitido", "Arquivado"]).optional(),
      sharedWithPatient: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    const currentUser = user || { id: "u-admin-01", name: "Marina Duarte", role: "admin" };
    if (currentUser.role === "parent") throw new Error("Responsáveis não podem alterar relatórios.");

    const item = DEV_CLINICAL_REPORTS.find((r) => r.id === data.id);
    if (item) {
      if (data.title) item.title = data.title;
      if (data.content) item.content = data.content;
      if (data.status) item.status = data.status;
      if (data.sharedWithPatient !== undefined) {
        item.sharedWithPatient = data.sharedWithPatient;
        item.sharedAt = data.sharedWithPatient ? now() : null;
      }
    }

    try {
      const db = getDB();
      const sets: string[] = ["updated_at = datetime('now')"];
      const binds: any[] = [];
      let i = 1;

      if (data.title) {
        sets.push(`title = ?${i++}`);
        binds.push(data.title);
      }
      if (data.content) {
        sets.push(`content = ?${i++}`);
        binds.push(data.content);
      }
      if (data.status) {
        sets.push(`status = ?${i++}`);
        binds.push(data.status);
      }
      if (data.sharedWithPatient !== undefined) {
        sets.push(`shared_with_patient = ?${i++}`);
        binds.push(data.sharedWithPatient ? 1 : 0);
        if (data.sharedWithPatient) {
          sets.push(`shared_at = ?${i++}`);
          binds.push(now());
        }
      }
      binds.push(data.id);

      await db
        .prepare(`UPDATE clinical_reports SET ${sets.join(", ")} WHERE id = ?${i}`)
        .bind(...binds)
        .run();
    } catch (e) {
      console.error("Erro ao atualizar relatório no D1:", e);
    }

    // Se passou a ser emitido e compartilhado com a família, dispara notificações
    if (item && item.status === "Emitido" && item.sharedWithPatient) {
      const pName = await getPatientDisplayName(item.patientId);
      await notifyGuardiansOfClinicalReport(
        item.patientId,
        pName,
        item.title,
        currentUser.id,
      ).catch(() => null);
    }

    await logAuditEvent(
      currentUser.id,
      "UPDATE_CLINICAL_REPORT",
      "clinical_reports",
      item?.patientId,
    ).catch(() => null);

    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 4. COMPARTILHAR OU DESFAZER ENVIO DO RELATÓRIO COM A FAMÍLIA
// ─────────────────────────────────────────────────────────────────────────────

export const toggleShareClinicalReport = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), sharedWithPatient: z.boolean() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    const currentUser = user || { id: "u-admin-01", name: "Marina Duarte", role: "admin" };
    if (currentUser.role === "parent") throw new Error("Acesso negado.");

    const item = DEV_CLINICAL_REPORTS.find((r) => r.id === data.id);
    if (item) {
      item.sharedWithPatient = data.sharedWithPatient;
      item.sharedAt = data.sharedWithPatient ? now() : null;
      if (data.sharedWithPatient && item.status === "Rascunho") {
        item.status = "Emitido";
      }
    }

    try {
      const db = getDB();
      await db
        .prepare(
          `UPDATE clinical_reports
           SET shared_with_patient = ?1,
               shared_at = ?2,
               status = CASE WHEN ?1 = 1 AND status = 'Rascunho' THEN 'Emitido' ELSE status END,
               updated_at = datetime('now')
           WHERE id = ?3`,
        )
        .bind(data.sharedWithPatient ? 1 : 0, data.sharedWithPatient ? now() : null, data.id)
        .run();
    } catch (e) {
      console.error("Erro ao alternar compartilhamento no D1:", e);
    }

    // Se compartilhado com a família, notifica os pais e alimenta o feed
    if (data.sharedWithPatient && item) {
      const pName = await getPatientDisplayName(item.patientId);
      await notifyGuardiansOfClinicalReport(
        item.patientId,
        pName,
        item.title,
        currentUser.id,
      ).catch(() => null);
    }

    await logAuditEvent(
      currentUser.id,
      data.sharedWithPatient ? "SHARE_REPORT_FAMILY" : "UNSHARE_REPORT_FAMILY",
      "clinical_reports",
      item?.patientId,
    ).catch(() => null);

    return { ok: true, sharedWithPatient: data.sharedWithPatient };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 5. ATUALIZAR STATUS DO RELATÓRIO
// ─────────────────────────────────────────────────────────────────────────────

export const updateClinicalReportStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), status: z.enum(["Rascunho", "Emitido", "Arquivado"]) }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    const currentUser = user || { id: "u-admin-01", name: "Marina Duarte", role: "admin" };
    if (currentUser.role === "parent") throw new Error("Responsáveis não podem alterar relatórios.");

    const item = DEV_CLINICAL_REPORTS.find((r) => r.id === data.id);
    if (item) {
      item.status = data.status;
      if (data.status === "Emitido") {
        item.sharedWithPatient = true;
        item.sharedAt = now();
      }
    }

    try {
      const db = getDB();
      await db
        .prepare(
          `UPDATE clinical_reports
           SET status = ?1,
               shared_with_patient = CASE WHEN ?1 = 'Emitido' THEN 1 ELSE shared_with_patient END,
               shared_at = CASE WHEN ?1 = 'Emitido' THEN datetime('now') ELSE shared_at END,
               updated_at = datetime('now')
           WHERE id = ?2`,
        )
        .bind(data.status, data.id)
        .run();
    } catch {}

    if (data.status === "Emitido" && item) {
      const pName = await getPatientDisplayName(item.patientId);
      await notifyGuardiansOfClinicalReport(
        item.patientId,
        pName,
        item.title,
        currentUser.id,
      ).catch(() => null);
    }

    await logAuditEvent(
      currentUser.id,
      `STATUS_CLINICAL_REPORT_${data.status}`,
      "clinical_reports",
      item?.patientId,
    ).catch(() => null);

    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 6. EXCLUIR RELATÓRIO CLÍNICO
// ─────────────────────────────────────────────────────────────────────────────

export const deleteClinicalReport = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    const currentUser = user || { id: "u-admin-01", name: "Marina Duarte", role: "admin" };
    if (currentUser.role !== "admin") throw new Error("Apenas supervisores podem excluir relatórios.");

    const index = DEV_CLINICAL_REPORTS.findIndex((r) => r.id === data.id);
    const removedItem = index >= 0 ? DEV_CLINICAL_REPORTS.splice(index, 1)[0] : null;

    try {
      await getDB().prepare(`DELETE FROM clinical_reports WHERE id = ?1`).bind(data.id).run();
    } catch {}

    await logAuditEvent(
      currentUser.id,
      "DELETE_CLINICAL_REPORT",
      "clinical_reports",
      removedItem?.patientId,
    ).catch(() => null);

    return { ok: true };
  });
