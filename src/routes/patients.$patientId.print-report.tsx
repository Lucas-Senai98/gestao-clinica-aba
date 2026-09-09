import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { requireAuth } from "@/lib/route-guard";
import { useCurrentUser } from "@/lib/auth-context";
import { CHECKLIST_STEPS, type SkillLevel } from "@/lib/pep-constants";
import { getClinicalChecklist, getRepertoireRecords } from "@/queries/pep";
import { getPatientAnalytics } from "@/queries/analytics";
import { getParentFeed } from "@/queries/communication";
import { getPatientById } from "@/queries/patients";
import { recordAuditLog } from "@/queries/notifications_audit";
import logo from "@/assets/logo-gize.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  FileDown,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
  TrendingUp,
  Activity,
  Heart,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export const Route = createFileRoute("/patients/$patientId/print-report")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Relatório Clínico Oficial em PDF — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Relatório formal de evolução clínica ABA para envio a famílias, convênios médicos e auditorias.",
      },
    ],
  }),
  component: PrintReportPage,
});

function PrintReportPage() {
  const { patientId } = useParams({ from: "/patients/$patientId/print-report" });
  const currentUser   = useCurrentUser();
  const [patient, setPatient] = useState<{
    id: string;
    name: string;
    birth_date?: string;
    diagnosis?: string;
    guardian_name?: string;
    health_plan?: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  // Dados do PEP / Checklist
  const [checklist, setChecklist] = useState<Record<number, { done: boolean; text: string }>>({});

  // Dados do Repertório (5 Categorias)
  const [repertoire, setRepertoire] = useState<
    Array<{ category: string; skill: string; level: string; start: string; end: string }>
  >([]);

  // Dados dos Gráficos
  const [analytics, setAnalytics] = useState<{
    targetPerformanceData: any[];
    yesNoData: any[];
    behaviorDurationData: any[];
    availableTargets: string[];
  }>({
    targetPerformanceData: [],
    yesNoData: [],
    behaviorDurationData: [],
    availableTargets: [],
  });

  // Devolutivas Recentes
  const [devolutivas, setDevolutivas] = useState<
    Array<{ date: string; title: string; body: string; mood: string; therapist: string }>
  >([]);

  useEffect(() => {
    let unmounted = false;
    setLoading(true);

    recordAuditLog({
      data: { action: "EXPORT_PDF", resource: "clinical_report", patientId },
    }).catch(() => null);

    Promise.all([
      getPatientById({
        data: {
          patientId,
          userId: currentUser?.id || "u1",
          role: currentUser?.role || "admin",
        },
      }).catch(() => null),
      getClinicalChecklist({ data: { patientId } }).catch(() => null),
      getRepertoireRecords({ data: { patientId } }).catch(() => []),
      getPatientAnalytics({ data: { patientId } }).catch(() => null),
      getParentFeed({ data: { patientId } }).catch(() => []),
    ])
      .then(([patRes, chkRes, repRes, anaRes, devRes]) => {
        if (unmounted) return;

        // 0. Paciente
        if (patRes) {
          setPatient(patRes);
        } else {
          setPatient({ id: patientId, name: "Paciente" });
        }

        // 1. Checklist ABA
        if (chkRes) {
          const c = chkRes as any;
          setChecklist({
            1: { done: Boolean(c.step1_done), text: (c.step1_text as string) || "" },
            2: { done: Boolean(c.step2_done), text: (c.step2_text as string) || "" },
            3: { done: Boolean(c.step3_done), text: (c.step3_text as string) || "" },
            4: { done: Boolean(c.step4_done), text: (c.step4_text as string) || "" },
            5: { done: Boolean(c.step5_done), text: (c.step5_text as string) || "" },
            6: { done: Boolean(c.step6_done), text: (c.step6_text as string) || "" },
            7: { done: Boolean(c.step7_done), text: (c.step7_text as string) || "" },
            8: { done: Boolean(c.step8_done), text: (c.step8_text as string) || "" },
          });
        }

        // 2. Repertório
        if (repRes && repRes.length > 0) {
          setRepertoire(
            repRes.map((r: any) => ({
              category: r.category,
              skill: r.skill,
              level: r.level,
              start: r.start_date || "-",
              end: r.end_date || "-",
            })),
          );
        } else {
          setRepertoire([]);
        }

        // 3. Analytics & Gráficos
        if (anaRes && anaRes.targetPerformanceData && anaRes.targetPerformanceData.length > 0) {
          setAnalytics({
            targetPerformanceData: anaRes.targetPerformanceData,
            yesNoData: anaRes.yesNoData || [],
            behaviorDurationData: anaRes.behaviorDurationData || [],
            availableTargets: anaRes.availableTargets || [],
          });
        } else {
          setAnalytics({
            targetPerformanceData: [],
            yesNoData: [],
            behaviorDurationData: [],
            availableTargets: [],
          });
        }

        // 4. Devolutivas
        if (devRes && devRes.length > 0) {
          setDevolutivas(
            devRes.map((d: any) => ({
              date: d.published_at ? d.published_at.slice(0, 10) : "-",
              title: d.title,
              body: d.body,
              mood: d.mood,
              therapist: d.author_name || "Terapeuta",
            })),
          );
        } else {
          setDevolutivas([]);
        }
      })
      .finally(() => {
        if (!unmounted) setLoading(false);
      });

    return () => {
      unmounted = true;
    };
  }, [patientId, currentUser]);

  const handleTriggerPrint = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const patientAge = patient?.birth_date
    ? `${Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000))} anos`
    : "Idade não informada";

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 font-sans p-0 sm:p-6 print:p-0">
      {/* ── BARRA SUPERIOR DE AÇÕES (OCULTA NA IMPRESSÃO) ───────────────────── */}
      <div className="max-w-4xl mx-auto mb-4 print:hidden flex items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-sm">
        <Button asChild variant="ghost" size="sm">
          <Link to="/patient/$patientId" params={{ patientId: patient?.id || patientId }}>
            <ArrowLeft className="size-4 mr-1" /> Voltar ao Prontuário
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button onClick={handleTriggerPrint} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
            <Printer className="size-4 mr-1.5" /> Imprimir / Salvar em PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="max-w-4xl mx-auto bg-white p-12 text-center rounded-xl border">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-3">Compilando documento clínico oficial...</p>
        </div>
      ) : (
        /* ── DOCUMENTO CLÍNICO A4 (ESTILIZADO PARA ALTA FIDELIDADE) ──────────── */
        <main className="max-w-4xl mx-auto bg-white p-8 print:p-6 rounded-xl print:rounded-none border print:border-none shadow-lg print:shadow-none space-y-8">
          
          {/* CABEÇALHO FORMAL COM LOGO DA CLÍNICA GIZÉ'S */}
          <header className="border-b-2 border-primary pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center overflow-hidden shrink-0">
                <img src={logo} alt="GiZé's Clínica ABA" className="size-10 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  GIZÉ&apos;S CLÍNICA DE GESTÃO & TERAPIAS ABA
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  Análise do Comportamento Aplicada · Prontuário Eletrônico Oficial
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Documento emitido em {currentDateStr} · Uso Estritamente Confidencial
                </p>
              </div>
            </div>

            <div className="text-right sm:text-right border-l sm:border-l-0 border-slate-200 pl-3 sm:pl-0">
              <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider border-primary text-primary px-3 py-1">
                Relatório de Evolução Clínico
              </Badge>
            </div>
          </header>

          {/* DADOS DE IDENTIFICAÇÃO DO PACIENTE */}
          <section className="bg-slate-50 print:bg-slate-50/50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
            <h2 className="font-bold uppercase tracking-wider text-slate-700 text-[11px] border-b border-slate-200 pb-1">
              Identificação do Paciente & Responsáveis
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <span className="text-slate-500 block">Nome do Paciente:</span>
                <span className="font-semibold text-slate-900">{patient?.name || "Paciente"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Idade / Responsável:</span>
                <span className="font-semibold text-slate-900">{patientAge} · {patient?.guardian_name || "Responsável"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Diagnóstico:</span>
                <span className="font-semibold text-slate-900">{patient?.diagnosis || "Não informado"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Convênio / Plano:</span>
                <span className="font-semibold text-slate-900">{patient?.health_plan || "Particular / Convênio"}</span>
              </div>
            </div>
          </section>

          {/* SEÇÃO 1: RESUMO DO CHECKLIST ABA (8 PASSOS) */}
          <section className="space-y-3 break-inside-avoid">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <CheckCircle2 className="size-4 text-primary" />
              1. Checklist Clínico ABA (Análise de 8 Passos)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHECKLIST_STEPS.map((step) => {
                const item = checklist[step.n] || { done: false, text: "" };
                return (
                  <div key={step.n} className="p-3 rounded-md border border-slate-200 text-xs space-y-1 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        Passo {step.n}: {step.label}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {item.done ? "Revisado pelo Supervisor" : "Pendente"}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed italic">
                      &quot;{item.text || step.placeholder}&quot;
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SEÇÃO 2: REPERTÓRIO INICIAL DE HABILIDADES */}
          <section className="space-y-3 break-inside-avoid">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Activity className="size-4 text-primary" />
              2. Avaliação de Repertório de Habilidades (5 Áreas)
            </h2>

            <div className="overflow-hidden border border-slate-200 rounded-md text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-2.5">Área / Categoria</th>
                    <th className="p-2.5">Habilidade Avaliada</th>
                    <th className="p-2.5">Nível de Aquisição</th>
                    <th className="p-2.5">Data Início</th>
                    <th className="p-2.5">Conclusão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {repertoire.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                        Nenhuma habilidade registrada no repertório para este paciente.
                      </td>
                    </tr>
                  ) : (
                    repertoire.slice(0, 10).map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-slate-800">{r.category}</td>
                        <td className="p-2.5 text-slate-700">{r.skill}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{r.level}</td>
                        <td className="p-2.5 text-slate-500">{r.start}</td>
                        <td className="p-2.5 text-slate-500">{r.end}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* SEÇÃO 3: GRÁFICOS DE EVOLUÇÃO (RECHARTS PARA IMPRESSÃO) */}
          <section className="space-y-4 page-break-after-always break-inside-avoid">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <TrendingUp className="size-4 text-primary" />
              3. Gráficos de Evolução Comportamental e Desempenho
            </h2>

            <div className="grid grid-cols-1 gap-6">
              {/* Gráfico 1: Desempenho */}
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 mb-2">
                  Evolução do Desempenho em Programas (% de Acertos)
                </h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.targetPerformanceData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#334155" }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: "#334155" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      {analytics.availableTargets.map((tName, i) => (
                        <Line
                          key={tName}
                          type="monotone"
                          dataKey={tName}
                          name={tName}
                          stroke={i === 0 ? "#7c3aed" : i === 1 ? "#0284c7" : "#059669"}
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grid 2 colunas para Gráfico 2 e Gráfico 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-800 mb-2">Respostas Sim / Não</h3>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.yesNoData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="Sim" fill="#059669" name="Sim" stackId="a" />
                        <Bar dataKey="Nao" fill="#dc2626" name="Não" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-800 mb-2">Duração por Intensidade (min)</h3>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.behaviorDurationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis unit="m" tick={{ fontSize: 9 }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="Leve" fill="#2563eb" name="🔵 Leve" />
                        <Bar dataKey="Moderada" fill="#d97706" name="🟡 Moderada" />
                        <Bar dataKey="Intensa" fill="#dc2626" name="🔴 Intensa" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO 4: HISTÓRICO DE DEVOLUTIVAS */}
          <section className="space-y-3 break-inside-avoid">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Heart className="size-4 text-primary" />
              4. Histórico de Devolutivas Diárias para a Família
            </h2>

            <div className="space-y-2 text-xs">
              {devolutivas.length === 0 ? (
                <div className="p-3 border border-slate-200 rounded-md bg-white text-slate-500 italic">
                  Nenhuma devolutiva registrada no período.
                </div>
              ) : (
                devolutivas.slice(0, 3).map((d, i) => (
                  <div key={i} className="p-3 border border-slate-200 rounded-md bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{d.title}</span>
                      <span className="text-slate-500 text-[11px]">{d.date} · Terapeuta: {d.therapist}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{d.body}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* RODAPÉ DE ASSINATURAS FORMAIS */}
          <footer className="pt-12 mt-8 border-t-2 border-slate-300 break-inside-avoid">
            <div className="grid grid-cols-2 gap-12 text-center text-xs">
              <div className="space-y-2">
                <div className="border-b border-slate-900 w-4/5 mx-auto h-8"></div>
                <p className="font-bold text-slate-900">Terapeuta Responsável ABA</p>
                <p className="text-slate-500 text-[11px]">Registro Profissional / CRP / CRFa</p>
              </div>

              <div className="space-y-2">
                <div className="border-b border-slate-900 w-4/5 mx-auto h-8"></div>
                <p className="font-bold text-slate-900">Dra. Gisele (Supervisora Técnica)</p>
                <p className="text-slate-500 text-[11px]">GiZé&apos;s Gestão Clínica & Terapias Integradas</p>
              </div>
            </div>
          </footer>

        </main>
      )}
    </div>
  );
}
