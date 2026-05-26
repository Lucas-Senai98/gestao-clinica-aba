import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { therapistHours } from "@/lib/mock-data";
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

export const Route = createFileRoute("/admin/hours")({
  component: HoursPage,
});

function HoursPage() {
  const total = therapistHours.reduce((s, r) => s + r.hours, 0);
  return (
    <AppLayout>
      <PageHeader
        title="Controle de horas"
        subtitle="Horas trabalhadas pelos terapeutas por dia e sessão."
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Horas totais (semana)</p>
            <p className="text-2xl font-semibold">{total.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sessões registradas</p>
            <p className="text-2xl font-semibold">
              {therapistHours.reduce((s, r) => s + r.sessions, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Profissionais ativos</p>
            <p className="text-2xl font-semibold">
              {new Set(therapistHours.map((r) => r.therapist)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
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
              {therapistHours.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.therapist}</TableCell>
                  <TableCell className="text-muted-foreground">{r.date}</TableCell>
                  <TableCell className="text-right">{r.sessions}</TableCell>
                  <TableCell className="text-right font-medium">{r.hours.toFixed(1)}h</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className={
                        i % 4 === 0
                          ? "bg-warning/20 text-warning-foreground border-0"
                          : "bg-success/15 text-success border-0"
                      }
                    >
                      {i % 4 === 0 ? "Pendente" : "Aprovado"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
