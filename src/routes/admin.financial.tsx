import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { requireRole } from "@/lib/route-guard";
import { AppLayout, PageHeader } from "@/components/app-layout";
import {
  getFinancialReport,
  updatePatientBillingRate,
  updateTherapistPaymentRate,
  type PatientBillingItem,
  type TherapistPayoutItem,
} from "@/server/queries/financial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  Calendar,
  Loader2,
  Edit2,
  Save,
  CheckCircle2,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/financial")({
  beforeLoad: requireRole("admin"),
  head: () => ({
    meta: [
      { title: "Gestão Financeira & Repasse — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Dashboard financeiro da clínica: faturamento de convênios e particulares, cálculo de repasse aos terapeutas e margem operacional.",
      },
    ],
  }),
  component: AdminFinancialPage,
});

function AdminFinancialPage() {
  const [selectedMonth, setSelectedMonth] = useState("08");
  const [selectedYear, setSelectedYear]   = useState("2026");

  const [loading, setLoading] = useState(true);
  const [report, setReport]   = useState<{
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
  const [editingPatient, setEditingPatient] = useState<PatientBillingItem | null>(null);
  const [patientRate, setPatientRate]       = useState(150);
  const [billingType, setBillingType]       = useState<"particular" | "convenio">("particular");
  const [insuranceName, setInsuranceName]   = useState("");
  const [savingRate, setSavingRate]         = useState(false);

  // Modal / Edição de Taxa de Terapeuta
  const [editingTherapist, setEditingTherapist] = useState<TherapistPayoutItem | null>(null);
  const [therapistRate, setTherapistRate]     = useState(80);
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
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

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
      setEditingPatient(null);
      loadData();
    } catch (err) {
      toast.error("Erro ao salvar taxa.");
    } finally {
      setSavingRate(false);
    }
  };

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
      setEditingTherapist(null);
      loadData();
    } catch (err) {
      toast.error("Erro ao salvar taxa.");
    } finally {
      setSavingTherapistRate(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <PageHeader
          title="Gestão Financeira e Repasse"
          subtitle="Consolidado automatizado de faturamento da clínica e repasses da equipe."
        />

        <Card className="w-full md:w-auto shrink-0 border-primary/20 shadow-xs">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Calendar className="size-4 text-primary" />
              Período:
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

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[90px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
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
                </div>
                <Users className="size-9 text-rose-600 opacity-80" />
              </CardContent>
            </Card>

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
                </div>
                <TrendingUp className="size-9 text-primary opacity-80" />
              </CardContent>
            </Card>
          </div>

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
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingPatient(null)} className="h-7 text-xs">
                    Cancelar
                  </Button>
                  <Button onClick={handleSavePatientRate} disabled={savingRate} size="sm" className="h-7 text-xs">
                    {savingRate ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5 mr-1" />}
                    Salvar Valor
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingTherapist(null)} className="h-7 text-xs">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveTherapistRate} disabled={savingTherapistRate} size="sm" className="h-7 text-xs">
                    {savingTherapistRate ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5 mr-1" />}
                    Salvar Repasse
                  </Button>
                </div>
              </CardContent>
            </Card>
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
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
