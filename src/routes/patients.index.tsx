import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { patients, therapists } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, ChevronRight, LineChart, UserPlus } from "lucide-react";

export const Route = createFileRoute("/patients/")({
  head: () => ({
    meta: [
      { title: "Pacientes — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Lista completa de pacientes da clínica com diagnóstico, responsável, terapeuta de referência e progresso do PEI.",
      },
      { property: "og:title", content: "Pacientes — Gestão Clínica ABA" },
      {
        property: "og:description",
        content: "Busque pacientes e acesse prontuários, sessões e gráficos de evolução.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PatientsList,
});

function PatientsList() {
  const [q, setQ] = useState("");
  const list = patients.filter((p) =>
    `${p.name} ${p.diagnosis} ${p.guardian}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppLayout>
      <PageHeader title="Pacientes" subtitle="Todos os pacientes ativos da clínica." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, diagnóstico ou responsável"
            className="pl-9"
          />
        </div>
        <Button asChild>
          <Link to="/patients/new">
            <UserPlus className="size-4" /> Novo paciente
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        {list.map((p) => {
          const t = therapists.find((x) => x.id === p.therapistId);
          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-wrap items-center gap-4">
                <Avatar className="size-11">
                  <AvatarFallback className="bg-primary-soft text-primary font-semibold">
                    {p.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.age} anos · {p.diagnosis} · Resp.: {p.guardian}
                  </p>
                </div>
                <Badge variant="secondary" className="border-0">
                  {t?.name ?? "—"}
                </Badge>
                <div className="w-32">
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                    <span>PEI</span>
                    <span>{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} className="h-1.5" />
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/evolution/$patientId" params={{ patientId: p.id }}>
                      <LineChart className="size-3.5" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/patients/$patientId" params={{ patientId: p.id }}>
                      <Pencil className="size-3.5" />
                    </Link>
                  </Button>

                  <Button asChild size="sm">
                    <Link to="/patient/$patientId" params={{ patientId: p.id }}>
                      Prontuário <ChevronRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum paciente encontrado.
          </p>
        )}
      </div>
    </AppLayout>
  );
}
