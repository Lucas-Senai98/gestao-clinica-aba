import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { getTherapistHours, type TherapistHourItem } from "@/queries/approvals";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/hours")({
  beforeLoad: requireRole("admin"),
  head: () => ({
    meta: [
      { title: "Controle de Horas — Gestão Clínica ABA" },
      { name: "description", content: "Relatório de RH com horas trabalhadas e sessões realizadas por terapeuta, dia a dia." },
      { property: "og:title", content: "Controle de Horas — Gestão Clínica ABA" },
      { property: "og:description", content: "Horas trabalhadas e sessões por terapeuta, organizadas por dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HoursPage,
});

function HoursPage() {
  const [hoursList, setHoursList] = useState<TherapistHourItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTherapistHours()
      .then((data) => setHoursList(data || []))
      .catch(() => setHoursList([]))
      .finally(() => setLoading(false));
  }, []);

  const total = hoursList.reduce((s, r) => s + r.hours, 0);

  return (
    <AppLayout>
      <PageHeader
        title="Controle de horas"
        subtitle="Horas trabalhadas pelos terapeutas por dia e sessão."
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Horas totais (período)</p>
            <p className="text-2xl font-semibold">{total.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sessões registradas</p>
            <p className="text-2xl font-semibold">
              {hoursList.reduce((s, r) => s + r.sessions, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Profissionais com atendimentos</p>
            <p className="text-2xl font-semibold">
              {new Set(hoursList.map((r) => r.therapist)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="size-6 animate-spin mx-auto text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Calculando horas da equipe...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Terapeuta</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Sessões</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hoursList.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.therapist}</TableCell>
                    <TableCell className="text-muted-foreground">{r.date}</TableCell>
                    <TableCell className="text-right">{r.sessions}</TableCell>
                    <TableCell className="text-right font-medium">{r.hours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-success/15 text-success border-0">
                        Registrado
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {hoursList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground text-xs italic">
                      Nenhum atendimento registrado no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
