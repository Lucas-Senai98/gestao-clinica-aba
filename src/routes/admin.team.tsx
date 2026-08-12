import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, requireRole } from "@/lib/route-guard";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { teamMembers, teamCertifications } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { UserPlus, Search, Award, Mail } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/team")({
  beforeLoad: requireRole("admin"),
  head: () => ({
    meta: [
      { title: "Gestão de equipe clínica — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Cadastro da equipe multidisciplinar: registros profissionais, carga semanal, número de casos atribuídos e certificações vigentes.",
      },
      { property: "og:title", content: "Gestão de equipe clínica" },
      {
        property: "og:description",
        content: "Acompanhe carga horária, casos por terapeuta e certificações da equipe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

const statusTone: Record<string, string> = {
  Ativa: "bg-success/15 text-success border-0",
  Férias: "bg-warning/20 text-warning-foreground border-0",
  Inativo: "bg-muted text-muted-foreground border-0",
};

function TeamPage() {
  const [q, setQ] = useState("");
  const list = teamMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(q.toLowerCase()) ||
      m.role.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppLayout>
      <PageHeader
        title="Equipe clínica"
        subtitle={`${teamMembers.length} profissionais cadastrados na unidade.`}
        action={
          <Button size="sm" onClick={() => toast("Convite enviado", { description: "Formulário de cadastro por e-mail." })}>
            <UserPlus className="size-4" /> Convidar
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou especialidade..."
          className="pl-9"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="size-11 bg-primary-soft">
                  <AvatarFallback className="bg-primary-soft text-primary text-xs font-semibold">
                    {m.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{m.name}</p>
                    <Badge className={cn("text-[10px]", statusTone[m.status])}>{m.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{m.role} • {m.registry}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                    <Mail className="size-3" /> {m.email}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground">Casos atribuídos</p>
                  <p className="text-sm font-medium">{m.caseload} pacientes</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Carga semanal · {m.weeklyHours}h / 40h
                  </p>
                  <Progress value={(m.weeklyHours / 40) * 100} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {list.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum profissional encontrado.
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="size-4 text-primary" /> Certificações vigentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {teamCertifications.map((c) => (
              <div key={c.cert} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.cert}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.member}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  válida até {c.validity}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
