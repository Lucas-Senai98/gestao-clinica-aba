import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { getPeiData, type PeiGoalItem, type PeiHistoryItem } from "@/queries/pei";
import { getPatientById } from "@/queries/patients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Target, History, LineChart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pei/$patientId")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "PEI — Plano de Ensino Individualizado | Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Metas do Plano de Ensino Individualizado (PEI): área, critério de domínio, linha de base, progresso atual e responsável.",
      },
      { property: "og:title", content: "PEI — Plano de Ensino Individualizado" },
      { property: "og:description", content: "Acompanhe metas, critérios e progresso do PEI do paciente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PeiPage,
});

const statusTone: Record<string, string> = {
  "Em andamento": "bg-primary-soft text-primary border-0",
  Atingida: "bg-success/15 text-success border-0",
  Suspensa: "bg-warning/20 text-warning-foreground border-0",
};

function PeiPage() {
  const { patientId } = useParams({ from: "/pei/$patientId" });
  const currentUser = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<{ id: string; name: string } | null>(null);
  const [goals, setGoals] = useState<PeiGoalItem[]>([]);
  const [history, setHistory] = useState<PeiHistoryItem[]>([]);

  useEffect(() => {
    let unmounted = false;
    setLoading(true);

    Promise.all([
      getPatientById({
        data: {
          patientId,
          userId: currentUser?.id || "u1",
          role: currentUser?.role || "admin",
        },
      }).catch(() => null),
      getPeiData({ data: { patientId } }).catch(() => ({ goals: [], history: [] })),
    ])
      .then(([pat, pei]) => {
        if (unmounted) return;
        setPatient(pat ? { id: pat.id, name: pat.name } : { id: patientId, name: "Paciente" });
        setGoals(pei.goals || []);
        setHistory(pei.history || []);
      })
      .finally(() => {
        if (!unmounted) setLoading(false);
      });

    return () => {
      unmounted = true;
    };
  }, [patientId, currentUser]);

  const achieved = goals.filter((g) => g.status === "Atingida").length;

  return (
    <AppLayout>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/patient/$patientId" params={{ patientId: patient?.id || patientId }}>
          <ArrowLeft className="size-4" /> Prontuário
        </Link>
      </Button>

      <PageHeader
        title="Plano de Ensino Individualizado"
        subtitle={`${patient?.name || "Paciente"} • ${goals.length} metas ativas • ${achieved} atingida(s)`}
        action={
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link to="/evolution/$patientId" params={{ patientId: patient?.id || patientId }}>
              <LineChart className="size-4" /> Ver evolução
            </Link>
          </Button>
        }
      />

      {loading ? (
        <Card className="p-12 text-center">
          <Loader2 className="size-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Carregando plano de ensino (PEI)...</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {goals.map((g) => {
              const pct = Math.min(100, Math.round((g.current / (g.target || 1)) * 100));
              return (
                <Card key={g.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{g.area}</p>
                        <CardTitle className="text-sm leading-snug mt-0.5">{g.goal}</CardTitle>
                      </div>
                      <Badge className={cn("shrink-0", statusTone[g.status] || "bg-muted text-muted-foreground")}>
                        {g.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Target className="size-3.5 mt-0.5 shrink-0" /> {g.criteria}
                    </p>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          Base {g.baseline}% → Meta {g.target}%
                        </span>
                        <span className="font-medium">{g.current}%</span>
                      </div>
                      <Progress value={pct} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{g.responsible}</span>
                      <span>Revisão: {g.review}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {goals.length === 0 && (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-muted-foreground">Nenhuma meta do PEI cadastrada para este paciente.</p>
            </Card>
          )}

          <Card className="mt-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="size-4 text-primary" /> Histórico de revisões
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma revisão histórica registrada.</p>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="w-20 shrink-0 text-xs text-muted-foreground pt-0.5">{h.date}</div>
                    <div className="min-w-0">
                      <p className="leading-snug">{h.note}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{h.author}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
