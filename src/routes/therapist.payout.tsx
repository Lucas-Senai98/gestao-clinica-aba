import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { requireAuth } from "@/lib/route-guard";
import { useCurrentUser } from "@/lib/auth-context";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { getTherapistPayout } from "@/server/queries/financial";
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
  Clock,
  Calendar,
  Sparkles,
  Loader2,
  FileCheck,
  Award,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/therapist/payout")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Meus Ganhos e Horas — Gestão Clínica ABA" },
      {
        name: "description",
        content: "Extrato consolidado de repasse do terapeuta: horas de atendimento e valor acumulado no mês.",
      },
    ],
  }),
  component: TherapistPayoutPage,
});

function TherapistPayoutPage() {
  const currentUser = useCurrentUser();

  const [selectedMonth, setSelectedMonth] = useState("08");
  const [selectedYear, setSelectedYear]   = useState("2026");

  const [loading, setLoading] = useState(true);
  const [payoutData, setPayoutData] = useState<{
    hourlyRate: number;
    totalSessions: number;
    totalMinutes: number;
    totalHours: number;
    totalEarnings: number;
    sessionItems: Array<{
      id: string;
      sessionDate: string;
      startTime: string;
      endTime: string;
      durationMin: number;
      patientName: string;
      sessionEarnings: number;
    }>;
  }>({
    hourlyRate: 80,
    totalSessions: 0,
    totalMinutes: 0,
    totalHours: 0,
    totalEarnings: 0,
    sessionItems: [],
  });

  useEffect(() => {
    setLoading(true);
    getTherapistPayout({
      data: {
        month: `${selectedYear}-${selectedMonth}`,
        year: Number(selectedYear),
      },
    })
      .then((res) => setPayoutData(res))
      .catch((err) => {
        toast.error("Erro ao carregar extrato de horas", {
          description: err instanceof Error ? err.message : "Erro",
        });
      })
      .finally(() => setLoading(false));
  }, [selectedMonth, selectedYear]);

  const firstName = currentUser?.name ? currentUser.name.split(" ")[0] : "Terapeuta";

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <PageHeader
          title={`Meus Ganhos e Repasse · ${firstName}`}
          subtitle="Acompanhe suas horas de atendimento contabilizadas e o repasse acumulado no mês."
        />

        <Card className="w-full md:w-auto shrink-0 border-primary/20 shadow-xs">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Calendar className="size-4 text-primary" />
              Mês de Referência:
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
          <p className="text-sm text-muted-foreground mt-3">Calculando horas e repasses do terapeuta...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ── BANNER MOTIVADOR DE REPASSE ─────────────────────────────────── */}
          <Card className="bg-gradient-to-r from-primary-soft via-background to-emerald-50 border-primary/30 shadow-xs">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  <h3 className="font-semibold text-lg text-foreground">
                    Excelente trabalho este mês, {firstName}! 👏
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Seus atendimentos foram validados pela supervisão clínica.
                </p>
              </div>

              <div className="bg-background border border-emerald-300 px-4 py-3 rounded-2xl shadow-xs shrink-0">
                <p className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider">
                  Total a Receber da Clínica
                </p>
                <p className="text-3xl font-extrabold text-emerald-700 mt-0.5">
                  R$ {payoutData.totalEarnings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── RESUMO EM 3 CARDS ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-muted/40 border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Horas Acumuladas</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {payoutData.totalHours} horas
                  </p>
                  <p className="text-[11px] text-muted-foreground">({payoutData.totalMinutes} min totais)</p>
                </div>
                <Clock className="size-8 text-primary opacity-70" />
              </CardContent>
            </Card>

            <Card className="bg-muted/40 border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Sessões Validadas</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {payoutData.totalSessions} sessões
                  </p>
                  <p className="text-[11px] text-muted-foreground">Persistidas no D1</p>
                </div>
                <FileCheck className="size-8 text-success opacity-70" />
              </CardContent>
            </Card>

            <Card className="bg-muted/40 border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Sua Taxa Horária</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    R$ {payoutData.hourlyRate.toFixed(2)} /h
                  </p>
                  <p className="text-[11px] text-muted-foreground">Acordo contratual</p>
                </div>
                <Award className="size-8 text-amber-500 opacity-70" />
              </CardContent>
            </Card>
          </div>

          {/* ── TABELA DE ATENDIMENTOS E GANHOS POR SESSÃO ────────────────────── */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-600" />
                Detalhamento dos Atendimentos Realizados
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {payoutData.sessionItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum atendimento registrado no mês de {selectedMonth}/{selectedYear}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Repasse Gerado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payoutData.sessionItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.sessionDate}</TableCell>
                          <TableCell className="font-semibold text-foreground">{item.patientName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.startTime} - {item.endTime}
                          </TableCell>
                          <TableCell>{item.durationMin} min</TableCell>
                          <TableCell className="font-bold text-emerald-700">
                            R$ {item.sessionEarnings.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
