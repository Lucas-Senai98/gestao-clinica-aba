import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { requireRole } from "@/lib/route-guard";
import { useCurrentUser } from "@/lib/auth-context";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { getParentFeed, getAnnouncements } from "@/queries/communication";
import { getClinicalReports, type ClinicalReportItem } from "@/queries/reports";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ReportPrintDialog, type ReportPrintData } from "@/components/report-print-dialog";
import {
  Bell,
  Heart,
  Smile,
  ThumbsUp,
  Frown,
  Sparkles,
  Calendar,
  Loader2,
  FileText,
  Printer,
  Download,
  Eye,
  Check,
  Copy,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parent")({
  beforeLoad: requireRole("parent"),
  head: () => ({
    meta: [
      { title: "Portal dos Responsáveis — Gestão Clínica ABA" },
      {
        name: "description",
        content: "Relatórios clínicos oficiais, devolutivas diárias das sessões e quadro de avisos da clínica para famílias.",
      },
    ],
  }),
  component: ParentPortalPage,
});

const moodConfig = {
  ótimo: { icon: Smile, color: "bg-emerald-100 text-emerald-700 border-emerald-300", label: "Ótimo dia" },
  bom: { icon: ThumbsUp, color: "bg-blue-100 text-blue-700 border-blue-300", label: "Bom dia" },
  neutro: { icon: Heart, color: "bg-amber-100 text-amber-700 border-amber-300", label: "Neutro" },
  difícil: { icon: Frown, color: "bg-rose-100 text-rose-700 border-rose-300", label: "Dia desafiador" },
} as const;

function ParentPortalPage() {
  const currentUser = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [feedItems, setFeedItems] = useState<
    Array<{
      id: string;
      title: string;
      body: string;
      mood: string;
      home_practices?: string | null;
      published_at: string;
      patient_name: string;
      author_name: string;
    }>
  >([]);

  const [announcementItems, setAnnouncementItems] = useState<
    Array<{
      id: string;
      title: string;
      body: string;
      published_at: string;
      author_name: string;
    }>
  >([]);

  const [clinicalReports, setClinicalReports] = useState<ClinicalReportItem[]>([]);
  const [viewingReport, setViewingReport] = useState<ClinicalReportItem | null>(null);
  const [printData, setPrintData] = useState<ReportPrintData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let unmounted = false;

    Promise.all([
      getParentFeed({ data: {} }),
      getAnnouncements(),
      getClinicalReports({ data: {} }),
    ])
      .then(([feedRes, annRes, reportsRes]) => {
        if (unmounted) return;
        setFeedItems(feedRes || []);
        setAnnouncementItems(annRes || []);
        setClinicalReports(reportsRes || []);
      })
      .catch(() => {
        if (!unmounted) {
          setFeedItems([]);
          setAnnouncementItems([]);
          setClinicalReports([]);
        }
      })
      .finally(() => {
        if (!unmounted) setLoading(false);
      });

    return () => {
      unmounted = true;
    };
  }, []);

  const downloadReport = (r: ClinicalReportItem) => {
    const blob = new Blob([r.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.title.replace(/[^\w\d-]+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Texto do relatório copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openPrint = (r: ClinicalReportItem) => {
    setPrintData({
      title: r.title,
      content: r.content,
      patient: r.patient,
      author: r.author,
      date: r.date,
      status: r.status,
      sharedWithPatient: true,
    });
  };

  const firstName = currentUser?.name ? currentUser.name.split(" ")[0] : "Responsável";

  return (
    <AppLayout>
      <PageHeader
        title={`Olá, ${firstName} 💜`}
        subtitle="Acompanhe relatórios clínicos oficiais, devolutivas de sessões e comunicados da clínica."
      />

      {loading ? (
        <Card className="p-8 text-center">
          <Loader2 className="size-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Carregando portal da família...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ── MURAL DE AVISOS GERAIS (DA CLÍNICA PARA OS PAIS) ────────────────── */}
          <section id="avisos">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-6 rounded-md bg-primary/10 text-primary grid place-items-center">
                <Bell className="size-3.5" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Quadro de Avisos da Clínica</h2>
            </div>

            {announcementItems.length === 0 ? (
              <p className="text-xs text-muted-foreground italic bg-muted/20 p-4 rounded-lg border border-dashed">
                Nenhum comunicado da clínica publicado no momento.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {announcementItems.map((a) => (
                  <Card
                    key={a.id}
                    className="border-primary/20 bg-gradient-to-br from-primary-soft/40 to-background shadow-xs"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{a.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {a.body}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[10px] bg-background">
                          {a.published_at.slice(0, 10)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ── RELATÓRIOS CLÍNICOS OFICIAIS ENVIADOS À FAMÍLIA ────────────────── */}
          <section id="relatorios">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-primary text-primary-foreground grid place-items-center">
                  <FileText className="size-3.5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Relatórios Clínicos Oficiais
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Documentos de evolução, pareceres e devolutivas disponibilizados pela equipe técnica.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                {clinicalReports.length} {clinicalReports.length === 1 ? "documento" : "documentos"}
              </Badge>
            </div>

            {clinicalReports.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <p className="text-xs text-muted-foreground">
                  Nenhum relatório clínico foi disponibilizado para sua visualização no momento.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {clinicalReports.map((r) => (
                  <Card
                    key={r.id}
                    className="border border-border/80 shadow-xs hover:border-primary/30 transition-all flex flex-col justify-between"
                  >
                    <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm text-foreground leading-snug">
                            {r.title}
                          </h3>
                          <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                            Oficial
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Paciente: <span className="font-medium text-foreground">{r.patient}</span> • Emissão:{" "}
                          {r.date}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Profissional: <span className="font-medium text-foreground">{r.author}</span>
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2 font-mono bg-muted/20 p-2 rounded border">
                          {r.content.slice(0, 140)}...
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs gap-1"
                          onClick={() => setViewingReport(r)}
                        >
                          <Eye className="size-3.5" /> Visualizar
                        </Button>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs gap-1"
                            onClick={() => downloadReport(r)}
                            title="Baixar arquivo de texto"
                          >
                            <Download className="size-3.5" /> .txt
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-2.5 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => openPrint(r)}
                            title="Visualizar em formato oficial e imprimir ou salvar em PDF"
                          >
                            <Printer className="size-3.5" /> Imprimir / PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ── FEED DE DEVOLUTIVAS DIÁRIAS (DO TERAPEUTA PARA OS PAIS) ───────── */}
          <section id="devolutivas">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-primary text-primary-foreground grid place-items-center">
                  <Sparkles className="size-3.5" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  Devolutivas das Sessões ABA
                </h2>
              </div>
              <Badge variant="outline" className="text-xs">
                Exclusivo para a família
              </Badge>
            </div>

            {feedItems.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <p className="text-xs text-muted-foreground">
                  Nenhuma devolutiva diária registrada ainda para seu dependente.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {feedItems.map((item) => {
                  const moodKey = (item.mood || "bom") as keyof typeof moodConfig;
                  const moodInfo = moodConfig[moodKey] ?? moodConfig.bom;
                  const MoodIconComponent = moodInfo.icon;

                  return (
                    <Card
                      key={item.id}
                      className="border border-border/80 shadow-sm transition-all hover:border-primary/30"
                    >
                      <CardContent className="p-5 space-y-3">
                        {/* Cabeçalho da devolutiva */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/50">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-9 ring-2 ring-primary/20">
                              <AvatarFallback className="bg-primary-soft text-primary font-semibold text-xs">
                                {item.author_name ? item.author_name.slice(0, 2).toUpperCase() : "TR"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{item.author_name}</p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="size-3" />
                                {item.published_at.slice(0, 10)} · Paciente: {item.patient_name}
                              </p>
                            </div>
                          </div>

                          {/* Mood Badge */}
                          <Badge
                            variant="outline"
                            className={cn("flex items-center gap-1 text-xs px-2.5 py-0.5", moodInfo.color)}
                          >
                            <MoodIconComponent className="size-3.5" />
                            {moodInfo.label}
                          </Badge>
                        </div>

                        {/* Conteúdo principal sem jargão */}
                        <div>
                          <h3 className="font-semibold text-base text-foreground mb-1.5">{item.title}</h3>
                          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                            {item.body}
                          </p>
                        </div>

                        {/* Dicas para casa */}
                        {item.home_practices && (
                          <div className="mt-3 p-3 rounded-lg bg-primary-soft/30 border border-primary/10">
                            <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                              <Heart className="size-3.5" /> Sugestões para o ambiente de casa:
                            </p>
                            <p className="text-xs text-foreground/80 leading-relaxed">
                              {item.home_practices}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal de visualização completa do relatório para a família */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 mr-6">
              <DialogTitle className="text-base font-semibold">{viewingReport?.title}</DialogTitle>
              <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Oficial
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Paciente: <span className="font-medium text-foreground">{viewingReport?.patient}</span> • Emissão:{" "}
              <span className="font-medium text-foreground">{viewingReport?.date}</span> • Profissional:{" "}
              <span className="font-medium text-foreground">{viewingReport?.author}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto rounded-md border bg-muted/20 p-4 font-sans text-xs leading-relaxed whitespace-pre-wrap select-text">
            {viewingReport?.content}
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => viewingReport && copyToClipboard(viewingReport.content, viewingReport.id)}
            >
              {copiedId === viewingReport?.id ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              {copiedId === viewingReport?.id ? "Copiado!" : "Copiar texto"}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => viewingReport && downloadReport(viewingReport)}
              >
                <Download className="size-3.5" /> Baixar (.txt)
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  if (viewingReport) {
                    openPrint(viewingReport);
                    setViewingReport(null);
                  }
                }}
              >
                <Printer className="size-3.5" /> Imprimir / PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Impressão e PDF com Papel Timbrado Oficial */}
      <ReportPrintDialog
        open={!!printData}
        onOpenChange={(open) => !open && setPrintData(null)}
        report={printData}
      />
    </AppLayout>
  );
}
