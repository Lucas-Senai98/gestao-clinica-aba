import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAuth, requireRole } from "@/lib/route-guard";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { adminStats, therapists, patients, monthlyPerformance } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Stethoscope, Clock4, Activity, ArrowRight } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin")({
  beforeLoad: requireRole("admin"),
  head: () => ({
    meta: [
      { title: "Dashboard da Supervisão — Gestão Clínica ABA" },
      { name: "description", content: "Indicadores da clínica ABA: pacientes ativos, equipe terapêutica, aprovações pendentes e sessões da semana." },
      { property: "og:title", content: "Dashboard da Supervisão — Gestão Clínica ABA" },
      { property: "og:description", content: "Visão geral em tempo real da clínica: equipe, pacientes e sessões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <AppLayout>
      <PageHeader
        title="Dashboard da supervisão"
        subtitle="Visão geral da clínica em tempo real."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/hours">
              <Clock4 className="size-4" /> Controle de horas
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat icon={Users} label="Pacientes ativos" value={adminStats.patients} />
        <Stat icon={Stethoscope} label="Terapeutas" value={adminStats.therapists} />
        <Stat icon={Activity} label="Sessões/semana" value={adminStats.sessionsThisWeek} />
        <Stat
          icon={Clock4}
          label="Aprovações pendentes"
          value={adminStats.pendingApprovals}
          accent
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <h3 className="font-semibold">Acertos médios da clínica</h3>
            <p className="text-xs text-muted-foreground mb-3">% médio dos programas no último mês</p>
            <div className="h-60">
              <ResponsiveContainer>
                <AreaChart data={monthlyPerformance}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" fontSize={11} stroke="var(--color-muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--color-muted-foreground)" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="percent"
                    stroke="var(--color-primary)"
                    fill="url(#g1)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-3">Equipe ativa</h3>
            <div className="space-y-3">
              {therapists.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-primary-soft text-primary grid place-items-center text-xs font-semibold">
                    {t.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                  <Badge variant="secondary" className="bg-success/15 text-success border-0">
                    online
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Pacientes recentes</h3>
              <Button asChild variant="ghost" size="sm">
                <Link to="/patient/$patientId" params={{ patientId: "p1" }}>
                  Ver todos <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {patients.map((p) => (
                <Link
                  key={p.id}
                  to="/patient/$patientId"
                  params={{ patientId: p.id }}
                  className="rounded-xl border border-border p-3 hover:border-primary/40 hover:bg-primary-soft/40 transition-colors"
                >
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.diagnosis}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/40 bg-primary-soft/40" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`size-10 rounded-xl grid place-items-center ${
              accent ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"
            }`}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
