import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { patients, monthlyPerformance, yesNoByTarget, intensityFrequency } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
  Cell,
} from "recharts";

export const Route = createFileRoute("/evolution/$patientId")({
  head: () => ({
    meta: [
      { title: "Evolução do Paciente — Gestão Clínica ABA" },
      { name: "description", content: "Gráficos de evolução: desempenho mensal, respostas Sim/Não por alvo e frequência versus intensidade." },
      { property: "og:title", content: "Evolução do Paciente — Gestão Clínica ABA" },
      { property: "og:description", content: "Gráficos de desempenho, acertos por alvo e intensidade comportamental." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Evolution,
});

const intensityColor: Record<string, string> = {
  Leve: "oklch(0.7 0.13 220)",
  Moderada: "oklch(0.82 0.16 85)",
  Intensa: "oklch(0.62 0.22 25)",
};

function Evolution() {
  const { patientId } = useParams({ from: "/evolution/$patientId" });
  const p = patients.find((x) => x.id === patientId) ?? patients[0];

  return (
    <AppLayout>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/patient/$patientId" params={{ patientId: p.id }}>
          <ArrowLeft className="size-4" /> Prontuário
        </Link>
      </Button>
      <PageHeader title={`Evolução · ${p.name}`} subtitle="Visualização dos dados clínicos do mês." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-3">
              <h3 className="font-semibold">Desempenho mensal</h3>
              <p className="text-xs text-muted-foreground">% de acertos nos programas por dia</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={monthlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="percent"
                    stroke="var(--color-primary)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-primary)", r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3">
              <h3 className="font-semibold">Sim / Não por objetivo</h3>
              <p className="text-xs text-muted-foreground">Total de respostas por tarefa</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={yesNoByTarget}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="target" stroke="var(--color-muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="yes" stackId="a" name="Sim" fill="var(--color-success)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="no" stackId="a" name="Não" fill="var(--color-destructive)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-semibold">Frequência × Intensidade</h3>
                <p className="text-xs text-muted-foreground">Duração (min) por dia, cor = intensidade</p>
              </div>
              <div className="flex gap-2 text-[10px]">
                {(["Leve", "Moderada", "Intensa"] as const).map((i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span
                      className="size-2.5 rounded-sm"
                      style={{ background: intensityColor[i] }}
                    />
                    {i}
                  </span>
                ))}
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={intensityFrequency}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                    {intensityFrequency.map((e, i) => (
                      <Cell key={i} fill={intensityColor[e.intensity]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
