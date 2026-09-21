import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useState, useEffect, useMemo } from "react";
import { requireRole } from "@/lib/route-guard";
import { AppLayout, PageHeader } from "@/components/app-layout";
import {
  getFinancialReport,
  updatePatientBillingRate,
  updateTherapistPaymentRate,
  getFinancialEntries,
  getFinancialSummaryKPIs,
  createFinancialEntry,
  updateFinancialEntryStatus,
  deleteFinancialEntry,
  type PatientBillingItem,
  type TherapistPayoutItem,
} from "@/queries/financial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPatients } from "@/queries/patients";
import type {
  FinancialEntryWithRelations,
  FinancialSummaryKPIs,
  FinancialEntryType,
  FinancialEntryStatus,
  FinancialPaymentMethod,
  PatientSummary,
} from "@/db/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Calendar,
  Loader2,
  Edit2,
  Save,
  CheckCircle2,
  PieChart,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Trash2,
  Check,
  Search,
  Receipt,
  Wallet,
  Coins,
  Settings,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/financial")({
  beforeLoad: requireRole("admin"),
  head: () => ({
    meta: [
      { title: "Gestão Financeira & Repasse — Gestão Clínica ABA" },
      { title: "Gestão Financeira & Fluxo de Caixa — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Dashboard financeiro da clínica: faturamento de convênios e particulares, cálculo de repasse aos terapeutas e margem operacional.",
          "Módulo completo de finanças da clínica: Contas a Pagar, Contas a Receber, DRE Analítico e Repasse da Equipe Multidisciplinar.",
      },
    ],
  }),
  component: AdminFinancialPage,
});

function AdminFinancialPage() {
export function AdminFinancialPage() {
  const [selectedMonth, setSelectedMonth] = useState("08");
  const [selectedYear, setSelectedYear]   = useState("2026");
  const [activeTab, setActiveTab]         = useState("receivables");

  const [loading, setLoading] = useState(true);
  const [report, setReport]   = useState<{
  // Dados do DRE & Repasses
  const [reportLoading, setReportLoading] = useState(true);
  const [report, setReport] = useState<{
    totalRevenue: number;
    totalPayout: number;
    netBalance: number;
    patientBreakdown: PatientBillingItem[];
    therapistBreakdown: TherapistPayoutItem[];
  }>({
    totalRevenue: 0,
    totalPayout: 0,
    netBalance: 0,
    patientBreakdown: [],
    therapistBreakdown: [],
  });

  // Modal / Edição de Taxa de Paciente
  // Dados de Contas a Pagar e Receber
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entries, setEntries] = useState<FinancialEntryWithRelations[]>([]);
  const [kpis, setKpis] = useState<FinancialSummaryKPIs>({
    totalReceivablePending: 0,
    totalReceivableReceived: 0,
    totalPayablePending: 0,
    totalPayablePaid: 0,
    projectedBalance: 0,
    realizedBalance: 0,
    overdueCount: 0,
    overdueTotal: 0,
  });

  // Lista de pacientes para seleção em modais
  const [patientsList, setPatientsList] = useState<PatientSummary[]>([]);

  // Filtros de busca nas tabelas
  const [searchReceivable, setSearchReceivable] = useState("");
  const [statusFilterReceivable, setStatusFilterReceivable] = useState<string>("all");

  const [searchPayable, setSearchPayable] = useState("");
  const [statusFilterPayable, setStatusFilterPayable] = useState<string>("all");

  // Modais de Criação
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [newEntryType, setNewEntryType] = useState<FinancialEntryType>("receivable");
  const [newEntryCategory, setNewEntryCategory] = useState("");
  const [newEntryDescription, setNewEntryDescription] = useState("");
  const [newEntryAmount, setNewEntryAmount] = useState<number>(0);
  const [newEntryDueDate, setNewEntryDueDate] = useState("2026-08-20");
  const [newEntryPatientId, setNewEntryPatientId] = useState<string>("");
  const [newEntryTherapistId, setNewEntryTherapistId] = useState<string>("");
  const [newEntryPaymentMethod, setNewEntryPaymentMethod] = useState<FinancialPaymentMethod>("pix");
  const [newEntryNotes, setNewEntryNotes] = useState("");
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

  // Modal de Baixa / Liquidação
  const [liquidatingEntry, setLiquidatingEntry] = useState<FinancialEntryWithRelations | null>(null);
  const [settlementDate, setSettlementDate] = useState("2026-08-17");
  const [settlementMethod, setSettlementMethod] = useState<FinancialPaymentMethod>("pix");
  const [isSettling, setIsSettling] = useState(false);

  // Modal / Edição de Taxa de Paciente (DRE)
  const [editingPatient, setEditingPatient] = useState<PatientBillingItem | null>(null);
  const [patientRate, setPatientRate]       = useState(150);
  const [billingType, setBillingType]       = useState<"particular" | "convenio">("particular");
  const [insuranceName, setInsuranceName]   = useState("");
  const [savingRate, setSavingRate]         = useState(false);

  // Modal / Edição de Taxa de Terapeuta
  // Modal / Edição de Taxa de Terapeuta (DRE)
  const [editingTherapist, setEditingTherapist] = useState<TherapistPayoutItem | null>(null);
  const [therapistRate, setTherapistRate]     = useState(80);
  const [therapistRate, setTherapistRate]       = useState(80);
  const [savingTherapistRate, setSavingTherapistRate] = useState(false);

  const loadData = () => {
    setLoading(true);
    getFinancialReport({
      data: {
        month: `${selectedYear}-${selectedMonth}`,
        year: Number(selectedYear),
      },
    })
      .then((res) => {
        setReport(res);
      })
      .catch((err) => {
        toast.error("Erro ao carregar dados financeiros", {
          description: err instanceof Error ? err.message : "Erro",
        });
      })
      .finally(() => setLoading(false));
  const monthParam = `${selectedYear}-${selectedMonth}`;

  // Carrega DRE e Contas a Pagar/Receber
  const loadAllData = async () => {
    setReportLoading(true);
    setEntriesLoading(true);

    try {
      const [repData, entData, kpisData, patsData] = await Promise.all([
        getFinancialReport({
          data: {
            month: monthParam,
            year: Number(selectedYear),
          },
        }),
        getFinancialEntries({
          data: {
            month: monthParam,
          },
        }),
        getFinancialSummaryKPIs({
          data: {
            month: monthParam,
          },
        }),
        getPatients({
          data: {
            role: "admin",
            userId: "u-admin-01",
          },
        }).catch(() => [] as PatientSummary[]),
      ]);

      setReport(repData);
      setEntries(entData);
      setKpis(kpisData);
      setPatientsList(patsData);
    } catch (err) {
      toast.error("Erro ao carregar dados financeiros", {
        description: err instanceof Error ? err.message : "Erro",
      });
    } finally {
      setReportLoading(false);
      setEntriesLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadAllData();
  }, [selectedMonth, selectedYear]);

  // Filtros de Contas a Receber
  const filteredReceivables = useMemo(() => {
    return entries.filter((e) => {
      if (e.type !== "receivable") return false;
      if (statusFilterReceivable !== "all" && e.status !== statusFilterReceivable) return false;
      if (searchReceivable.trim()) {
        const q = searchReceivable.toLowerCase().trim();
        const matchesDesc = e.description.toLowerCase().includes(q);
        const matchesCat = e.category.toLowerCase().includes(q);
        const matchesPat = e.patient_name ? e.patient_name.toLowerCase().includes(q) : false;
        if (!matchesDesc && !matchesCat && !matchesPat) return false;
      }
      return true;
    });
  }, [entries, statusFilterReceivable, searchReceivable]);

  // Filtros de Contas a Pagar
  const filteredPayables = useMemo(() => {
    return entries.filter((e) => {
      if (e.type !== "payable") return false;
      if (statusFilterPayable !== "all" && e.status !== statusFilterPayable) return false;
      if (searchPayable.trim()) {
        const q = searchPayable.toLowerCase().trim();
        const matchesDesc = e.description.toLowerCase().includes(q);
        const matchesCat = e.category.toLowerCase().includes(q);
        const matchesTher = e.therapist_name ? e.therapist_name.toLowerCase().includes(q) : false;
        if (!matchesDesc && !matchesCat && !matchesTher) return false;
      }
      return true;
    });
  }, [entries, statusFilterPayable, searchPayable]);

  // Submissão de Novo Lançamento
  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryDescription.trim() || newEntryAmount <= 0) {
      toast.error("Preencha a descrição e um valor válido maior que zero.");
      return;
    }

    setIsSubmittingEntry(true);
    try {
      await createFinancialEntry({
        data: {
          type: newEntryType,
          category: newEntryCategory || (newEntryType === "receivable" ? "Mensalidade Particular" : "Despesas Gerais"),
          description: newEntryDescription.trim(),
          amount: Number(newEntryAmount),
          dueDate: newEntryDueDate,
          patientId: newEntryPatientId || null,
          therapistId: newEntryTherapistId || null,
          paymentMethod: newEntryPaymentMethod,
          notes: newEntryNotes.trim() || null,
        },
      });

      toast.success(
        newEntryType === "receivable"
          ? "Conta a Receber registrada com sucesso!"
          : "Conta a Pagar registrada com sucesso!",
      );
      setIsNewEntryOpen(false);
      resetNewEntryForm();
      loadAllData();
    } catch (err) {
      toast.error("Erro ao salvar lançamento", {
        description: err instanceof Error ? err.message : "Erro",
      });
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  const resetNewEntryForm = () => {
    setNewEntryDescription("");
    setNewEntryAmount(0);
    setNewEntryCategory("");
    setNewEntryPatientId("");
    setNewEntryTherapistId("");
    setNewEntryNotes("");
    setNewEntryDueDate(`${selectedYear}-${selectedMonth}-20`);
  };

  // Liquidação de Lançamento (Marcar como Pago/Recebido)
  const handleConfirmSettlement = async () => {
    if (!liquidatingEntry) return;
    setIsSettling(true);
    try {
      await updateFinancialEntryStatus({
        data: {
          id: liquidatingEntry.id,
          status: "completed",
          paymentDate: settlementDate,
          paymentMethod: settlementMethod,
        },
      });

      toast.success(
        liquidatingEntry.type === "receivable"
          ? "Recebimento confirmado com sucesso!"
          : "Pagamento liquidado com sucesso!",
      );
      setLiquidatingEntry(null);
      loadAllData();
    } catch (err) {
      toast.error("Erro ao liquidar lançamento");
    } finally {
      setIsSettling(false);
    }
  };

  // Exclusão de Lançamento
  const handleDeleteEntry = async (id: string, description: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o lançamento: "${description}"?`)) return;
    try {
      await deleteFinancialEntry({ data: { id } });
      toast.success("Lançamento removido.");
      loadAllData();
    } catch (err) {
      toast.error("Erro ao remover lançamento.");
    }
  };

  // Salvar Taxa do Paciente (DRE)
  const handleSavePatientRate = async () => {
    if (!editingPatient) return;
    setSavingRate(true);
    try {
      await updatePatientBillingRate({
        data: {
          patientId: editingPatient.patientId,
          rateValue: Number(patientRate),
          billingType,
          insuranceName: insuranceName.trim() || undefined,
        },
      });
      toast.success("Taxa do paciente atualizada no D1!");
      toast.success("Taxa do paciente atualizada no banco!");
      setEditingPatient(null);
      loadData();
      loadAllData();
    } catch (err) {
      toast.error("Erro ao salvar taxa.");
    } finally {
      setSavingRate(false);
    }
  };

  // Salvar Repasse do Terapeuta (DRE)
  const handleSaveTherapistRate = async () => {
    if (!editingTherapist) return;
    setSavingTherapistRate(true);
    try {
      await updateTherapistPaymentRate({
        data: {
          userId: editingTherapist.therapistId,
          hourlyRate: Number(therapistRate),
        },
      });
      toast.success("Valor da hora do terapeuta atualizado no D1!");
      toast.success("Valor da hora do terapeuta atualizado!");
      setEditingTherapist(null);
      loadData();
      loadAllData();
    } catch (err) {
      toast.error("Erro ao salvar taxa.");
    } finally {
      setSavingTherapistRate(false);
    }
  };

  const getStatusBadge = (status: FinancialEntryStatus) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-medium">
            <CheckCircle2 className="size-3 mr-1 text-emerald-600" /> Liquidado
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-medium">
            <Calendar className="size-3 mr-1 text-amber-600" /> Pendente
          </Badge>
        );
      case "overdue":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-medium">
            <AlertTriangle className="size-3 mr-1 text-rose-600" /> Vencido
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 font-medium">
            Cancelado
          </Badge>
        );
    }
  };

  const formatCurrency = (val: number) => {
    return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    const parts = d.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return d;
  };

  return (
    <AppLayout>
      {/* ── CABEÇALHO & SELETOR DE PERÍODO ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <PageHeader
          title="Gestão Financeira e Repasse"
          subtitle="Consolidado automatizado de faturamento da clínica e repasses da equipe."
          title="Gestão Financeira & Fluxo de Caixa"
          subtitle="Controle integrado de contas a pagar, contas a receber, DRE analítico e repasses da clínica."
        />

        <Card className="w-full md:w-auto shrink-0 border-primary/20 shadow-xs">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Calendar className="size-4 text-primary" />
              Período:
        <div className="flex items-center gap-2">
          <Card className="shrink-0 border-primary/20 shadow-xs">
            <CardContent className="p-2.5 flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Calendar className="size-4 text-primary" />
                Competência:
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[125px] h-8 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">Janeiro</SelectItem>
                  <SelectItem value="02">Fevereiro</SelectItem>
                  <SelectItem value="03">Março</SelectItem>
                  <SelectItem value="04">Abril</SelectItem>
                  <SelectItem value="05">Maio</SelectItem>
                  <SelectItem value="06">Junho</SelectItem>
                  <SelectItem value="07">Julho</SelectItem>
                  <SelectItem value="08">Agosto</SelectItem>
                  <SelectItem value="09">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[85px] h-8 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── FAIXA DE KPIS EXECUTIVOS EM TEMPO REAL ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* KPI 1: Contas a Receber */}
        <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-emerald-700">
                Contas a Receber
              </span>
              <div className="size-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-700">
                <ArrowDownLeft className="size-4" />
              </div>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="01">Janeiro</SelectItem>
                <SelectItem value="02">Fevereiro</SelectItem>
                <SelectItem value="03">Março</SelectItem>
                <SelectItem value="04">Abril</SelectItem>
                <SelectItem value="05">Maio</SelectItem>
                <SelectItem value="06">Junho</SelectItem>
                <SelectItem value="07">Julho</SelectItem>
                <SelectItem value="08">Agosto</SelectItem>
                <SelectItem value="09">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-2">
              <p className="text-2xl font-bold text-emerald-950">
                {formatCurrency(kpis.totalReceivablePending + kpis.totalReceivableReceived)}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-emerald-500/15">
                <span className="text-emerald-700 font-medium">
                  Recebido: {formatCurrency(kpis.totalReceivableReceived)}
                </span>
                <span>Pendente: {formatCurrency(kpis.totalReceivablePending)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[90px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
        {/* KPI 2: Contas a Pagar */}
        <Card className="bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/20 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-rose-700">
                Contas a Pagar
              </span>
              <div className="size-8 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-700">
                <ArrowUpRight className="size-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-rose-950">
                {formatCurrency(kpis.totalPayablePending + kpis.totalPayablePaid)}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-rose-500/15">
                <span className="text-rose-700 font-medium">
                  Liquidado: {formatCurrency(kpis.totalPayablePaid)}
                </span>
                <span>A Pagar: {formatCurrency(kpis.totalPayablePending)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Saldo Operacional Líquido */}
        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-blue-700">
                Saldo Projetado
              </span>
              <div className="size-8 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-700">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className={cn("text-2xl font-bold", kpis.projectedBalance >= 0 ? "text-blue-950" : "text-rose-700")}>
                {formatCurrency(kpis.projectedBalance)}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-blue-500/15">
                <span className="font-medium text-foreground">
                  Realizado em Caixa: {formatCurrency(kpis.realizedBalance)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Contas Vencidas / Alertas */}
        <Card
          className={cn(
            "shadow-xs transition-colors",
            kpis.overdueCount > 0
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-muted/30 border-border/60",
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs font-semibold tracking-wider uppercase",
                  kpis.overdueCount > 0 ? "text-amber-800" : "text-muted-foreground",
                )}
              >
                Inadimplência / Atrasos
              </span>
              <div
                className={cn(
                  "size-8 rounded-full flex items-center justify-center",
                  kpis.overdueCount > 0 ? "bg-amber-500/20 text-amber-700" : "bg-muted text-muted-foreground",
                )}
              >
                {kpis.overdueCount > 0 ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
              </div>
            </div>
            <div className="mt-2">
              <p
                className={cn(
                  "text-2xl font-bold",
                  kpis.overdueCount > 0 ? "text-amber-950" : "text-foreground",
                )}
              >
                {formatCurrency(kpis.overdueTotal)}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-amber-500/15">
                <span className={kpis.overdueCount > 0 ? "text-amber-800 font-medium" : ""}>
                  {kpis.overdueCount === 0
                    ? "Nenhuma fatura em atraso"
                    : `${kpis.overdueCount} lançamento(s) vencido(s)`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-3">Calculando repasses e faturamento...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ── CARDS DE RESUMO FINANCEIRO ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Faturamento Bruto Previsto
                  </p>
                  <p className="text-3xl font-extrabold text-emerald-900 mt-1">
                    R$ {report.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-emerald-700/80 mt-1">
                    {report.patientBreakdown.reduce((a, b) => a + b.sessionsCount, 0)} sessões realizadas
                  </p>
      {/* ── NAVEGAÇÃO EM ABAS PRINCIPAIS ────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border/40 grid grid-cols-2 sm:grid-cols-4 w-full md:w-auto h-auto">
          <TabsTrigger value="receivables" className="flex items-center gap-2 py-2 text-xs font-semibold">
            <ArrowDownLeft className="size-3.5 text-emerald-600" />
            Contas a Receber
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-emerald-100 text-emerald-800">
              {entries.filter((e) => e.type === "receivable").length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="payables" className="flex items-center gap-2 py-2 text-xs font-semibold">
            <ArrowUpRight className="size-3.5 text-rose-600" />
            Contas a Pagar
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-rose-100 text-rose-800">
              {entries.filter((e) => e.type === "payable").length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="dre" className="flex items-center gap-2 py-2 text-xs font-semibold">
            <Receipt className="size-3.5 text-blue-600" />
            DRE & Repasses
          </TabsTrigger>

          <TabsTrigger value="rates" className="flex items-center gap-2 py-2 text-xs font-semibold">
            <Settings className="size-3.5 text-slate-600" />
            Configuração de Taxas
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ABA 1: CONTAS A RECEBER                                               */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="receivables" className="space-y-4 mt-2">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ArrowDownLeft className="size-5 text-emerald-600" />
                  Receitas & Mensalidades de Pacientes
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Faturas particulares, convênios médicos e coparticipações terapêuticas da clínica.
                </CardDescription>
              </div>

              <Button
                onClick={() => {
                  setNewEntryType("receivable");
                  setNewEntryCategory("Mensalidade Particular");
                  setNewEntryDueDate(`${selectedYear}-${selectedMonth}-10`);
                  setIsNewEntryOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 gap-1.5"
              >
                <PlusCircle className="size-4" />
                Nova Conta a Receber
              </Button>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Barra de Filtros */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por paciente, descrição..."
                    value={searchReceivable}
                    onChange={(e) => setSearchReceivable(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <DollarSign className="size-9 text-emerald-600 opacity-80" />
              </CardContent>
            </Card>

            <Card className="bg-rose-500/10 border-rose-500/20 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                    Total de Repasse aos Terapeutas
                  </p>
                  <p className="text-3xl font-extrabold text-rose-900 mt-1">
                    R$ {report.totalPayout.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-rose-700/80 mt-1">
                    {report.therapistBreakdown.reduce((a, b) => a + b.totalHours, 0)}h de atendimento
                  </p>
                <Select value={statusFilterReceivable} onValueChange={setStatusFilterReceivable}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="pending">Apenas Pendentes</SelectItem>
                    <SelectItem value="completed">Apenas Liquidados</SelectItem>
                    <SelectItem value="overdue">Apenas Vencidos</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-xs text-muted-foreground ml-auto">
                  Exibindo {filteredReceivables.length} faturas
                </div>
                <Users className="size-9 text-rose-600 opacity-80" />
              </CardContent>
            </Card>
              </div>

            <Card className="bg-primary-soft/40 border-primary/20 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Saldo Operacional da Clínica
                  </p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">
                    R$ {report.netBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Margem bruta de receita sobre custos
                  </p>
              {entriesLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground mt-2">Carregando contas a receber...</p>
                </div>
                <TrendingUp className="size-9 text-primary opacity-80" />
              </CardContent>
              ) : filteredReceivables.length === 0 ? (
                <div className="p-10 text-center border rounded-lg border-dashed text-muted-foreground">
                  <Coins className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Nenhum lançamento a receber encontrado.</p>
                  <p className="text-xs mt-1">Altere os filtros de pesquisa ou cadastre uma nova fatura.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Descrição / Categoria</TableHead>
                        <TableHead>Paciente Associado</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Forma Pgto.</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReceivables.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-muted/40">
                          <TableCell>{getStatusBadge(entry.status)}</TableCell>
                          <TableCell>
                            <p className="font-medium text-sm text-foreground">{entry.description}</p>
                            <p className="text-xs text-muted-foreground">{entry.category}</p>
                          </TableCell>
                          <TableCell>
                            {entry.patient_name ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs text-foreground">
                                  {entry.patient_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Geral / Sem paciente</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium">{formatDate(entry.due_date)}</span>
                            {entry.payment_date && (
                              <p className="text-[11px] text-emerald-700">
                                Rec. {formatDate(entry.payment_date)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="uppercase text-[10px] font-mono">
                              {entry.payment_method || "PIX"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            {formatCurrency(entry.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {entry.status !== "completed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setLiquidatingEntry(entry);
                                    setSettlementDate(new Date().toISOString().slice(0, 10));
                                    setSettlementMethod(entry.payment_method || "pix");
                                  }}
                                  className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 border-emerald-200"
                                >
                                  <Check className="size-3.5 mr-1" />
                                  Receber
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteEntry(entry.id, entry.description)}
                                className="size-7 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ABA 2: CONTAS A PAGAR                                                 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="payables" className="space-y-4 mt-2">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ArrowUpRight className="size-5 text-rose-600" />
                  Despesas Operacionais & Repasses da Clínica
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Aluguel, folha de repasses terapêuticos, materiais pedagógicos, softwares e manutenção.
                </CardDescription>
              </div>

              <Button
                onClick={() => {
                  setNewEntryType("payable");
                  setNewEntryCategory("Aluguel & Condomínio");
                  setNewEntryDueDate(`${selectedYear}-${selectedMonth}-10`);
                  setIsNewEntryOpen(true);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs h-9 gap-1.5"
              >
                <PlusCircle className="size-4" />
                Nova Conta a Pagar
              </Button>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Barra de Filtros */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por descrição, beneficiário..."
                    value={searchPayable}
                    onChange={(e) => setSearchPayable(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <Select value={statusFilterPayable} onValueChange={setStatusFilterPayable}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="pending">Apenas Pendentes</SelectItem>
                    <SelectItem value="completed">Apenas Liquidados</SelectItem>
                    <SelectItem value="overdue">Apenas Vencidos</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-xs text-muted-foreground ml-auto">
                  Exibindo {filteredPayables.length} despesas
                </div>
              </div>

              {entriesLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground mt-2">Carregando contas a pagar...</p>
                </div>
              ) : filteredPayables.length === 0 ? (
                <div className="p-10 text-center border rounded-lg border-dashed text-muted-foreground">
                  <Wallet className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Nenhuma despesa a pagar encontrada.</p>
                  <p className="text-xs mt-1">Altere os filtros de pesquisa ou cadastre uma nova despesa.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Descrição / Categoria</TableHead>
                        <TableHead>Beneficiário / Terapeuta</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Forma Pgto.</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayables.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-muted/40">
                          <TableCell>{getStatusBadge(entry.status)}</TableCell>
                          <TableCell>
                            <p className="font-medium text-sm text-foreground">{entry.description}</p>
                            <p className="text-xs text-muted-foreground">{entry.category}</p>
                          </TableCell>
                          <TableCell>
                            {entry.therapist_name ? (
                              <span className="font-medium text-xs text-foreground">
                                {entry.therapist_name}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Fornecedor Geral</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium">{formatDate(entry.due_date)}</span>
                            {entry.payment_date && (
                              <p className="text-[11px] text-emerald-700">
                                Pago {formatDate(entry.payment_date)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="uppercase text-[10px] font-mono">
                              {entry.payment_method || "Transferência"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-rose-700">
                            {formatCurrency(entry.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {entry.status !== "completed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setLiquidatingEntry(entry);
                                    setSettlementDate(new Date().toISOString().slice(0, 10));
                                    setSettlementMethod(entry.payment_method || "transferencia");
                                  }}
                                  className="h-7 px-2 text-xs text-rose-700 hover:bg-rose-50 hover:border-rose-300 border-rose-200"
                                >
                                  <Check className="size-3.5 mr-1" />
                                  Pagar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteEntry(entry.id, entry.description)}
                                className="size-7 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ABA 3: DRE & REPASSES ANALÍTICOS (PRODUÇÃO TERAPÊUTICA)               */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="dre" className="space-y-6 mt-2">
          {reportLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="size-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-3">Calculando repasses e faturamento por atendimentos...</p>
            </Card>
          </div>
          ) : (
            <div className="space-y-6">
              {/* DRE Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-xs">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                        Receita Bruta Prevista (Atendimentos)
                      </p>
                      <p className="text-3xl font-extrabold text-emerald-900 mt-1">
                        {formatCurrency(report.totalRevenue)}
                      </p>
                      <p className="text-[11px] text-emerald-700/80 mt-1">
                        {report.patientBreakdown.reduce((a, b) => a + b.sessionsCount, 0)} sessões realizadas
                      </p>
                    </div>
                    <DollarSign className="size-9 text-emerald-600 opacity-80" />
                  </CardContent>
                </Card>

          {/* Modal / Card Inline de Edição de Taxa do Paciente */}
          {editingPatient && (
            <Card className="border-primary/40 bg-primary-soft/30">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Edit2 className="size-4 text-primary" />
                  Configurar Taxa de Cobrança · {editingPatient.patientName}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Tipo de Cobrança</Label>
                    <Select
                      value={billingType}
                      onValueChange={(val) => setBillingType(val as "particular" | "convenio")}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="particular">Particular</SelectItem>
                        <SelectItem value="convenio">Convênio Médico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                <Card className="bg-rose-500/10 border-rose-500/20 shadow-xs">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                        Custo Estimado de Repasse da Equipe
                      </p>
                      <p className="text-3xl font-extrabold text-rose-900 mt-1">
                        {formatCurrency(report.totalPayout)}
                      </p>
                      <p className="text-[11px] text-rose-700/80 mt-1">
                        {report.therapistBreakdown.reduce((a, b) => a + b.totalHours, 0)}h de atendimento
                      </p>
                    </div>
                    <Users className="size-9 text-rose-600 opacity-80" />
                  </CardContent>
                </Card>

                  {billingType === "convenio" && (
                <Card className="bg-primary-soft/40 border-primary/20 shadow-xs">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <Label className="text-xs mb-1 block">Nome do Convênio</Label>
                      <Input
                        placeholder="Ex: Unimed, Bradesco..."
                        value={insuranceName}
                        onChange={(e) => setInsuranceName(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Margem de Contribuição Operacional
                      </p>
                      <p className="text-3xl font-extrabold text-foreground mt-1">
                        {formatCurrency(report.netBalance)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Receita de sessões deduzida dos custos diretos
                      </p>
                    </div>
                  )}
                    <TrendingUp className="size-9 text-primary opacity-80" />
                  </CardContent>
                </Card>
              </div>

                  <div>
                    <Label className="text-xs mb-1 block">Valor por Sessão (R$)</Label>
                    <Input
                      type="number"
                      step="5"
                      value={patientRate}
                      onChange={(e) => setPatientRate(Number(e.target.value))}
                      className="h-8 text-xs"
                    />
              {/* TABELA: Faturamento por Paciente */}
              <Card className="shadow-xs">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    Faturamento por Paciente (Convênios & Particulares)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Diagnóstico</TableHead>
                          <TableHead>Modalidade</TableHead>
                          <TableHead>Sessões no Mês</TableHead>
                          <TableHead>Valor / Sessão</TableHead>
                          <TableHead>Subtotal Previsto</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.patientBreakdown.map((item) => (
                          <TableRow key={item.patientId}>
                            <TableCell className="font-medium text-sm">{item.patientName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.diagnosis}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  item.billingType === "convenio"
                                    ? "bg-purple-100 text-purple-700 border-0"
                                    : "bg-blue-100 text-blue-700 border-0"
                                }
                              >
                                {item.billingType === "convenio"
                                  ? `Convênio (${item.insuranceName || "Geral"})`
                                  : "Particular"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{item.sessionsCount}</TableCell>
                            <TableCell>{formatCurrency(item.rateValue)}</TableCell>
                            <TableCell className="font-bold text-foreground">
                              {formatCurrency(item.subtotal)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingPatient(item);
                                  setPatientRate(item.rateValue);
                                  setBillingType(item.billingType);
                                  setInsuranceName(item.insuranceName || "");
                                }}
                                className="size-7"
                              >
                                <Edit2 className="size-3.5 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* TABELA: Repasse por Terapeuta */}
              <Card className="shadow-xs">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="size-4 text-rose-600" />
                    Repasse Estimado da Equipe Terapêutica
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Profissional / Terapeuta</TableHead>
                          <TableHead>Sessões Realizadas</TableHead>
                          <TableHead>Horas de Atendimento</TableHead>
                          <TableHead>Valor Hora/Aula</TableHead>
                          <TableHead>Montante de Repasse</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.therapistBreakdown.map((item) => (
                          <TableRow key={item.therapistId}>
                            <TableCell className="font-medium text-sm">{item.therapistName}</TableCell>
                            <TableCell className="font-medium">{item.totalSessions}</TableCell>
                            <TableCell>{item.totalHours}h ({item.totalMinutes} min)</TableCell>
                            <TableCell>{formatCurrency(item.hourlyRate)} /h</TableCell>
                            <TableCell className="font-bold text-rose-700">
                              {formatCurrency(item.totalPayout)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingTherapist(item);
                                  setTherapistRate(item.hourlyRate);
                                }}
                                className="size-7"
                              >
                                <Edit2 className="size-3.5 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ABA 4: CONFIGURAÇÃO DE TAXAS E PREÇOS                                 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="rates" className="space-y-6 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bloco 1: Taxas de Pacientes */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  Taxas de Cobrança por Paciente
                </CardTitle>
                <CardDescription className="text-xs">
                  Ajuste o valor contratual cobrado por sessão clínica de cada paciente.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {report.patientBreakdown.map((item) => (
                    <div
                      key={item.patientId}
                      className="p-3 border rounded-lg flex items-center justify-between gap-3 hover:bg-muted/30"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.billingType === "convenio" ? `Convênio: ${item.insuranceName || "Geral"}` : "Particular"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">{formatCurrency(item.rateValue)}/sessão</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPatient(item);
                            setPatientRate(item.rateValue);
                            setBillingType(item.billingType);
                            setInsuranceName(item.insuranceName || "");
                          }}
                          className="h-7 text-xs"
                        >
                          <Edit2 className="size-3 mr-1" /> Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingPatient(null)} className="h-7 text-xs">
                    Cancelar
                  </Button>
                  <Button onClick={handleSavePatientRate} disabled={savingRate} size="sm" className="h-7 text-xs">
                    {savingRate ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5 mr-1" />}
                    Salvar Valor
                  </Button>
            {/* Bloco 2: Taxas de Terapeutas */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="size-4 text-rose-600" />
                  Taxa Horária da Equipe (Repasse)
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure o valor base da hora de atendimento repassada aos profissionais.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {report.therapistBreakdown.map((item) => (
                    <div
                      key={item.therapistId}
                      className="p-3 border rounded-lg flex items-center justify-between gap-3 hover:bg-muted/30"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.therapistName}</p>
                        <p className="text-xs text-muted-foreground">Terapeuta Responsável ABA</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm text-rose-700">
                          {formatCurrency(item.hourlyRate)}/h
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTherapist(item);
                            setTherapistRate(item.hourlyRate);
                          }}
                          className="h-7 text-xs"
                        >
                          <Edit2 className="size-3 mr-1" /> Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </TabsContent>
      </Tabs>

          {/* Modal / Card Inline de Edição de Repasse do Terapeuta */}
          {editingTherapist && (
            <Card className="border-rose-300 bg-rose-50/50">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Edit2 className="size-4 text-rose-600" />
                  Configurar Taxa Horária de Repasse · {editingTherapist.therapistName}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Valor da Hora/Aula (R$ / hora)</Label>
                    <Input
                      type="number"
                      step="5"
                      value={therapistRate}
                      onChange={(e) => setTherapistRate(Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CRIAR LANÇAMENTO FINANCEIRO (PAGAR OU RECEBER)                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleCreateEntry}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                {newEntryType === "receivable" ? (
                  <>
                    <ArrowDownLeft className="size-5 text-emerald-600" />
                    Nova Conta a Receber
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="size-5 text-rose-600" />
                    Nova Conta a Pagar
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Cadastre a fatura ou despesa no fluxo financeiro da clínica ABA.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Tipo de Operação */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={newEntryType === "receivable" ? "default" : "outline"}
                  onClick={() => {
                    setNewEntryType("receivable");
                    setNewEntryCategory("Mensalidade Particular");
                  }}
                  className={cn(
                    "h-9 text-xs font-semibold",
                    newEntryType === "receivable" && "bg-emerald-600 hover:bg-emerald-700",
                  )}
                >
                  <ArrowDownLeft className="size-3.5 mr-1" /> A Receber (Receita)
                </Button>
                <Button
                  type="button"
                  variant={newEntryType === "payable" ? "default" : "outline"}
                  onClick={() => {
                    setNewEntryType("payable");
                    setNewEntryCategory("Aluguel & Condomínio");
                  }}
                  className={cn(
                    "h-9 text-xs font-semibold",
                    newEntryType === "payable" && "bg-rose-600 hover:bg-rose-700",
                  )}
                >
                  <ArrowUpRight className="size-3.5 mr-1" /> A Pagar (Despesa)
                </Button>
              </div>

              {/* Paciente (se A Receber) ou Terapeuta (se A Pagar) */}
              {newEntryType === "receivable" ? (
                <div>
                  <Label className="text-xs font-medium mb-1 block">Paciente Associado</Label>
                  <Select value={newEntryPatientId} onValueChange={setNewEntryPatientId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione o paciente (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (Receita Geral / Outros)</SelectItem>
                      {patientsList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.diagnosis})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-medium mb-1 block">Terapeuta Associado (se for repasse)</Label>
                  <Select value={newEntryTherapistId} onValueChange={setNewEntryTherapistId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione o profissional (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Fornecedor / Terceiro Externo</SelectItem>
                      <SelectItem value="u-therapist-01">Dra. Ana Beatriz Lopes</SelectItem>
                      <SelectItem value="u-therapist-02">Carla Mendes</SelectItem>
                      <SelectItem value="u-therapist-03">Diego Ramos</SelectItem>
                      <SelectItem value="u-therapist-04">Fernanda Souza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingTherapist(null)} className="h-7 text-xs">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveTherapistRate} disabled={savingTherapistRate} size="sm" className="h-7 text-xs">
                    {savingTherapistRate ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5 mr-1" />}
                    Salvar Repasse
                  </Button>
              {/* Categoria */}
              <div>
                <Label className="text-xs font-medium mb-1 block">Categoria Financeira</Label>
                <Select value={newEntryCategory} onValueChange={setNewEntryCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {newEntryType === "receivable" ? (
                      <>
                        <SelectItem value="Mensalidade Particular">Mensalidade Particular</SelectItem>
                        <SelectItem value="Faturamento Convênio">Faturamento Convênio</SelectItem>
                        <SelectItem value="Coparticipação Terapêutica">Coparticipação Terapêutica</SelectItem>
                        <SelectItem value="Avaliação Inicial / Laudo">Avaliação Inicial / Laudo</SelectItem>
                        <SelectItem value="Outras Receitas">Outras Receitas</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="Aluguel & Condomínio">Aluguel & Condomínio</SelectItem>
                        <SelectItem value="Repasse Terapeuta">Repasse Terapeuta</SelectItem>
                        <SelectItem value="Software & Sistemas">Software & Sistemas</SelectItem>
                        <SelectItem value="Material Clínico & Pedagógico">Material Clínico & Pedagógico</SelectItem>
                        <SelectItem value="Limpeza & Manutenção">Limpeza & Manutenção</SelectItem>
                        <SelectItem value="Impostos & Tributos">Impostos & Tributos</SelectItem>
                        <SelectItem value="Outras Despesas">Outras Despesas</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Descrição */}
              <div>
                <Label className="text-xs font-medium mb-1 block">Descrição do Lançamento *</Label>
                <Input
                  placeholder={
                    newEntryType === "receivable"
                      ? "Ex: Mensalidade Setembro - Terapia ABA 40h"
                      : "Ex: Aluguel da Clínica - Unidade Jardins"
                  }
                  value={newEntryDescription}
                  onChange={(e) => setNewEntryDescription(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Valor e Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Valor (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={newEntryAmount || ""}
                    onChange={(e) => setNewEntryAmount(Number(e.target.value))}
                    className="h-9 text-xs font-semibold"
                    required
                  />
                </div>
              </CardContent>
            </Card>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Data de Vencimento *</Label>
                  <Input
                    type="date"
                    value={newEntryDueDate}
                    onChange={(e) => setNewEntryDueDate(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Forma de Pagamento Prevista */}
              <div>
                <Label className="text-xs font-medium mb-1 block">Método de Liquidação Previsto</Label>
                <Select
                  value={newEntryPaymentMethod}
                  onValueChange={(val) => setNewEntryPaymentMethod(val as FinancialPaymentMethod)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto Bancário</SelectItem>
                    <SelectItem value="cartao">Cartão de Crédito / Débito</SelectItem>
                    <SelectItem value="transferencia">Transferência Bancária (TED/DOC)</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro / Espécie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Observações */}
              <div>
                <Label className="text-xs font-medium mb-1 block">Observações / Dados de Fatura</Label>
                <Textarea
                  placeholder="Informações adicionais, número de nota fiscal, guias TISS, etc."
                  value={newEntryNotes}
                  onChange={(e) => setNewEntryNotes(e.target.value)}
                  className="text-xs resize-none h-16"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsNewEntryOpen(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingEntry}
                className={cn(
                  "h-8 text-xs font-semibold text-white",
                  newEntryType === "receivable"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700",
                )}
              >
                {isSubmittingEntry ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5 mr-1" />
                )}
                Salvar Lançamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: LIQUIDAÇÃO / CONFIRMAR PAGAMENTO OU RECEBIMENTO                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!liquidatingEntry} onOpenChange={(open) => !open && setLiquidatingEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-5 text-emerald-600" />
              {liquidatingEntry?.type === "receivable" ? "Confirmar Recebimento" : "Confirmar Pagamento"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Dê baixa nesta fatura para atualizar o fluxo de caixa realizado da clínica.
            </DialogDescription>
          </DialogHeader>

          {liquidatingEntry && (
            <div className="space-y-4 py-3">
              <div className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1">
                <p className="font-semibold text-sm text-foreground">{liquidatingEntry.description}</p>
                <p className="text-muted-foreground">
                  Valor:{" "}
                  <span className="font-bold text-foreground">{formatCurrency(liquidatingEntry.amount)}</span>
                </p>
                <p className="text-muted-foreground">
                  Vencimento original: {formatDate(liquidatingEntry.due_date)}
                </p>
              </div>

              <div>
                <Label className="text-xs font-medium mb-1 block">Data do Pagamento / Efetivação</Label>
                <Input
                  type="date"
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium mb-1 block">Forma de Pagamento Utilizada</Label>
                <Select
                  value={settlementMethod}
                  onValueChange={(val) => setSettlementMethod(val as FinancialPaymentMethod)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto Bancário</SelectItem>
                    <SelectItem value="cartao">Cartão de Crédito / Débito</SelectItem>
                    <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ── TABELA 1: FATURAMENTO POR PACIENTE ────────────────────────────── */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                Faturamento por Paciente (Convenio & Particular)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Sessões no Mês</TableHead>
                      <TableHead>Valor / Sessão</TableHead>
                      <TableHead>Subtotal Previsto</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.patientBreakdown.map((item) => (
                      <TableRow key={item.patientId}>
                        <TableCell className="font-medium text-sm">{item.patientName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.diagnosis}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              item.billingType === "convenio"
                                ? "bg-purple-100 text-purple-700 border-0"
                                : "bg-blue-100 text-blue-700 border-0"
                            }
                          >
                            {item.billingType === "convenio"
                              ? `Convênio (${item.insuranceName || "Geral"})`
                              : "Particular"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.sessionsCount}</TableCell>
                        <TableCell>R$ {item.rateValue.toFixed(2)}</TableCell>
                        <TableCell className="font-bold text-foreground">
                          R$ {item.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingPatient(item);
                              setPatientRate(item.rateValue);
                              setBillingType(item.billingType);
                              setInsuranceName(item.insuranceName || "");
                            }}
                            className="size-7"
                          >
                            <Edit2 className="size-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLiquidatingEntry(null)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSettlement}
              disabled={isSettling}
              className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSettling ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 mr-1" />}
              Confirmar Baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAIS INLINE DE TAXAS (PACIENTE E TERAPEUTA)                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {editingPatient && (
        <Dialog open={!!editingPatient} onOpenChange={(open) => !open && setEditingPatient(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Edit2 className="size-4 text-primary" />
                Configurar Taxa · {editingPatient.patientName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs mb-1 block">Tipo de Cobrança</Label>
                <Select
                  value={billingType}
                  onValueChange={(val) => setBillingType(val as "particular" | "convenio")}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particular">Particular</SelectItem>
                    <SelectItem value="convenio">Convênio Médico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* ── TABELA 2: REPASSE POR TERAPEUTA ──────────────────────────────── */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="size-4 text-rose-600" />
                Repasse da Equipe Terapêutica
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional / Terapeuta</TableHead>
                      <TableHead>Sessões Realizadas</TableHead>
                      <TableHead>Horas de Atendimento</TableHead>
                      <TableHead>Valor Hora/Aula (R$/h)</TableHead>
                      <TableHead>Montante de Repasse</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.therapistBreakdown.map((item) => (
                      <TableRow key={item.therapistId}>
                        <TableCell className="font-medium text-sm">{item.therapistName}</TableCell>
                        <TableCell className="font-medium">{item.totalSessions}</TableCell>
                        <TableCell>{item.totalHours}h ({item.totalMinutes} min)</TableCell>
                        <TableCell>R$ {item.hourlyRate.toFixed(2)} /h</TableCell>
                        <TableCell className="font-bold text-rose-700">
                          R$ {item.totalPayout.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTherapist(item);
                              setTherapistRate(item.hourlyRate);
                            }}
                            className="size-7"
                          >
                            <Edit2 className="size-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              {billingType === "convenio" && (
                <div>
                  <Label className="text-xs mb-1 block">Nome do Convênio</Label>
                  <Input
                    placeholder="Ex: Unimed, Bradesco..."
                    value={insuranceName}
                    onChange={(e) => setInsuranceName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs mb-1 block">Valor por Sessão (R$)</Label>
                <Input
                  type="number"
                  step="5"
                  value={patientRate}
                  onChange={(e) => setPatientRate(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setEditingPatient(null)} className="h-8 text-xs">
                Cancelar
              </Button>
              <Button onClick={handleSavePatientRate} disabled={savingRate} size="sm" className="h-8 text-xs">
                {savingRate ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5 mr-1" />}
                Salvar Valor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {editingTherapist && (
        <Dialog open={!!editingTherapist} onOpenChange={(open) => !open && setEditingTherapist(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Edit2 className="size-4 text-rose-600" />
                Configurar Repasse · {editingTherapist.therapistName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs mb-1 block">Valor da Hora/Aula (R$ / hora)</Label>
                <Input
                  type="number"
                  step="5"
                  value={therapistRate}
                  onChange={(e) => setTherapistRate(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setEditingTherapist(null)} className="h-8 text-xs">
                Cancelar
              </Button>
              <Button onClick={handleSaveTherapistRate} disabled={savingTherapistRate} size="sm" className="h-8 text-xs">
                {savingTherapistRate ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5 mr-1" />}
                Salvar Repasse
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}

