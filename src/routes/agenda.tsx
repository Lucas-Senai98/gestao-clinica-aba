import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { appointments, weekDays } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda de Sessões — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Agenda semanal da clínica: sessões de ABA, fono, psicologia e T.O. por terapeuta, sala e horário.",
      },
      { property: "og:title", content: "Agenda de Sessões — Gestão Clínica ABA" },
      {
        property: "og:description",
        content: "Visualize e organize as sessões da equipe por dia, sala e terapeuta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Agenda,
});

const statusTone: Record<string, string> = {
  Concluída: "bg-success/15 text-success",
  "Em andamento": "bg-primary-soft text-primary",
  Agendada: "bg-muted text-muted-foreground",
  Cancelada: "bg-destructive/15 text-destructive",
};

function Agenda() {
  const [day, setDay] = useState(2);

  return (
    <AppLayout>
      <PageHeader
        title="Agenda da clínica"
        subtitle="Sessões do dia por terapeuta, sala e horário."
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {weekDays.map((d, i) => (
          <button
            key={d}
            onClick={() => setDay(i)}
            className={cn(
              "shrink-0 rounded-xl border px-4 py-2 text-sm transition-colors",
              i === day
                ? "border-primary bg-primary-soft text-primary font-medium"
                : "border-border hover:bg-muted"
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {appointments.map((a) => (
          <Card key={a.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="w-16 shrink-0">
                <p className="text-lg font-semibold leading-none">{a.time}</p>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="size-3" /> 50min
                </p>
              </div>
              <div className="flex-1 min-w-[160px]">
                <p className="font-medium text-sm">{a.patient}</p>
                <p className="text-xs text-muted-foreground">
                  {a.type} · {a.therapist}
                </p>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3.5" /> {a.room}
              </div>
              <Badge className={cn("border-0", statusTone[a.status])}>{a.status}</Badge>
              <Button asChild size="sm" variant="outline">
                <Link to="/session/$patientId" params={{ patientId: "p1" }}>
                  <Play className="size-3.5" /> Registro
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
