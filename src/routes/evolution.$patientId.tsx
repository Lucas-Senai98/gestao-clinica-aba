import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { requireAuth } from "@/lib/route-guard";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { patients, monthlyPerformance, yesNoByTarget, intensityFrequency } from "@/lib/mock-data";
import {
  getPatientAnalytics,
  type TargetPerformancePoint,
  type YesNoPoint,
  type BehaviorDurationPoint,
} from "@/queries/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Filter,
  TrendingUp,
  Activity,
  BarChart3,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  FileDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Cores Oficiais da Clínica para os Programas & Intensidades ────────────────

const PROGRAM_LINE_COLORS = [
  "#8b5cf6", // Violet (Primária GiZé's)
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#3b82f6", // Blue
];

/** Paleta Oficial da Clínica para Intensidades Comportamentais */
const INTENSITY_COLORS = {
  Leve:     "#3b82f6", // 🔵 Leve (Azul / Blue-500)
  Moderada: "#f59e0b", // 🟡 Moderada (Amarelo / Amber-500)
  Intensa:  "#e11d48", // 🔴 Intensa (Vermelho / Rose-600)
};

export const Route = createFileRoute("/evolution/$patientId")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Evolução e Análise Clínica — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Painel analítico do paciente: gráficos de desempenho por programa, respostas Sim/Não e duração por intensidade comportamental.",
      },
    ],
  }),
  component: EvolutionPage,
});

function EvolutionPage() {
  const { patientId } = useParams({ from: "/evolution/$patientId" });
  const patient       = patients.find((x) => x.id === patientId) ?? patients[0];

  // ── Filtros do topo ───────────────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState("08"); // Agosto
  const [selectedYear, setSelectedYear]   = useState("2026");

  // ── Estado dos dados vindos da Server Function ────────────────────────────
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<{
    targetPerformanceData: TargetPerformancePoint[];
    yesNoData: YesNoPoint[];
    behaviorDurationData: BehaviorDurationPoint[];
    availableTargets: string[];
    totalSessionsCount: number;
  }>({
    targetPerformanceData: [],
    yesNoData: [],
    behaviorDurationData: [],
    availableTargets: [],
    totalSessionsCount: 0,
  });

  // Programas selecionados para exibir no Gráfico 1
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  // Carrega dados analíticos via Server Function
  useEffect(() => {
    let unmounted = false;
    setLoading(true);

    getPatientAnalytics({
      data: {
        patientId,
        month: `${selectedYear}-${selectedMonth}`,
        year: Number(selectedYear),
      },
    })
      .then((res) => {
        if (unmounted) return;

        // Se houver dados reais no D1
        if (res.targetPerformanceData.length > 0 || res.yesNoData.length > 0) {
          setAnalyticsData({
            targetPerformanceData: res.targetPerformanceData,
            yesNoData: res.yesNoData,
            behaviorDurationData: res.behaviorDurationData,
            availableTargets: res.availableTargets,
            totalSessionsCount: res.totalSessionsCount,
          });
          setSelectedTargets(res.availableTargets);
        } else {
          // Mock Fallback se não houver registros no D1 no mês selecionado
          useMockFallback();
        }
      })
      .catch(() => {
        if (!unmounted) useMockFallback();
      })
      .finally(() => {
        if (!unmounted) setLoading(false);
      });

    function useMockFallback() {
      const mockTargets = ["Pareamento por cor", "Imitação motora", "Seguir instruções"];

      // Converte monthlyPerformance do mock-data em formato de pontos
      const mockLineData: TargetPerformancePoint[] = monthlyPerformance.map((item) => ({
        date: item.day,
        fullDate: `2026-${selectedMonth}-${item.day.padStart(2, "0")}`,
        "Pareamento por cor": item.desempenho,
        "Imitação motora": Math.max(40, item.desempenho - 10),
        "Seguir instruções": Math.min(100, item.desempenho + 5),
      }));

      // Mock para o gráfico Sim/Não
      const mockYesNo: YesNoPoint[] = monthlyPerformance.map((item, idx) => ({
        date: item.day,
        Sim: (idx % 3) + 2,
        Nao: idx % 2 === 0 ? 1 : 0,
      }));

      // Mock para Duração por Intensidade
      const mockBehaviorDuration: BehaviorDurationPoint[] = intensityFrequency.map((item) => ({
        date: item.dia,
        Leve: item.leve * 5,
        Moderada: item.moderada * 8,
        Intensa: item.intensa * 12,
        totalDuration: item.leve * 5 + item.moderada * 8 + item.intensa * 12,
      }));

      setAnalyticsData({
        targetPerformanceData: mockLineData,
        yesNoData: mockYesNo,
        behaviorDurationData: mockBehaviorDuration,
        availableTargets: mockTargets,
        totalSessionsCount: 14,
      });
      setSelectedTargets(mockTargets);
    }

    return () => {
      unmounted = true;
    };
  }, [patientId, selectedMonth, selectedYear]);

  // Alterna exibição de um programa no gráfico
  const toggleTarget = (targetName: string) => {
    setSelectedTargets((prev) =>
      prev.includes(targetName)
        ? prev.filter((t) => t !== targetName)
        : [...prev, targetName],
    );
  };

  // Selecionar/Deselecionar todos os programas
  const toggleAllTargets = () => {
    if (selectedTargets.length === analyticsData.availableTargets.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets([...analyticsData.availableTargets]);
    }
  };

  return (
    <AppLayout>
      {/* Navegação de volta e Ações */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/patient/$patientId" params={{ patientId: patient.id }}>
            <ArrowLeft className="size-4" /> Voltar ao Prontuário
          </Link>
        </Button>

        <Button asChild variant="secondary" size="sm" className="border border-primary/20 bg-primary-soft text-primary hover:bg-primary/20">
          <Link to="/patients/$patientId/print-report" params={{ patientId: patient.id }} target="_blank">
            <FileDown className="size-4 mr-1" /> Exportar Relatório PDF
          </Link>
        </Button>
      </div>

      {/* Header do Painel */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <PageHeader
            title={`Evolução Clínica · ${patient.name}`}
            subtitle="Painel analítico automatizado de sessões e desempenho ABA."
          />
        </div>

        {/* Filtro Mês/Ano */}
        <Card className="w-full md:w-auto shrink-0 shadow-sm border-primary/20">
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
          <p className="text-sm text-muted-foreground mt-3">
            Processando dados históricos do D1...
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Banner de resumo do período */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-primary-soft/30 border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Sessões Registradas</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {analyticsData.totalSessionsCount}
                  </p>
                </div>
                <Activity className="size-8 text-primary opacity-80" />
              </CardContent>
            </Card>

            <Card className="bg-success/10 border-success/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Programas Monitorados</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {analyticsData.availableTargets.length}
                  </p>
                </div>
                <TrendingUp className="size-8 text-success opacity-80" />
              </CardContent>
            </Card>

            <Card className="bg-amber-500/10 border-amber-500/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Registros de Estereotipia</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {analyticsData.behaviorDurationData.length}
                  </p>
                </div>
                <Clock className="size-8 text-amber-600 opacity-80" />
              </CardContent>
            </Card>
          </div>

          {/* ── GRÁFICO 1: DESEMPENHO DOS PROGRAMAS (LINECHART) ──────────────── */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  Gráfico 1: Desempenho dos Programas de Ensino
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Porcentagem média de acertos (% por sessão) ao longo do mês.
                </p>
              </div>

              {/* Filtro de Seleção de Programas */}
              {analyticsData.availableTargets.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllTargets}
                    className="text-xs h-7 px-2"
                  >
                    {selectedTargets.length === analyticsData.availableTargets.length
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </Button>
                  {analyticsData.availableTargets.map((tName, idx) => {
                    const isSelected = selectedTargets.includes(tName);
                    const color = PROGRAM_LINE_COLORS[idx % PROGRAM_LINE_COLORS.length];

                    return (
                      <button
                        key={tName}
                        onClick={() => toggleTarget(tName)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors select-none",
                          isSelected
                            ? "bg-background shadow-xs border-border text-foreground"
                            : "bg-muted/40 border-transparent text-muted-foreground opacity-60",
                        )}
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {tName}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-6">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analyticsData.targetPerformanceData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--background))",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      }}
                      formatter={(val: number) => [`${val}%`, "Desempenho"]}
                    />
                    <Legend />

                    {analyticsData.availableTargets.map((tName, idx) => {
                      if (!selectedTargets.includes(tName)) return null;
                      const color = PROGRAM_LINE_COLORS[idx % PROGRAM_LINE_COLORS.length];

                      return (
                        <Line
                          key={tName}
                          type="monotone"
                          dataKey={tName}
                          name={tName}
                          stroke={color}
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Grid de 2 Colunas para Gráfico 2 e Gráfico 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── GRÁFICO 2: RESPOSTAS RÁPIDAS SIM/NÃO (BARCHART EMPILHADO) ────── */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 border-b border-border/60">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" />
                  Gráfico 2: Proporção de Respostas Sim / Não
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Engajamento diário: cooperação, atenção à tarefa e comportamento adequado.
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData.yesNoData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          backgroundColor: "hsl(var(--background))",
                        }}
                      />
                      <Legend />
                      {/* Verde = Sim, Vermelho = Não */}
                      <Bar dataKey="Sim" name="Sim (Positivo)" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="Nao" name="Não (Negativo)" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ── GRÁFICO 3: DURAÇÃO POR INTENSIDADE (BARCHART VERTICAL CORES) ─── */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 border-b border-border/60">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="size-4 text-amber-500" />
                  Gráfico 3: Duração por Intensidade Comportamental
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tempo acumulado (em minutos) agrupado pelas cores oficiais da clínica.
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData.behaviorDurationData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis unit="m" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          backgroundColor: "hsl(var(--background))",
                        }}
                        formatter={(val: number) => [`${val} min`, "Duração"]}
                      />
                      <Legend />
                      {/* Paleta oficial exige: Azul (Leve), Âmbar (Moderada), Vermelho (Intensa) */}
                      <Bar dataKey="Leve" name="🔵 Leve" fill={INTENSITY_COLORS.Leve} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Moderada" name="🟡 Moderada" fill={INTENSITY_COLORS.Moderada} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Intensa" name="🔴 Intensa" fill={INTENSITY_COLORS.Intensa} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      )}
    </AppLayout>
  );
}
