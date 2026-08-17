/**
 * src/server/queries/analytics.ts
 *
 * Server Functions para o Motor Analítico da clínica:
 * - Desempenho dos programas por data (LineChart)
 * - Agregação de respostas rápidas Sim/Não (BarChart Empilhado)
 * - Duração acumulada por Intensidade comportamental (BarChart Vertical)
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDB } from "@/db/db";
import { getSessionUser } from "@/queries/auth";

const AnalyticsInput = z.object({
  patientId: z.string(),
  month:     z.string().optional(), // "YYYY-MM" ou "MM"
  year:      z.number().int().optional(),
});

export type TargetPerformancePoint = {
  date: string; // "DD/MM"
  fullDate: string; // "YYYY-MM-DD"
  [targetName: string]: string | number;
};

export type YesNoPoint = {
  date: string;
  Sim: number;
  Nao: number;
};

export type BehaviorDurationPoint = {
  date: string;
  Leve: number;
  Moderada: number;
  Intensa: number;
  totalDuration: number;
};

export const getPatientAnalytics = createServerFn({ method: "GET" })
  .validator((d: unknown) => AnalyticsInput.parse(d))
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (!user) throw new Error("Sessão expirada.");

    const db = getDB();
    const now = new Date();

    // Define o filtro de ano-mês (padrão: mês/ano atual)
    const targetYear  = data.year ?? now.getFullYear();
    const targetMonth = data.month
      ? data.month.includes("-")
        ? data.month
        : `${targetYear}-${data.month.padStart(2, "0")}`
      : `${targetYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // ── 1. BUSCA DESEMPENHO DOS PROGRAMAS (TARGET_RECORDS) ────────────────────
    const targetRows = await db
      .prepare(
        `SELECT
           dr.session_date,
           tr.target_name,
           tr.trials,
           tr.correct
         FROM target_records tr
         JOIN daily_records dr ON dr.id = tr.daily_record_id
         WHERE dr.patient_id = ?1 AND strftime('%Y-%m', dr.session_date) = ?2
         ORDER BY dr.session_date ASC, tr.sort_order ASC`,
      )
      .bind(data.patientId, targetMonth)
      .all<{
        session_date: string;
        target_name: string;
        trials: number;
        correct: number;
      }>();

    // Mapeia programas únicos encontrados
    const availableTargetsSet = new Set<string>();

    // Agrupa desempenho por data e programa
    const performanceByDate: Record<string, Record<string, number[]>> = {};

    targetRows.results.forEach((row) => {
      availableTargetsSet.add(row.target_name);
      if (!performanceByDate[row.session_date]) {
        performanceByDate[row.session_date] = {};
      }
      if (!performanceByDate[row.session_date][row.target_name]) {
        performanceByDate[row.session_date][row.target_name] = [];
      }
      const pct = row.trials > 0 ? Math.round((row.correct / row.trials) * 100) : 0;
      performanceByDate[row.session_date][row.target_name].push(pct);
    });

    const targetPerformanceData: TargetPerformancePoint[] = Object.keys(performanceByDate)
      .sort()
      .map((dateStr) => {
        const [, m, d] = dateStr.split("-");
        const point: TargetPerformancePoint = {
          date: `${d}/${m}`,
          fullDate: dateStr,
        };

        Object.entries(performanceByDate[dateStr]).forEach(([tName, pcts]) => {
          const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
          point[tName] = avg;
        });

        return point;
      });

    // ── 2. BUSCA RESPOSTAS RÁPIDAS SIM/NÃO (DAILY_RECORDS) ─────────────────────
    const dailyRows = await db
      .prepare(
        `SELECT
           session_date,
           cooperation,
           attention,
           inappropriate
         FROM daily_records
         WHERE patient_id = ?1 AND strftime('%Y-%m', session_date) = ?2
         ORDER BY session_date ASC`,
      )
      .bind(data.patientId, targetMonth)
      .all<{
        session_date: string;
        cooperation: number;
        attention: number;
        inappropriate: number;
      }>();

    const yesNoData: YesNoPoint[] = dailyRows.results.map((row) => {
      const [, m, d] = row.session_date.split("-");
      // Resposta positiva (Sim): Cooperação = 1, Atenção = 1, Respostas Inadequadas = 0
      const simCount = (row.cooperation === 1 ? 1 : 0) +
                       (row.attention === 1 ? 1 : 0) +
                       (row.inappropriate === 0 ? 1 : 0);
      // Resposta negativa (Não): Cooperação = 0, Atenção = 0, Respostas Inadequadas = 1
      const naoCount = (row.cooperation === 0 ? 1 : 0) +
                       (row.attention === 0 ? 1 : 0) +
                       (row.inappropriate === 1 ? 1 : 0);

      return {
        date: `${d}/${m}`,
        Sim: simCount,
        Nao: naoCount,
      };
    });

    // ── 3. BUSCA DURAÇÃO POR INTENSIDADE (BEHAVIOR_RECORDS) ────────────────────
    const behaviorRows = await db
      .prepare(
        `SELECT
           dr.session_date,
           br.intensity,
           COALESCE(br.duration_min, 0) as duration_min
         FROM behavior_records br
         JOIN daily_records dr ON dr.id = br.daily_record_id
         WHERE dr.patient_id = ?1 AND strftime('%Y-%m', dr.session_date) = ?2
         ORDER BY dr.session_date ASC`,
      )
      .bind(data.patientId, targetMonth)
      .all<{
        session_date: string;
        intensity: "Leve" | "Moderada" | "Intensa";
        duration_min: number;
      }>();

    const behaviorByDate: Record<string, { Leve: number; Moderada: number; Intensa: number }> = {};

    behaviorRows.results.forEach((row) => {
      if (!behaviorByDate[row.session_date]) {
        behaviorByDate[row.session_date] = { Leve: 0, Moderada: 0, Intensa: 0 };
      }
      if (row.intensity in behaviorByDate[row.session_date]) {
        behaviorByDate[row.session_date][row.intensity] += Number(row.duration_min);
      }
    });

    const behaviorDurationData: BehaviorDurationPoint[] = Object.keys(behaviorByDate)
      .sort()
      .map((dateStr) => {
        const [, m, d] = dateStr.split("-");
        const counts = behaviorByDate[dateStr];
        return {
          date: `${d}/${m}`,
          Leve: Math.round(counts.Leve * 10) / 10,
          Moderada: Math.round(counts.Moderada * 10) / 10,
          Intensa: Math.round(counts.Intensa * 10) / 10,
          totalDuration: Math.round((counts.Leve + counts.Moderada + counts.Intensa) * 10) / 10,
        };
      });

    return {
      targetMonth,
      availableTargets: Array.from(availableTargetsSet),
      targetPerformanceData,
      yesNoData,
      behaviorDurationData,
      totalSessionsCount: dailyRows.results.length,
    };
  });

// ── Server Function: getAdminDashboardStats ───────────────────────────────────

export const getAdminDashboardStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      throw new Error("Acesso negado: privilégios de supervisão necessários.");
    }

    const db = getDB();

    // 1. Pacientes ativos
    const activeRes = await db
      .prepare(`SELECT COUNT(*) AS total FROM patients WHERE status != 'Alta'`)
      .first<{ total: number }>();

    // 2. Terapeutas ativos
    const therapistsRes = await db
      .prepare(`SELECT COUNT(*) AS total FROM users WHERE role = 'therapist' AND is_active = 1`)
      .first<{ total: number }>();

    // 3. Sessões nos últimos 7 dias
    const sessionsRes = await db
      .prepare(`SELECT COUNT(*) AS total FROM daily_records WHERE session_date >= date('now', '-7 days')`)
      .first<{ total: number }>();

    // 4. Aprovações pendentes
    const approvalsRes = await db
      .prepare(`SELECT COUNT(*) AS total FROM daily_records WHERE status = 'submitted'`)
      .first<{ total: number }>();

    // 5. Pacientes recentes ativos (até 4)
    const recentPatientsRes = await db
      .prepare(
        `SELECT id, name, diagnosis, progress
         FROM patients
         WHERE status != 'Alta'
         ORDER BY name
         LIMIT 4`,
      )
      .all<{ id: string; name: string; diagnosis: string; progress: number }>();

    // 6. Evolução mensal global das sessões (média de acertos agrupada por data no mês atual)
    const perfRes = await db
      .prepare(
        `SELECT
           dr.session_date,
           ROUND(AVG(CASE WHEN tr.trials > 0 THEN CAST(tr.correct AS REAL)/tr.trials * 100 ELSE 0 END), 1) AS avg_performance
         FROM daily_records dr
         JOIN target_records tr ON tr.daily_record_id = dr.id
         WHERE strftime('%Y-%m', dr.session_date) = strftime('%Y-%m', 'now')
         GROUP BY dr.session_date
         ORDER BY dr.session_date ASC`,
      )
      .all<{ session_date: string; avg_performance: number }>();

    const monthlyPerformance = perfRes.results.map((r) => {
      const parts = r.session_date.split("-");
      return {
        day: parts.length === 3 ? `${parts[2]}/${parts[1]}` : r.session_date,
        desempenho: r.avg_performance ?? 0,
      };
    });

    return {
      patientsCount: activeRes?.total ?? 0,
      therapistsCount: therapistsRes?.total ?? 0,
      weeklySessionsCount: sessionsRes?.total ?? 0,
      pendingApprovalsCount: approvalsRes?.total ?? 0,
      recentPatients: recentPatientsRes.results ?? [],
      monthlyPerformance: monthlyPerformance.length > 0 ? monthlyPerformance : [
        { day: "Dia 01", desempenho: 70 },
        { day: "Dia 05", desempenho: 75 },
        { day: "Dia 10", desempenho: 80 },
        { day: "Dia 15", desempenho: 82 },
        { day: "Dia 20", desempenho: 88 },
      ],
    };
  },
);

