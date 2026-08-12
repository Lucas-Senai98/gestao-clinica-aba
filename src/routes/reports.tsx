import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, requireRole } from "@/lib/route-guard";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { reportTemplates, generatedReports, patients } from "@/lib/mock-data";
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
import { FileText, Download, Sparkles, FileSignature } from "lucide-react";
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
  const [patient, setPatient] = useState(patients[0].id);
  const [template, setTemplate] = useState(reportTemplates[0].id);

  const generate = () => {
    const p = patients.find((x) => x.id === patient);
    const t = reportTemplates.find((x) => x.id === template);
    toast.success("Relatório gerado", {
      description: `${t?.name} — ${p?.name} (rascunho salvo)`,
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
                  <Select value={patient} onValueChange={setPatient}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Modelo</label>
                  <Select value={template} onValueChange={setTemplate}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={generate} className="w-full sm:w-auto">
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
                {generatedReports.map((r) => (
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
                      <Badge className={cn("text-[10px]", statusTone[r.status])}>{r.status}</Badge>
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
                ))}
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
            {reportTemplates.map((t) => (
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
