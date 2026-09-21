import React, { useState } from "react";
import logo from "@/assets/logo-gize.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Copy, Check, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export interface ReportPrintData {
  title: string;
  content: string;
  patient?: string;
  patientDiagnosis?: string;
  patientGuardian?: string;
  author?: string;
  date?: string;
  status?: string;
  sharedWithPatient?: boolean;
}

interface ReportPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportPrintData | null;
}

export function ReportPrintDialog({ open, onOpenChange, report }: ReportPrintDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!report) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (!report.content) return;
    navigator.clipboard.writeText(report.content);
    setCopied(true);
    toast.success("Conteúdo do relatório copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!report.content) return;
    const blob = new Blob([report.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/[^\w\d-]+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const emitDate = report.date || new Date().toLocaleDateString("pt-BR");

  return (
    <>
      {/* Estilos específicos de impressão em alta fidelidade */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #clinical-report-printable,
          #clinical-report-printable * {
            visibility: visible !important;
          }
          #clinical-report-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 1.5cm !important;
            background: white !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 11pt !important;
            line-height: 1.6 !important;
          }
          .no-print,
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-100 dark:bg-slate-900">
          {/* Barra Superior de Ações (Oculta na impressão) */}
          <div className="p-4 bg-background border-b flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
            <div>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Printer className="size-4 text-primary" /> Visualização de Impressão e PDF
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Clique em &quot;Imprimir / Salvar como PDF&quot; para abrir a caixa nativa e gerar o arquivo em alta definição.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleCopy}
              >
                {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                {copied ? "Copiado!" : "Copiar texto"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleDownload}
              >
                <Download className="size-3.5" /> Baixar (.txt)
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                onClick={handlePrint}
              >
                <Printer className="size-3.5" /> Imprimir / Salvar como PDF
              </Button>
            </div>
          </div>

          {/* Área com Scroll contendo a Folha Clínica Oficial */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div
              id="clinical-report-printable"
              className="max-w-3xl mx-auto bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-md border border-slate-200 print:border-none print:shadow-none print:p-0"
            >
              {/* Cabeçalho da Clínica com Logomarca Oficial */}
              <header className="border-b-2 border-primary pb-6 mb-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center overflow-hidden shrink-0">
                      <img src={logo} alt="GiZé's Clínica ABA" className="size-12 object-contain" />
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                        GIZÉ&apos;S CLÍNICA DE GESTÃO & TERAPIAS ABA
                      </h1>
                      <p className="text-xs text-slate-600 font-medium">
                        Análise do Comportamento Aplicada · Prontuário Eletrônico & Documentos Clínicos
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Emissão: {emitDate} · Uso Confidencial e Pessoal (LGPD)
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="border-primary text-primary font-semibold text-xs px-2.5 py-0.5 uppercase tracking-wide">
                      {report.status || "Emitido"}
                    </Badge>
                  </div>
                </div>
              </header>

              {/* Título do Relatório */}
              <div className="mb-6">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {report.title}
                </h2>
              </div>

              {/* Quadro de Identificação do Paciente e Emissor */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs mb-6">
                <div>
                  <span className="font-semibold text-slate-600 block">Paciente:</span>
                  <span className="font-bold text-slate-900 text-sm">{report.patient || "Não informado"}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 block">Diagnóstico / Hipótese:</span>
                  <span className="text-slate-800 font-medium">{report.patientDiagnosis || "TEA (Transtorno do Espectro Autista)"}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 block">Responsável Legal:</span>
                  <span className="text-slate-800">{report.patientGuardian || "Não informado"}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 block">Data de Emissão:</span>
                  <span className="text-slate-800">{emitDate}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 block">Profissional Emissor:</span>
                  <span className="text-slate-800">{report.author || "Equipe Multidisciplinar"}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 block">Destinação:</span>
                  <span className="text-slate-800 font-medium">
                    {report.sharedWithPatient ? "Família / Paciente" : "Prontuário Interno"}
                  </span>
                </div>
              </div>

              {/* Corpo Principal do Relatório */}
              <div className="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans space-y-4 pt-2">
                {report.content}
              </div>

              {/* Rodapé com Assinaturas Oficiais */}
              <footer className="pt-12 mt-12 border-t-2 border-slate-300 break-inside-avoid">
                <div className="grid grid-cols-2 gap-8 text-center text-xs">
                  <div className="space-y-1.5">
                    <div className="border-b border-slate-900 w-4/5 mx-auto h-8 mb-2"></div>
                    <p className="font-bold text-slate-900">{report.author || "Terapeuta Responsável ABA"}</p>
                    <p className="text-slate-500 text-[11px]">Registro Profissional / CRP / CRFa / CREFITO</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="border-b border-slate-900 w-4/5 mx-auto h-8 mb-2"></div>
                    <p className="font-bold text-slate-900">Dra. Gisele Duarte</p>
                    <p className="text-slate-500 text-[11px]">Supervisora Técnica ABA · CRP 06/77889</p>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="size-3 text-primary shrink-0" />
                  Documento clínico oficial gerado e assinado digitalmente pelo sistema GiZé&apos;s Gestão Clínica ABA. Protegido pela LGPD.
                </div>
              </footer>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

