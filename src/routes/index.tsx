import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { useRole } from "@/lib/role-context";
import { patients } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Play, Calendar, TrendingUp, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { role } = useRole();

  if (role === "admin") return <Navigate to="/admin" />;
  if (role === "parent") return <Navigate to="/parent" />;

  return (
    <AppLayout>
      <PageHeader
        title="Bom dia, Ana 👋"
        subtitle="Você tem 4 sessões agendadas para hoje."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {patients.map((p) => (
          <Card
            key={p.id}
            className="overflow-hidden border-border hover:shadow-md transition-shadow"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Avatar className="size-12 bg-primary-soft">
                  <AvatarFallback className="bg-primary-soft text-primary font-semibold">
                    {p.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-tight truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.age} anos · {p.diagnosis}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-primary-soft text-primary border-0">
                  {p.progress}%
                </Badge>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="size-3.5" />
                {p.nextSession}
              </div>

              <div className="mt-4 grid grid-cols-5 gap-2">
                <Button asChild className="col-span-3" size="sm">
                  <Link to="/session/$patientId" params={{ patientId: p.id }}>
                    <Play className="size-4" /> Iniciar Sessão
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="col-span-2">
                  <Link to="/patient/$patientId" params={{ patientId: p.id }}>
                    Prontuário <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card className="bg-gradient-to-br from-primary-soft to-background border-primary/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
              <TrendingUp className="size-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Desempenho geral da semana</p>
              <p className="text-xs text-muted-foreground">
                Média de acertos dos seus pacientes subiu 6% vs. semana anterior.
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/evolution/$patientId" params={{ patientId: "p1" }}>
                Ver gráficos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
