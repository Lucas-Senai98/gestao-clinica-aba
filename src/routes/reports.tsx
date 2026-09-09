import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { REPORT_TEMPLATES, type ReportTemplate } from "@/lib/report-constants";
import { getPatients } from "@/queries/patients";
import type { PatientSummary } from "@/db/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Sparkles, FileSignature, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Relatórios clínicos — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Gere relatórios de evolução, devolutivas de avaliação, pareceres para convênio e documentos para a escola a partir dos dados das sessões.",
      },
      { property: "og:title", content: "Relatórios clínicos — Gestão Clínica ABA" },
      {
        property: "og:description",
        content: "Modelos de relatório prontos e histórico de documentos emitidos pela equipe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const statusTone: Record<string, string> = {
  Enviado: "bg-success/15 text-success border-0",
  "Aguardando assinatura": "bg-warning/20 text-warning-foreground border-0",
  Rascunho: "bg-muted text-muted-foreground border-0",
};

function ReportsPage() {
  const currentUser = useCurrentUser();
  const [patientsList, setPatientsList] = useState<PatientSummary[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patient, setPatient] = useState("");
  const [template, setTemplate] = useState(REPORT_TEMPLATES[0].id);

  const [reports, setReports] = useState<
    Array<{ id: string; patient: string; template: string; author: string; date: string; status: string }>
  >([]);

  useEffect(() => {
    getPatients({
      data: {
        role: currentUser?.role || "admin",
        userId: currentUser?.id || "u1",
      },
    })
      .then((data) => {
        if (data && data.length > 0) {
          setPatientsList(data);
          setPatient(data[0].id);
        }
      })
      .catch(() => setPatientsList([]))
      .finally(() => setLoadingPatients(false));
  }, [currentUser]);

  const generate = () => {
    const p = patientsList.find((x) => x.id === patient);
    const t = REPORT_TEMPLATES.find((x) => x.id === template);
    const newRep = {
      id: `rep-${Date.now()}`,
      patient: p?.name || "Paciente",
      template: t?.name || "Relatório",
      author: currentUser?.name || "Terapeuta",
      date: new Date().toLocaleDateString("pt-BR"),
      status: "Rascunho",
    };
    setReports((prev) => [newRep, ...prev]);
    toast.success("Relatório gerado", {
      description: `${t?.name} — ${p?.name || "Paciente"} (rascunho salvo)`,
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Relatórios clínicos"
        subtitle="Monte documentos a partir dos dados já coletados nas sessões."
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> Novo relatório
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Paciente</label>
                  {loadingPatients ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <Loader2 className="size-3.5 animate-spin" /> Carregando pacientes...
                    </div>
                  ) : (
                    <Select value={patient} onValueChange={setPatient}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Selecione um paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        {patientsList.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Modelo</label>
                  <Select value={template} onValueChange={setTemplate}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TEMPLATES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={generate} disabled={!patient} className="w-full sm:w-auto">
                <FileText className="size-4" /> Gerar rascunho
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Documentos emitidos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {reports.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    Nenhum documento emitido recentemente. Selecione um paciente e modelo acima para gerar.
                  </div>
                ) : (
                  reports.map((r) => (
                    <div
                      key={r.id}
                      className="px-5 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.patient}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.template}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {r.author} • {r.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={cn("text-[10px]", statusTone[r.status] || "bg-muted")}>{r.status}</Badge>
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={`Baixar relatório de ${r.patient}`}
                          onClick={() => toast("Download iniciado", { description: r.template })}
                        >
                          <Download className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t.scope} • ~{t.pages} páginas
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
