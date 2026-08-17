import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { requireAuth } from "@/lib/route-guard";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { useCurrentUser } from "@/lib/auth-context";
import { getPatients } from "@/queries/patients";
import type { PatientSummary } from "@/db/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Play, Calendar, TrendingUp, ChevronRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Meus Pacientes — Gestão Clínica ABA" },
      { name: "description", content: "Painel do terapeuta ABA: pacientes do dia, início rápido de sessão e acesso ao prontuário eletrônico." },
      { property: "og:title", content: "Meus Pacientes — Gestão Clínica ABA" },
      { property: "og:description", content: "Painel do terapeuta com sessões do dia e acesso rápido ao registro ABA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const user = useCurrentUser();
  const role = user?.role;

  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (user && role === "therapist") {
      getPatients({ data: { role: "therapist", userId: user.id } })
        .then((res) => setPatients(res))
        .catch(() => setPatients([]))
        .finally(() => setLoading(false));
    }
  }, [user, role]);

  if (role === "admin") return <Navigate to="/admin" />;
  if (role === "parent") return <Navigate to="/parent" />;

  const firstName = user?.name ? user.name.split(" ")[0] : "Terapeuta";

  return (
    <AppLayout>
      <PageHeader
        title={`Bom dia, ${firstName} 👋`}
        subtitle={
          loading
            ? "Carregando seus pacientes vinculados..."
            : `Você tem ${patients.length} paciente(s) vinculado(s) sob sua responsabilidade.`
        }
      />

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="size-5 animate-spin text-primary" />
          Carregando prontuários do banco D1...
        </div>
      ) : patients.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm font-medium">Nenhum paciente vinculado no momento.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Entre em contato com a supervisão para realizar o vínculo de casos.
          </p>
        </Card>
      ) : (
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
                      {p.avatar_initials ?? p.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.age ? `${p.age} anos · ` : ""}{p.diagnosis}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-primary-soft text-primary border-0">
                    {p.progress}%
                  </Badge>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  Sessão agendada · Ativo
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
      )}

      {patients.length > 0 && (
        <div className="mt-8">
          <Card className="bg-gradient-to-br from-primary-soft to-background border-primary/20">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
                <TrendingUp className="size-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Desempenho geral dos seus casos</p>
                <p className="text-xs text-muted-foreground">
                  Acompanhe os gráficos de aquisição de habilidades e controle de comportamentos.
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/evolution/$patientId" params={{ patientId: patients[0]?.id ?? "p1" }}>
                  Ver gráficos
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
