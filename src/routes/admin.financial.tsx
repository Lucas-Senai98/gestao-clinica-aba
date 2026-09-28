import { createFileRoute } from "@tanstack/react-router";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { requireRole } from "@/lib/route-guard";
import { requirePermission } from "@/lib/route-guard";
import { AppLayout, PageHeader } from "@/components/app-layout";
import {
  createFinancialEntry,
  deleteFinancialEntry,
  getFinancialEntries,
  getFinancialReport,
  getFinancialSummaryKPIs,
  getCashClosingOverview,
  saveCashClosing,
  type PatientBillingItem,
  type TherapistPayoutItem,
  updateFinancialEntryStatus,
} from "@/queries/financial";
import { getPatients } from "@/queries/patients";
import { getClinicTeam } from "@/queries/team";
import type {
  FinancialEntryStatus,
  FinancialEntryType,
  FinancialEntryWithRelations,
  FinancialPaymentMethod,
  FinancialSummaryKPIs,
  PatientSummary,
  CashClosingWithUser,
} from "@/db/types";
import { useCurrentUser } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Calculator, CheckCircle2, FileDown, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/financial")({
  beforeLoad: requirePermission("financial:view"),
  head: () => ({
    meta: [
      { title: "Gestão Financeira — Gestão Clínica ABA" },
      { name: "description", content: "Fluxo de caixa, contas a pagar, contas a receber e repasses da clínica." },
    ],
  }),
  component: AdminFinancialPage,
});

const statusLabel: Record<FinancialEntryStatus, string> = {
  pending: "Pendente",
  completed: "Liquidado",
  overdue: "Atrasado",
  cancelled: "Cancelado",
};

const statusTone: Record<FinancialEntryStatus, string> = {
  pending: "bg-warning/20 text-warning-foreground border-0",
  completed: "bg-success/15 text-success border-0",
  overdue: "bg-destructive/10 text-destructive border-0",
  cancelled: "bg-muted text-muted-foreground border-0",
};

const paymentLabel: Record<FinancialPaymentMethod, string> = {
  pix: "PIX",
  boleto: "Boleto",
  cartao: "Cartão",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
};

const emptyKpis: FinancialSummaryKPIs = {
  totalReceivablePending: 0,
  totalReceivableReceived: 0,
  totalPayablePending: 0,
  totalPayablePaid: 0,
  projectedBalance: 0,
  realizedBalance: 0,
  overdueCount: 0,
  overdueTotal: 0,
};

function currency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function AdminFinancialPage() {
  const currentUser = useCurrentUser();
  const [month, setMonth] = useState(currentMonth());
  const [type, setType] = useState<FinancialEntryType | "all">("all");
  const [status, setStatus] = useState<FinancialEntryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entries, setEntries] = useState<FinancialEntryWithRelations[]>([]);
  const [kpis, setKpis] = useState<FinancialSummaryKPIs>(emptyKpis);
  const [cashClosing, setCashClosing] = useState<{
    preview: {
      totalInflows: number;
      totalOutflows: number;
      pendingReceivables: number;
      pendingPayables: number;
      overdueTotal: number;
      expectedBalance: number;
      countedBalance: number;
      difference: number;
      entriesCount: number;
    };
    closing: CashClosingWithUser | null;
    history: CashClosingWithUser[];
  }>({
    preview: {
      totalInflows: 0,
      totalOutflows: 0,
      pendingReceivables: 0,
      pendingPayables: 0,
      overdueTotal: 0,
      expectedBalance: 0,
      countedBalance: 0,
      difference: 0,
      entriesCount: 0,
    },
    closing: null,
    history: [],
  });
  const [closingForm, setClosingForm] = useState({
    openingBalance: "0",
    countedBalance: "0",
    notes: "",
  });
  const [closingSaving, setClosingSaving] = useState(false);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [team, setTeam] = useState<Array<{ id: string; name: string }>>([]);
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
  const [form, setForm] = useState({
    type: "receivable" as FinancialEntryType,
    category: "",
    description: "",
    amount: "",
    dueDate: new Date().toISOString().slice(0, 10),
    patientId: "none",
    therapistId: "none",
    paymentMethod: "pix" as FinancialPaymentMethod,
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [entriesData, kpiData, reportData, closingData, patientsData, teamData] = await Promise.all([
        getFinancialEntries({
          data: {
            month,
            type: type === "all" ? undefined : type,
            status: status === "all" ? undefined : status,
            search: search.trim() || undefined,
          },
        }),
        getFinancialSummaryKPIs({ data: { month } }),
        getFinancialReport({ data: { month, year: Number(month.slice(0, 4)) } }),
        getCashClosingOverview({ data: { month } }),
        currentUser ? getPatients({ data: { role: "admin", userId: currentUser.id } }).catch(() => []) : Promise.resolve([]),
        getClinicTeam().catch(() => []),
      ]);
      setEntries(entriesData || []);
      setKpis(kpiData || emptyKpis);
      setReport(reportData || report);
      setCashClosing({
        preview: closingData?.preview || cashClosing.preview,
        closing: closingData?.closing || null,
        history: closingData?.history || [],
      });
      const savedClosing = closingData?.closing;
      if (savedClosing) {
        setClosingForm({
          openingBalance: String(savedClosing.opening_balance),
          countedBalance: String(savedClosing.counted_balance),
          notes: savedClosing.notes || "",
        });
      } else {
        const expected = closingData?.preview?.expectedBalance ?? 0;
        setClosingForm((prev) => ({
          ...prev,
          openingBalance: "0",
          countedBalance: String(expected),
        }));
      }
      setPatients(patientsData || []);
      setTeam((teamData || []).map((m: any) => ({ id: m.id, name: m.name })));
    } catch (err) {
      toast.error("Erro ao carregar financeiro", { description: err instanceof Error ? err.message : "Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month, type, status]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount.replace(",", "."));
    if (!amount || amount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSaving(true);
    try {
      await createFinancialEntry({
        data: {
          type: form.type,
          category: form.category,
          description: form.description,
          amount,
          dueDate: form.dueDate,
          patientId: form.patientId === "none" ? null : form.patientId,
          therapistId: form.therapistId === "none" ? null : form.therapistId,
          paymentMethod: form.paymentMethod,
          notes: form.notes || null,
        },
      });
      toast.success("Lançamento financeiro criado.");
      setDialogOpen(false);
      setForm((prev) => ({ ...prev, category: "", description: "", amount: "", notes: "" }));
      load();
    } catch (err) {
      toast.error("Erro ao criar lançamento", { description: err instanceof Error ? err.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (entry: FinancialEntryWithRelations, nextStatus: FinancialEntryStatus) => {
    try {
      await updateFinancialEntryStatus({
        data: {
          id: entry.id,
          status: nextStatus,
          paymentDate: nextStatus === "completed" ? new Date().toISOString().slice(0, 10) : null,
          paymentMethod: entry.payment_method || "pix",
        },
      });
      toast.success("Status atualizado.");
      load();
    } catch (err) {
      toast.error("Erro ao atualizar status", { description: err instanceof Error ? err.message : "Tente novamente." });
    }
  };

  const remove = async (entry: FinancialEntryWithRelations) => {
    if (!confirm(`Excluir "${entry.description}"?`)) return;
    try {
      await deleteFinancialEntry({ data: { id: entry.id } });
      toast.success("Lançamento excluído.");
      load();
    } catch (err) {
      toast.error("Erro ao excluir lançamento", { description: err instanceof Error ? err.message : "Tente novamente." });
    }
  };

  const currentExpectedBalance = Math.round(
    ((Number(closingForm.openingBalance.replace(",", ".")) || 0) +
      cashClosing.preview.totalInflows -
      cashClosing.preview.totalOutflows) * 100,
  ) / 100;

  const closingDifference = Math.round(
    ((Number(closingForm.countedBalance.replace(",", ".")) || 0) - currentExpectedBalance) * 100,
  ) / 100;

  const closeCash = async () => {
    const openingBalance = Number(closingForm.openingBalance.replace(",", "."));
    const countedBalance = Number(closingForm.countedBalance.replace(",", "."));
    if (Number.isNaN(openingBalance) || Number.isNaN(countedBalance)) {
      toast.error("Informe valores válidos para o fechamento.");
      return;
    }

    setClosingSaving(true);
    try {
      await saveCashClosing({
        data: {
          month,
          openingBalance,
          countedBalance,
          notes: closingForm.notes || null,
        },
      });
      toast.success("Fechamento de caixa salvo.");
      load();
    } catch (err) {
      toast.error("Erro ao fechar caixa", { description: err instanceof Error ? err.message : "Tente novamente." });
    } finally {
      setClosingSaving(false);
    }
  };

  const downloadClosing = () => {
    const lines = [
      "Fechamento de caixa",
      `Periodo;${monthLabel(month)}`,
      `Entradas realizadas;${cashClosing.preview.totalInflows.toFixed(2)}`,
      `Saidas realizadas;${cashClosing.preview.totalOutflows.toFixed(2)}`,
      `Saldo inicial;${closingForm.openingBalance.replace(",", ".")}`,
      `Saldo esperado;${currentExpectedBalance.toFixed(2)}`,
      `Saldo contado;${(Number(closingForm.countedBalance.replace(",", ".")) || 0).toFixed(2)}`,
      `Diferenca;${closingDifference.toFixed(2)}`,
      `A receber pendente;${cashClosing.preview.pendingReceivables.toFixed(2)}`,
      `A pagar pendente;${cashClosing.preview.pendingPayables.toFixed(2)}`,
      `Vencidos;${cashClosing.preview.overdueTotal.toFixed(2)}`,
      `Lancamentos no periodo;${cashClosing.preview.entriesCount}`,
      `Observacoes;${closingForm.notes.replace(/\n/g, " ")}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fechamento-caixa-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <PageHeader title="Gestão financeira" subtitle="Controle contas a receber, contas a pagar, recebimentos, despesas e repasses." />

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Kpi title="A receber" value={currency(kpis.totalReceivablePending)} tone="text-primary" />
          <Kpi title="Recebido" value={currency(kpis.totalReceivableReceived)} tone="text-success" />
          <Kpi title="A pagar" value={currency(kpis.totalPayablePending)} tone="text-warning-foreground" />
          <Kpi title="Saldo realizado" value={currency(kpis.realizedBalance)} tone={kpis.realizedBalance >= 0 ? "text-success" : "text-destructive"} />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-base">Fluxo de caixa</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="sm:w-40" />
                <Select value={type} onValueChange={(v) => setType(v as FinancialEntryType | "all")}>
                  <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="receivable">A receber</SelectItem>
                    <SelectItem value="payable">A pagar</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={(v) => setStatus(v as FinancialEntryStatus | "all")}>
                  <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="completed">Liquidado</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setDialogOpen(true)}>
                  <PlusCircle className="size-4" /> Novo
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Buscar por descrição, categoria, paciente ou profissional"
              />
              <Button variant="outline" onClick={load}>Buscar</Button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto mb-2 size-5 animate-spin text-primary" />
                Carregando lançamentos...
              </div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado para os filtros selecionados.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge variant="outline" className={entry.type === "receivable" ? "text-success" : "text-destructive"}>
                            {entry.type === "receivable" ? <ArrowDownLeft className="mr-1 size-3" /> : <ArrowUpRight className="mr-1 size-3" />}
                            {entry.type === "receivable" ? "Receber" : "Pagar"}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[260px]">
                          <p className="font-medium">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.category}
                            {entry.patient_name ? ` • ${entry.patient_name}` : ""}
                            {entry.therapist_name ? ` • ${entry.therapist_name}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>{new Date(`${entry.due_date}T00:00:00`).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px]", statusTone[entry.status])}>{statusLabel[entry.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{currency(Number(entry.amount))}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {entry.status !== "completed" && (
                              <Button size="icon" variant="ghost" onClick={() => updateStatus(entry, "completed")} aria-label="Liquidar">
                                <CheckCircle2 className="size-4 text-success" />
                              </Button>
                            )}
                            {entry.status !== "cancelled" && (
                              <Button size="icon" variant="ghost" onClick={() => updateStatus(entry, "cancelled")} aria-label="Cancelar">
                                <AlertTriangle className="size-4 text-warning-foreground" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => remove(entry)} aria-label="Excluir">
                              <Trash2 className="size-4 text-destructive" />
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

        <Tabs defaultValue="closing">
          <TabsList>
            <TabsTrigger value="closing">Fechamento de caixa</TabsTrigger>
            <TabsTrigger value="patients">Faturamento por paciente</TabsTrigger>
            <TabsTrigger value="team">Repasses</TabsTrigger>
          </TabsList>
          <TabsContent value="closing" className="mt-3">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calculator className="size-4 text-primary" />
                        Fechamento de {monthLabel(month)}
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Confira entradas, saídas, pendências e saldo contado antes de salvar o fechamento.
                      </p>
                    </div>
                    {cashClosing.closing && (
                      <Badge className="w-fit bg-success/15 text-success border-0">
                        Fechado em {new Date(cashClosing.closing.closed_at.replace(" ", "T")).toLocaleDateString("pt-BR")}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Kpi title="Entradas realizadas" value={currency(cashClosing.preview.totalInflows)} tone="text-success" />
                    <Kpi title="Saídas realizadas" value={currency(cashClosing.preview.totalOutflows)} tone="text-destructive" />
                    <Kpi title="Saldo esperado" value={currency(currentExpectedBalance)} tone={currentExpectedBalance >= 0 ? "text-success" : "text-destructive"} />
                    <Kpi title="Diferença" value={currency(closingDifference)} tone={closingDifference === 0 ? "text-muted-foreground" : closingDifference > 0 ? "text-success" : "text-destructive"} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Saldo inicial do caixa">
                      <Input
                        inputMode="decimal"
                        value={closingForm.openingBalance}
                        onChange={(e) => setClosingForm({ ...closingForm, openingBalance: e.target.value })}
                      />
                    </Field>
                    <Field label="Saldo contado no caixa">
                      <Input
                        inputMode="decimal"
                        value={closingForm.countedBalance}
                        onChange={(e) => setClosingForm({ ...closingForm, countedBalance: e.target.value })}
                      />
                    </Field>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Lançamentos considerados</p>
                      <p className="mt-1 text-xl font-bold">{cashClosing.preview.entriesCount}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Kpi title="A receber pendente" value={currency(cashClosing.preview.pendingReceivables)} tone="text-primary" />
                    <Kpi title="A pagar pendente" value={currency(cashClosing.preview.pendingPayables)} tone="text-warning-foreground" />
                    <Kpi title="Vencidos" value={currency(cashClosing.preview.overdueTotal)} tone={cashClosing.preview.overdueTotal > 0 ? "text-destructive" : "text-muted-foreground"} />
                  </div>

                  <Field label="Observações do fechamento">
                    <Textarea
                      rows={4}
                      value={closingForm.notes}
                      onChange={(e) => setClosingForm({ ...closingForm, notes: e.target.value })}
                      placeholder="Ex.: divergência conferida, comprovantes pendentes, sangria, dinheiro em espécie, observações bancárias..."
                    />
                  </Field>

                  <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={downloadClosing}>
                      <FileDown className="size-4" /> Baixar CSV
                    </Button>
                    <Button type="button" onClick={closeCash} disabled={closingSaving}>
                      {closingSaving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      {cashClosing.closing ? "Atualizar fechamento" : "Fechar caixa"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Histórico de fechamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {cashClosing.history.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Nenhum fechamento salvo ainda.</p>
                  ) : (
                    <div className="divide-y">
                      {cashClosing.history.map((item) => (
                        <div key={item.id} className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium capitalize">{monthLabel(item.period_month)}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.closed_by_name || "Administrador"} • {new Date(item.closed_at.replace(" ", "T")).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            <Badge className={cn("border-0", item.difference === 0 ? "bg-muted text-muted-foreground" : item.difference > 0 ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive")}>
                              {currency(item.difference)}
                            </Badge>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <span>Esperado: {currency(item.expected_balance)}</span>
                            <span>Contado: {currency(item.counted_balance)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="patients" className="mt-3">
            <BreakdownCard
              title={`Receita prevista: ${currency(report.totalRevenue)}`}
              rows={report.patientBreakdown.map((p) => ({
                id: p.patientId,
                main: p.patientName,
                secondary: `${p.sessionsCount} sessões • ${p.billingType === "convenio" ? p.insuranceName || "Convênio" : "Particular"}`,
                amount: p.subtotal,
              }))}
            />
          </TabsContent>
          <TabsContent value="team" className="mt-3">
            <BreakdownCard
              title={`Repasse previsto: ${currency(report.totalPayout)}`}
              rows={report.therapistBreakdown.map((t) => ({
                id: t.therapistId,
                main: t.therapistName,
                secondary: `${t.totalSessions} sessões • ${t.totalHours}h • ${currency(t.hourlyRate)}/h`,
                amount: t.totalPayout,
              }))}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo lançamento financeiro</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as FinancialEntryType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receivable">Conta a receber</SelectItem>
                    <SelectItem value="payable">Conta a pagar</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Categoria">
                <Input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </Field>
              <Field label="Descrição">
                <Input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <Field label="Valor">
                <Input required inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field label="Vencimento">
                <Input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </Field>
              <Field label="Forma de pagamento">
                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v as FinancialPaymentMethod })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Paciente">
                <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem paciente</SelectItem>
                    {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Profissional">
                <Select value={form.therapistId} onValueChange={(v) => setForm({ ...form, therapistId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem profissional</SelectItem>
                    {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Observações">
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />} Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Kpi({ title, value, tone }: { title: string; value: string; tone: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className={cn("mt-1 text-xl font-bold", tone)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ id: string; main: string; secondary: string; amount: number }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum dado para o período.</p>
        ) : (
          <div className="divide-y">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.main}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.secondary}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold">{currency(row.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
