import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { REPORT_TEMPLATES } from "@/lib/report-constants";
import { getPatients } from "@/queries/patients";
import type { PatientSummary } from "@/db/types";
import {
  createClinicalReport,
  deleteClinicalReport,
  getClinicalReports,
  updateClinicalReportStatus,
  type ClinicalReportItem,
} from "@/queries/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Download, Sparkles, FileSignature, Loader2, Trash2, Archive, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Relatórios clínicos — Gestão Clínica ABA" },
      { name: "description", content: "Gere, salve e baixe relatórios clínicos persistentes." },
    ],
  }),
  component: ReportsPage,
});

const statusTone: Record<string, string> = {
  Emitido: "bg-success/15 text-success border-0",
  Arquivado: "bg-muted text-muted-foreground border-0",
  Rascunho: "bg-warning/20 text-warning-foreground border-0",
};

function ReportsPage() {
  const currentUser = useCurrentUser();
  const [patientsList, setPatientsList] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState("");
  const [template, setTemplate] = useState(REPORT_TEMPLATES[0].id);
  const [content, setContent] = useState("");
  const [reports, setReports] = useState<ClinicalReportItem[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      getPatients({ data: { role: currentUser?.role || "admin", userId: currentUser?.id || "u1" } }).catch(() => []),
      getClinicalReports({ data: {} }).catch(() => []),
    ])
      .then(([patientsData, reportsData]) => {
        setPatientsList(patientsData || []);
        setReports(reportsData || []);
        if (!patient && patientsData?.[0]) setPatient(patientsData[0].id);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentUser) load();
  }, [currentUser]);

  const generateContent = () => {
    const p = patientsList.find((x) => x.id === patient);
    const t = REPORT_TEMPLATES.find((x) => x.id === template);
    return [
      `${t?.name || "Relatório clínico"}`,
      "",
      `Paciente: ${p?.name || "Paciente"}`,
      `Diagnóstico/hipótese: ${p?.diagnosis || "Não informado"}`,
      `Responsável: ${p?.guardian || "Não informado"}`,
      "",
      "Síntese clínica:",
      "Documento gerado a partir dos registros disponíveis no sistema. Revise as informações, complemente a análise clínica e emita quando estiver pronto para envio.",
      "",
      "Condutas e recomendações:",
      "- Manter acompanhamento terapêutico conforme planejamento vigente.",
      "- Reavaliar metas, repertórios e comportamento-alvo no próximo ciclo clínico.",
    ].join("\n");
  };

  const create = async () => {
    const p = patientsList.find((x) => x.id === patient);
    const t = REPORT_TEMPLATES.find((x) => x.id === template);
    if (!p || !t) {
      toast.error("Selecione paciente e modelo.");
      return;
    }
    setSaving(true);
    try {
      const body = content.trim() || generateContent();
      await createClinicalReport({
        data: {
          patientId: p.id,
          templateId: t.id,
          templateName: t.name,
          title: `${t.name} — ${p.name}`,
          content: body,
          status: "Rascunho",
        },
      });
      setContent("");
      toast.success("Relatório salvo no banco.");
      load();
    } catch (err) {
      toast.error("Erro ao salvar relatório", { description: err instanceof Error ? err.message : "Erro" });
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: ClinicalReportItem["status"]) => {
    await updateClinicalReportStatus({ data: { id, status } });
    toast.success(`Relatório marcado como ${status.toLowerCase()}.`);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este relatório definitivamente?")) return;
    await deleteClinicalReport({ data: { id } });
    toast.success("Relatório excluído.");
    load();
  };

  const download = (r: ClinicalReportItem) => {
    const blob = new Blob([r.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.title.replace(/[^\w\d-]+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <PageHeader title="Relatórios clínicos" subtitle="Gere, salve e acompanhe documentos emitidos." />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> Novo relatório persistente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Paciente</label>
                  <Select value={patient} onValueChange={setPatient}>
                    <SelectTrigger className="w-full mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{patientsList.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Modelo</label>
                  <Select value={template} onValueChange={setTemplate}>
                    <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{REPORT_TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={generateContent()}
              />
              <Button onClick={create} disabled={!patient || saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Salvar rascunho
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Documentos emitidos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mx-auto text-primary mb-2" /> Carregando relatórios...
                </div>
              ) : reports.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  Nenhum documento salvo ainda.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {reports.map((r) => (
                    <div key={r.id} className="px-5 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.patient}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{r.author} • {r.date}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge className={cn("text-[10px]", statusTone[r.status] || "bg-muted")}>{r.status}</Badge>
                        <Button size="icon" variant="outline" onClick={() => download(r)}><Download className="size-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setStatus(r.id, "Emitido")}><CheckCircle2 className="size-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setStatus(r.id, "Arquivado")}><Archive className="size-4" /></Button>
                        {currentUser?.role === "admin" && <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="size-4 text-destructive" /></Button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSignature className="size-4 text-primary" /> Modelos disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {REPORT_TEMPLATES.map((t) => (
              <div key={t.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium leading-tight">{t.name}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{t.scope} • ~{t.pages} páginas</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
