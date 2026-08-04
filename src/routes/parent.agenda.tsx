import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { parentSchedule, parentAttendance, homePractices } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, CheckCircle2, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parent/agenda")({
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
  Cancelada: "bg-destructive/15 text-destructive border-0",
};

function ParentAgenda() {
  const [practices, setPractices] = useState(homePractices);

  const toggle = (id: string) =>
    setPractices((list) => list.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));

  return (
    <AppLayout>
      <PageHeader title="Agenda do Lucas" subtitle="Próximos atendimentos e combinados de casa." />

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Presenças", value: parentAttendance.presencas },
          { label: "Faltas", value: parentAttendance.faltas },
          { label: "Remarcadas", value: parentAttendance.remarcadas },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold mt-1">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{parentAttendance.mes}</p>
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
          <div className="divide-y divide-border">
            {parentSchedule.map((s) => (
              <div
                key={s.id}
                className="px-5 py-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"
              >
                <div className="text-center w-14">
                  <p className="text-[11px] text-muted-foreground">{s.day}</p>
                  <p className="text-sm font-semibold">{s.date}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.type}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.time} • {s.therapist}
                  </p>
                </div>
                <Badge className={cn("text-[10px] shrink-0", tone[s.status])}>{s.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="size-4 text-primary" /> Para praticar em casa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
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
            {practices.filter((p) => p.done).length} de {practices.length} combinados feitos hoje.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
