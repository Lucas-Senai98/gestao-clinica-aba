import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { REPORT_TEMPLATES, getReportDefaultContent } from "@/lib/report-constants";
import { getPatients } from "@/queries/patients";
import type { PatientSummary } from "@/db/types";
import {
  createClinicalReport,
  updateClinicalReport,
  toggleShareClinicalReport,
  deleteClinicalReport,
  getClinicalReports,
  updateClinicalReportStatus,
  type ClinicalReportItem,
} from "@/queries/reports";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Download,
  Sparkles,
  FileSignature,
  Loader2,
  Trash2,
  Archive,
  CheckCircle2,
  RotateCcw,
  Eraser,
  Eye,
  Copy,
  Check,
  Send,
  FileEdit,
  Printer,
  Share2,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  beforeLoad: requirePermission("reports:view"),
  head: () => ({
    meta: [
      { title: "Relatórios clínicos — Gestão Clínica ABA" },
      { name: "description", content: "Gere, edite, salve, envie ao paciente e imprima relatórios clínicos em PDF." },
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
  const [shareWithPatient, setShareWithPatient] = useState(true);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<ClinicalReportItem | null>(null);
  const [printData, setPrintData] = useState<ReportPrintData | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      getPatients({ data: { role: currentUser?.role || "admin", userId: currentUser?.id || "u1" } }).catch(() => []),
      getClinicalReports({ data: {} }).catch(() => []),
    ])
      .then(([patientsData, reportsData]) => {
        const pList = patientsData || [];
        setPatientsList(pList);
        setReports(reportsData || []);

        const initialPatient = patient || (pList[0] ? pList[0].id : "");
        if (!patient && initialPatient) {
          setPatient(initialPatient);
        }

        // Se o editor ainda não tem conteúdo e não estamos editando rascunho, inicializa com o modelo atual
        if (!content && initialPatient && !editingReportId) {
          const selectedP = pList.find((x) => x.id === initialPatient);
          setContent(getReportDefaultContent(template, selectedP));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentUser) load();
  }, [currentUser]);

  // Ao trocar de modelo no select ou na lista lateral
  const handleTemplateChange = (newTemplateId: string) => {
    setTemplate(newTemplateId);
    const p = patientsList.find((x) => x.id === patient);
    const newContent = getReportDefaultContent(newTemplateId, p);
    setContent(newContent);
    const t = REPORT_TEMPLATES.find((x) => x.id === newTemplateId);
    toast.info(`Modelo "${t?.name || "selecionado"}" carregado no editor.`);
  };

  // Ao trocar de paciente
  const handlePatientChange = (newPatientId: string) => {
    setPatient(newPatientId);
    if (!editingReportId) {
      const p = patientsList.find((x) => x.id === newPatientId);
      setContent(getReportDefaultContent(template, p));
    }
  };

  // Restaurar modelo original
  const handleRestoreTemplate = () => {
    const p = patientsList.find((x) => x.id === patient);
    setContent(getReportDefaultContent(template, p));
    setEditingReportId(null);
    setEditingTitle("");
    toast.success("Estrutura padrão do modelo restaurada no editor.");
  };

  // Limpar conteúdo
  const handleClearContent = () => {
    setContent("");
    setEditingReportId(null);
    setEditingTitle("");
    toast.info("Editor limpo.");
  };

  // Cancelar modo de edição de rascunho existente
  const handleCancelEditing = () => {
    setEditingReportId(null);
    setEditingTitle("");
    const p = patientsList.find((x) => x.id === patient);
    setContent(getReportDefaultContent(template, p));
    toast.info("Edição cancelada. Editor redefinido com o modelo atual.");
  };

  // Salvar (Rascunho ou Emitido)
  const create = async (status: "Rascunho" | "Emitido" = "Rascunho") => {
    const p = patientsList.find((x) => x.id === patient);
    const t = REPORT_TEMPLATES.find((x) => x.id === template);
    if (!p || !t) {
      toast.error("Selecione paciente e modelo.");
      return;
    }

    const body = content.trim();
    if (body.length < 5) {
      toast.error("O relatório deve conter pelo menos 5 caracteres para ser salvo.");
      return;
    }

    setSaving(true);
    try {
      const title = editingTitle || `${t.name} — ${p.name}`;
      const isEmitted = status === "Emitido";
      const isShared = isEmitted ? shareWithPatient : false;

      if (editingReportId) {
        // Atualiza o documento existente
        await updateClinicalReport({
          data: {
            id: editingReportId,
            title,
            content: body,
            status,
            sharedWithPatient: isShared,
          },
        });
        toast.success(
          status === "Emitido"
            ? `Relatório emitido com sucesso! ${isShared ? "Enviado para a família no Portal dos Pais." : ""}`
            : "Rascunho atualizado com sucesso!",
        );
        setEditingReportId(null);
        setEditingTitle("");
      } else {
        // Cria um novo documento
        await createClinicalReport({
          data: {
            patientId: p.id,
            templateId: t.id,
            templateName: t.name,
            title,
            content: body,
            status,
            sharedWithPatient: isShared,
          },
        });
        toast.success(
          status === "Emitido"
            ? `Relatório emitido com sucesso! ${isShared ? "Enviado para a família no Portal dos Pais." : ""}`
            : "Rascunho do relatório salvo com sucesso!",
        );
      }

      load();
    } catch (err) {
      toast.error("Erro ao salvar relatório", { description: err instanceof Error ? err.message : "Erro" });
    } finally {
      setSaving(false);
    }
  };

  // Alternar compartilhamento com o paciente / família
  const handleToggleShare = async (r: ClinicalReportItem, newSharedState: boolean) => {
    try {
      await toggleShareClinicalReport({
        data: { id: r.id, sharedWithPatient: newSharedState },
      });
      if (newSharedState) {
        toast.success("Relatório enviado e disponibilizado para a família no Portal dos Pais!");
      } else {
        toast.info("Compartilhamento com a família revogado. Documento restrito à equipe.");
      }
      load();
    } catch (err) {
      toast.error("Erro ao alterar compartilhamento", {
        description: err instanceof Error ? err.message : "Erro",
      });
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Texto copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Carregar rascunho existente no editor para continuar editando
  const loadIntoEditor = (r: ClinicalReportItem) => {
    setContent(r.content);
    if (r.patientId) setPatient(r.patientId);
    if (r.templateId) setTemplate(r.templateId);
    setEditingReportId(r.id);
    setEditingTitle(r.title);
    setShareWithPatient(r.sharedWithPatient);
    setViewingReport(null);
    toast.success(`Relatório "${r.title}" carregado para edição.`);
  };

  // Abrir modal oficial de impressão / PDF
  const handleOpenPrintForCurrentEditor = () => {
    const p = patientsList.find((x) => x.id === patient);
    const t = REPORT_TEMPLATES.find((x) => x.id === template);
    setPrintData({
      title: editingTitle || `${t?.name || "Relatório Clínico"} — ${p?.name || "Paciente"}`,
      content: content || getReportDefaultContent(template, p),
      patient: p?.name,
      patientDiagnosis: p?.diagnosis,
      patientGuardian: p?.guardian,
      author: currentUser?.name || "Marina Duarte (Supervisora)",
      date: new Date().toLocaleDateString("pt-BR"),
      status: editingReportId ? "Rascunho em Edição" : "Prévia de Impressão",
      sharedWithPatient: shareWithPatient,
    });
  };

  const handleOpenPrintForSaved = (r: ClinicalReportItem) => {
    const p = patientsList.find((x) => x.id === r.patientId);
    setPrintData({
      title: r.title,
      content: r.content,
      patient: r.patient || p?.name,
      patientDiagnosis: p?.diagnosis,
      patientGuardian: p?.guardian,
      author: r.author,
      date: r.date,
      status: r.status,
      sharedWithPatient: r.sharedWithPatient,
    });
  };

  const selectedTemplateObj = REPORT_TEMPLATES.find((x) => x.id === template);
  const currentPatientObj = patientsList.find((x) => x.id === patient);

  return (
    <AppLayout>
      <PageHeader
        title="Relatórios clínicos"
        subtitle="Gere, edite rascunhos, envie à família e emita documentos oficiais em PDF."
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
        <div className="space-y-4">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileEdit className="size-4 text-primary" /> Editor de relatório clínico
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {editingReportId ? (
                    <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs">
                      <FileEdit className="size-3" /> Editando documento salvo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-background font-normal">
                      {selectedTemplateObj?.name || "Personalizado"}
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-xs">
                O modelo selecionado abaixo é 100% editável. Você pode alterar qualquer texto, salvar como rascunho, emitir e imprimir em PDF.
              </CardDescription>

              {/* Banner se estiver editando um relatório existente */}
              {editingReportId && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-2 text-amber-800 dark:text-amber-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    Você está editando: &quot;{editingTitle}&quot;.
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
                    onClick={handleCancelEditing}
                  >
                    <X className="size-3 mr-1" /> Sair da edição
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Paciente
                  </label>
                  <Select value={patient} onValueChange={handlePatientChange}>
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patientsList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Modelo de relatório</span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {REPORT_TEMPLATES.length} opções disponíveis
                    </span>
                  </label>
                  <Select value={template} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TEMPLATES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} {t.id === "blank" ? "(Livre)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Barra de utilitários do editor */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-2 rounded-md border text-xs">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{content.length}</span> caracteres •{" "}
                  <span className="font-semibold text-foreground">{content.split("\n").filter(Boolean).length}</span> parágrafos
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleOpenPrintForCurrentEditor}
                    title="Visualizar impressão e gerar PDF deste relatório"
                  >
                    <Printer className="size-3 text-primary" /> Imprimir / PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleRestoreTemplate}
                    title="Restaurar o texto original do modelo atual"
                  >
                    <RotateCcw className="size-3" /> Restaurar modelo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={handleClearContent}
                    title="Limpar texto do editor"
                  >
                    <Eraser className="size-3" /> Limpar
                  </Button>
                </div>
              </div>

              {/* Caixa de texto editável com o conteúdo do modelo */}
              <div className="relative">
                <Textarea
                  rows={14}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Selecione um paciente e modelo acima, ou digite o relatório livremente aqui..."
                  className="font-mono text-xs sm:text-sm leading-relaxed p-3.5 resize-y min-h-[300px] border-border focus-visible:ring-primary/40 shadow-inner"
                />
              </div>

              {/* Opção de envio ao paciente / família */}
              <div className="p-3 rounded-lg border bg-primary/5 border-primary/20 flex items-start gap-2.5">
                <Checkbox
                  id="shareFamily"
                  checked={shareWithPatient}
                  onCheckedChange={(c) => setShareWithPatient(Boolean(c))}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <label
                    htmlFor="shareFamily"
                    className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
                  >
                    <Share2 className="size-3.5 text-primary" />
                    Enviar e disponibilizar para a família no Portal dos Pais
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Ao emitir, este relatório ficará visível e disponível para download/impressão direta para os responsáveis de{" "}
                    <span className="font-semibold text-foreground">{currentPatientObj?.name || "este paciente"}</span>.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary shrink-0" />
                  Texto 100% editável. Salve como rascunho para continuar depois ou emita para oficializar.
                </p>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <Button
                    variant="outline"
                    onClick={() => create("Rascunho")}
                    disabled={!patient || saving}
                    className="flex-1 sm:flex-none gap-1.5"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                    {editingReportId ? "Atualizar rascunho" : "Salvar rascunho"}
                  </Button>
                  <Button
                    onClick={() => create("Emitido")}
                    disabled={!patient || saving}
                    className="flex-1 sm:flex-none gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Emitir relatório
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Documentos Salvos/Emitidos */}
          <Card>
            <CardHeader className="pb-3 border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="size-4 text-primary" /> Documentos emitidos e rascunhos
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Rascunhos salvos pela equipe e relatórios oficiais emitidos ou compartilhados com as famílias.
                  </CardDescription>
                </div>
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
                <div className="p-8 text-center text-xs text-muted-foreground italic">
                  Nenhum documento salvo ainda. Escolha um modelo acima e salve seu primeiro relatório.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className="px-4 sm:px-5 py-3.5 grid lg:grid-cols-[minmax(0,1fr)_auto] items-center gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
                          <Badge className={cn("text-[10px]", statusTone[r.status] || "bg-muted")}>
                            {r.status}
                          </Badge>
                          {r.sharedWithPatient ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
                              <CheckCircle2 className="size-3 text-primary" /> Enviado à família
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Apenas equipe interna
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          <span className="font-medium text-foreground">{r.patient}</span> • {r.author} • {r.date}
                        </p>
                        <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-1 font-mono">
                          {r.content.slice(0, 120)}...
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs gap-1 text-primary hover:bg-primary/10"
                          onClick={() => handleOpenPrintForSaved(r)}
                          title="Imprimir ou gerar PDF deste relatório"
                        >
                          <Printer className="size-3.5" />
                          <span>Imprimir / PDF</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs gap-1"
                          onClick={() => setViewingReport(r)}
                          title="Visualizar conteúdo completo"
                        >
                          <Eye className="size-3.5" />
                          <span className="hidden sm:inline">Visualizar</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-xs gap-1"
                          onClick={() => loadIntoEditor(r)}
                          title="Continuar editando este documento no editor"
                        >
                          <FileEdit className="size-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>

                        {/* Botão de Enviar ou Desfazer Envio à família */}
                        {r.sharedWithPatient ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
                            onClick={() => handleToggleShare(r, false)}
                            title="Desfazer envio e remover acesso da família"
                          >
                            <Share2 className="size-3.5" />
                            <span className="hidden xl:inline">Desfazer envio</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => handleToggleShare(r, true)}
                            title="Enviar relatório para a família no Portal dos Pais"
                          >
                            <Send className="size-3.5" />
                            <span className="hidden xl:inline">Enviar à família</span>
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="outline"
                          className="size-8"
                          onClick={() => download(r)}
                          title="Baixar arquivo (.txt)"
                        >
                          <Download className="size-3.5" />
                        </Button>

                        {r.status !== "Emitido" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-success hover:text-success hover:bg-success/10"
                            onClick={() => setStatus(r.id, "Emitido")}
                            title="Marcar como Emitido"
                          >
                            <CheckCircle2 className="size-3.5" />
                          </Button>
                        )}

                        {r.status !== "Arquivado" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground"
                            onClick={() => setStatus(r.id, "Arquivado")}
                            title="Arquivar relatório"
                          >
                            <Archive className="size-3.5" />
                          </Button>
                        )}

                        {currentUser?.role === "admin" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive hover:bg-destructive/10"
                            onClick={() => remove(r.id)}
                            title="Excluir definitivamente"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Painel lateral: Modelos disponíveis */}
        <div className="space-y-4">
          <Card className="h-fit shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/10">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSignature className="size-4 text-primary" /> Modelos disponíveis
              </CardTitle>
              <CardDescription className="text-xs">
                Clique em um modelo para carregá-lo diretamente no editor.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {REPORT_TEMPLATES.map((t) => {
                const isSelected = template === t.id && !editingReportId;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleTemplateChange(t.id)}
                    className={cn(
                      "rounded-lg border p-3 cursor-pointer transition-all duration-150 relative group",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
                        {t.name}
                      </p>
                      {isSelected && (
                        <Badge variant="default" className="text-[9px] h-4 px-1.5 shrink-0">
                          Ativo
                        </Badge>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {t.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                      <span>{t.scope}</span>
                      <span>~{t.pages} {t.pages === 1 ? "pág." : "págs."}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-2 text-xs">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Printer className="size-3.5 text-primary" />
                Impressão e PDF Oficial
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Você pode gerar um PDF oficial em papel timbrado com logomarca e campos de assinatura técnica clicando em <strong>Imprimir / PDF</strong>.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Marque a opção de <strong>Enviar à família</strong> para que os pais acessem o documento em tempo real no Portal dos Pais.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de visualização completa do relatório */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 mr-6">
              <DialogTitle className="text-base font-semibold">{viewingReport?.title}</DialogTitle>
              {viewingReport && (
                <Badge className={cn("text-[10px]", statusTone[viewingReport.status] || "bg-muted")}>
                  {viewingReport.status}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs">
              Paciente: <span className="font-medium text-foreground">{viewingReport?.patient}</span> • Autor:{" "}
              <span className="font-medium text-foreground">{viewingReport?.author}</span> • Data:{" "}
              {viewingReport?.date} •{" "}
              <span className="font-medium text-primary">
                {viewingReport?.sharedWithPatient ? "Compartilhado com a família" : "Apenas interno"}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto rounded-md border bg-muted/20 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text">
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

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                onClick={() => {
                  if (viewingReport) {
                    handleOpenPrintForSaved(viewingReport);
                    setViewingReport(null);
                  }
                }}
              >
                <Printer className="size-3.5" /> Imprimir / PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => viewingReport && download(viewingReport)}
              >
                <Download className="size-3.5" /> Baixar (.txt)
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => viewingReport && loadIntoEditor(viewingReport)}
              >
                <FileEdit className="size-3.5" /> Editar no editor
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
