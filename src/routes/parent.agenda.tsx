import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { getParentAppointments } from "@/queries/appointments";
import { getParentFeed } from "@/queries/communication";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, CheckCircle2, Home, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parent/agenda")({
  beforeLoad: requireRole("parent"),
  head: () => ({
    meta: [
      { title: "Agenda e atividades de casa — Portal dos Responsáveis" },
      {
        name: "description",
        content:
          "Próximas sessões do seu filho, resumo de presenças do mês e as atividades combinadas para praticar em casa.",
      },
      { property: "og:title", content: "Agenda e atividades de casa — Portal dos Responsáveis" },
      {
        property: "og:description",
        content: "Veja os próximos atendimentos e o que praticar em casa nesta semana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ParentAgenda,
});

const tone: Record<string, string> = {
  Confirmada: "bg-success/15 text-success border-0",
  Agendada: "bg-primary-soft text-primary border-0",
  Concluída: "bg-success/15 text-success border-0",
  Cancelada: "bg-destructive/15 text-destructive border-0",
};

function ParentAgenda() {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<
    Array<{ id: string; day: string; date: string; time: string; type: string; therapist: string; status: string }>
  >([]);
  const [practices, setPractices] = useState<
    Array<{ id: string; title: string; freq: string; done: boolean }>
  >([]);

  useEffect(() => {
    let unmounted = false;
    setLoading(true);

    Promise.all([
      getParentAppointments().catch(() => []),
      getParentFeed({ data: {} }).catch(() => []),
    ])
      .then(([appRes, feedRes]) => {
        if (unmounted) return;
        setSchedule(appRes || []);

        const practiceList: Array<{ id: string; title: string; freq: string; done: boolean }> = [];
        if (feedRes && feedRes.length > 0) {
          feedRes.forEach((f: any) => {
            if (f.home_practices) {
              practiceList.push({
                id: f.id,
                title: f.home_practices,
                freq: `Orientação: ${f.title}`,
                done: false,
              });
            }
          });
        }
        setPractices(practiceList);
      })
      .finally(() => {
        if (!unmounted) setLoading(false);
      });

    return () => {
      unmounted = true;
    };
  }, []);

  const toggle = (id: string) =>
    setPractices((list) => list.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));

  const presencas = schedule.filter((s) => s.status === "Confirmada" || s.status === "Concluída").length;
  const faltas = schedule.filter((s) => s.status === "Cancelada").length;
  const agendadas = schedule.filter((s) => s.status === "Agendada").length;

  return (
    <AppLayout>
      <PageHeader title="Agenda do Paciente" subtitle="Próximos atendimentos e combinados para casa." />

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Presenças / Confirmadas", value: presencas },
          { label: "Canceladas", value: faltas },
          { label: "Agendadas", value: agendadas },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold mt-1">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">Mês corrente</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" /> Próximas sessões
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="size-6 animate-spin mx-auto text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Carregando agendamentos...</p>
            </div>
          ) : schedule.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground italic">
              Nenhuma sessão agendada no momento.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {schedule.map((s) => (
                <div
                  key={s.id}
                  className="px-5 py-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"
                >
                  <div className="text-center w-14">
                    <p className="text-[11px] text-muted-foreground">{s.day}</p>
                    <p className="text-sm font-semibold">{s.date.slice(5)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.type}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.time} • {s.therapist}
                    </p>
                  </div>
                  <Badge className={cn("text-[10px] shrink-0", tone[s.status] || "bg-muted")}>{s.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="size-4 text-primary" /> Para praticar em casa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {practices.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              Nenhuma atividade de casa pendente no momento.
            </p>
          ) : (
            <>
              {practices.map((p) => (
                <label
                  key={p.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer"
                >
                  <Checkbox checked={p.done} onCheckedChange={() => toggle(p.id)} className="mt-0.5" />
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium", p.done && "line-through text-muted-foreground")}>
                      {p.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{p.freq}</p>
                  </div>
                </label>
              ))}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="size-3.5 text-success" />
                {practices.filter((p) => p.done).length} de {practices.length} combinados feitos.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
