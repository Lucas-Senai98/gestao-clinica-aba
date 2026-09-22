import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  getClinicalReports,
  toggleShareClinicalReport,
  type ClinicalReportItem,
} from "@/queries/reports";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  FileText,
  Send,
  Printer,
  Eye,
  Plus,
  FileDown,
  Loader2,
  CheckCircle2,
  Share2,
  ShieldCheck,
  Calendar,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PatientReportsTabProps {
  patientId: string;
  patientName?: string;
  patientDiagnosis?: string;
  patientGuardian?: string;
}

export function PatientReportsTab({
  patientId,
  patientName,
  patientDiagnosis,
  patientGuardian,
}: PatientReportsTabProps) {
  const [reports, setReports] = useState<ClinicalReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<ClinicalReportItem | null>(null);
  const [printData, setPrintData] = useState<ReportPrintData | null>(null);

  const loadReports = () => {
    setLoading(true);
    getClinicalReports({ data: { patientId } })
      .then((res) => {
        setReports(res || []);
      })
      .catch(() => {
        setReports([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, [patientId]);

  const handleToggleShare = async (r: ClinicalReportItem, newSharedState: boolean) => {
    try {
      await toggleShareClinicalReport({
        data: { id: r.id, sharedWithPatient: newSharedState },
      });
      if (newSharedState) {
        toast.success(`Relatório enviado para os responsáveis de ${r.patient} no Portal dos Pais!`);
      } else {
        toast.info("Compartilhamento revogado. O documento não está mais visível para a família.");
      }
      loadReports();
    } catch (err) {
      toast.error("Erro ao alterar compartilhamento", {
        description: err instanceof Error ? err.message : "Erro",
      });
    }
  };

  const handleOpenPrint = (r: ClinicalReportItem) => {
    setPrintData({
      title: r.title,
      content: r.content,
      patient: r.patient || patientName,
      patientDiagnosis,
      patientGuardian,
      author: r.author,
      date: r.date,
      status: r.status,
      sharedWithPatient: r.sharedWithPatient,
    });
  };

  return (
    <div className="space-y-4">
      {/* ── BARRA DE AÇÕES DA ABA ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-xl border">
        <div>
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <FileText className="size-4 text-primary" /> Relatórios Clínicos & Devolutivas
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Documentos oficiais emitidos para {patientName || "o paciente"} e compartilhados com os responsáveis.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
            <Link to="/patients/$patientId/print-report" params={{ patientId }}>
              <FileDown className="size-3.5" /> Prontuário Completo (PEP)
            </Link>
          </Button>

          <Button asChild size="sm" className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/reports">
              <Plus className="size-3.5" /> Emitir Novo Relatório
            </Link>
          </Button>
        </div>
      </div>

      {/* ── LISTAGEM DE DOCUMENTOS ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 border-b bg-muted/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Documentos Emitidos para este Paciente
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {reports.length} {reports.length === 1 ? "documento" : "documentos"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin mx-auto text-primary mb-2" /> Carregando relatórios...
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <p className="italic">Nenhum relatório clínico salvo ou emitido para este paciente ainda.</p>
              <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs mt-2">
                <Link to="/reports">
                  <Plus className="size-3.5" /> Criar Primeiro Relatório
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          r.status === "Emitido"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40"
                            : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40",
                        )}
                      >
                        {r.status}
                      </Badge>

                      {r.sharedWithPatient ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
                          <CheckCircle2 className="size-3 text-primary" /> Enviado à família (Portal dos Pais)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Restrito à equipe interna
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span>Profissional: <strong className="text-foreground">{r.author}</strong></span>
                      <span>•</span>
                      <span>Emissão: <strong className="text-foreground">{r.date}</strong></span>
                      {r.sharedAt && (
                        <>
                          <span>•</span>
                          <span className="text-primary font-medium">Disponibilizado à família em {r.sharedAt.slice(0, 16)}</span>
                        </>
                      )}
                    </p>

                    <p className="text-[11px] text-muted-foreground/80 line-clamp-1 font-mono">
                      {r.content.slice(0, 120)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end pt-2 lg:pt-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs gap-1 text-primary hover:bg-primary/10"
                      onClick={() => handleOpenPrint(r)}
                      title="Imprimir ou gerar PDF oficial"
                    >
                      <Printer className="size-3.5" />
                      <span>Imprimir / PDF</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs gap-1"
                      onClick={() => setViewingReport(r)}
                      title="Visualizar conteúdo"
                    >
                      <Eye className="size-3.5" />
                      <span>Visualizar</span>
                    </Button>

                    {r.sharedWithPatient ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
                        onClick={() => handleToggleShare(r, false)}
                        title="Desfazer compartilhamento com a família"
                      >
                        <Share2 className="size-3.5" />
                        <span>Desfazer envio</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                        onClick={() => handleToggleShare(r, true)}
                        title="Disponibilizar este relatório no Portal dos Pais agora"
                      >
                        <Send className="size-3.5" />
                        <span>Enviar à família</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── DIALOG DE VISUALIZAÇÃO DO RELATÓRIO ───────────────────────────────── */}
      {viewingReport && (
        <Dialog open={Boolean(viewingReport)} onOpenChange={(open) => !open && setViewingReport(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2 mr-6">
                <DialogTitle className="text-base">{viewingReport.title}</DialogTitle>
                <Badge
                  className={cn(
                    "text-[10px]",
                    viewingReport.status === "Emitido" ? "bg-emerald-100 text-emerald-800" : "bg-muted",
                  )}
                >
                  {viewingReport.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs">
                Paciente: {viewingReport.patient} • Emitido por: {viewingReport.author} em {viewingReport.date}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 bg-muted/20 rounded-lg border font-mono text-xs whitespace-pre-wrap leading-relaxed">
              {viewingReport.content}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              {viewingReport.sharedWithPatient ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 text-muted-foreground"
                  onClick={() => {
                    handleToggleShare(viewingReport, false);
                    setViewingReport(null);
                  }}
                >
                  <Share2 className="size-3.5" /> Desfazer envio à família
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1 text-primary"
                  onClick={() => {
                    handleToggleShare(viewingReport, true);
                    setViewingReport(null);
                  }}
                >
                  <Send className="size-3.5" /> Enviar à Família
                </Button>
              )}

              <Button
                size="sm"
                className="text-xs gap-1 bg-primary text-primary-foreground"
                onClick={() => {
                  handleOpenPrint(viewingReport);
                  setViewingReport(null);
                }}
              >
                <Printer className="size-3.5" /> Imprimir / Salvar em PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── DIALOG OFICIAL DE IMPRESSÃO / PDF ─────────────────────────────────── */}
      <ReportPrintDialog
        open={Boolean(printData)}
        onOpenChange={(open) => !open && setPrintData(null)}
        report={printData}
      />
    </div>
  );
}

