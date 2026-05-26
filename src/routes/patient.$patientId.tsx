import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { patients, repertoire, reinforcers, stereotypies, clinicalChecklist } from "@/lib/mock-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, FileText } from "lucide-react";

export const Route = createFileRoute("/patient/$patientId")({
  component: PatientPEP,
});

function PatientPEP() {
  const { patientId } = useParams({ from: "/patient/$patientId" });
  const p = patients.find((x) => x.id === patientId) ?? patients[0];

  return (
    <AppLayout>
      <Card className="mb-5 overflow-hidden">
        <div className="h-20 gradient-brand" />
        <CardContent className="p-5 pt-0">
          <div className="flex flex-col sm:flex-row gap-4 -mt-10">
            <Avatar className="size-20 ring-4 ring-background bg-primary-soft">
              <AvatarFallback className="text-2xl bg-primary-soft text-primary font-semibold">
                {p.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 sm:pt-10">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">{p.name}</h1>
                <Badge variant="secondary">{p.diagnosis}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {p.age} anos · Responsável: {p.guardian}
              </p>
            </div>
            <div className="sm:pt-10 flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/evolution/$patientId" params={{ patientId: p.id }}>
                  <TrendingUp className="size-4" /> Evolução
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/session/$patientId" params={{ patientId: p.id }}>
                  <FileText className="size-4" /> Nova sessão
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="repertoire">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
          <TabsTrigger value="repertoire">Repertório Inicial</TabsTrigger>
          <TabsTrigger value="reinforcers">Reforçadores</TabsTrigger>
          <TabsTrigger value="checklist">Checklist Clínico</TabsTrigger>
        </TabsList>

        <TabsContent value="repertoire" className="mt-4">
          <Accordion type="multiple" defaultValue={["Atenção"]} className="space-y-2">
            {Object.entries(repertoire).map(([cat, items]) => (
              <AccordionItem
                key={cat}
                value={cat}
                className="border border-border rounded-xl px-4 bg-card"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cat}</span>
                    <Badge variant="secondary" className="text-xs">
                      {items.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Habilidade</TableHead>
                        <TableHead className="w-[140px]">Nível</TableHead>
                        <TableHead className="w-[120px]">Início</TableHead>
                        <TableHead className="w-[120px]">Término</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>{s.skill}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                s.level === "Adquirido"
                                  ? "bg-success/15 text-success border-0"
                                  : s.level === "Em aquisição"
                                  ? "bg-warning/20 text-warning-foreground border-0"
                                  : "bg-muted text-muted-foreground border-0"
                              }
                            >
                              {s.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{s.start}</TableCell>
                          <TableCell className="text-muted-foreground">{s.end}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="reinforcers" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Itens reforçadores</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preferência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reinforcers.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.item}</TableCell>
                      <TableCell className="text-muted-foreground">{r.category}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            r.preference === "Alta"
                              ? "bg-success/15 text-success border-0"
                              : "bg-warning/20 text-warning-foreground border-0"
                          }
                        >
                          {r.preference}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Padrões autoestimulatórios</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Topografia</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Intensidade</TableHead>
                      <TableHead>Contexto</TableHead>
                      <TableHead>Função provável</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stereotypies.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>{s.category}</TableCell>
                        <TableCell>{s.topography}</TableCell>
                        <TableCell>{s.frequency}</TableCell>
                        <TableCell>{s.intensity}</TableCell>
                        <TableCell className="text-muted-foreground">{s.context}</TableCell>
                        <TableCell className="text-muted-foreground">{s.function}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <Card>
            <CardContent className="p-5 grid gap-4">
              <ChecklistField n={1} label="O que está acontecendo" value={clinicalChecklist.description} />
              <ChecklistField n={2} label="Contexto (demandas, pessoas)" value={clinicalChecklist.context} />
              <ChecklistField n={3} label="Padrão" value={clinicalChecklist.pattern} />
              <ChecklistField n={4} label="Hipótese inicial (função)" value={clinicalChecklist.hypothesis} />
              <ChecklistField n={5} label="O que falta no repertório" value={clinicalChecklist.missing} />
              <ChecklistField n={6} label="Prioridade clínica" value={clinicalChecklist.priority} />
              <Button className="w-fit">Salvar checklist</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function ChecklistField({ n, label, value }: { n: number; label: string; value: string }) {
  return (
    <div>
      <Label className="flex items-center gap-2 mb-1.5">
        <span className="size-5 rounded bg-primary text-primary-foreground text-[10px] font-semibold grid place-items-center">
          {n}
        </span>
        {label}
      </Label>
      <Textarea defaultValue={value} rows={2} />
    </div>
  );
}
