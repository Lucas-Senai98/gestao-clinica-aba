import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { AppLayout, PageHeader } from "@/components/app-layout";
import {
  addPeiReview,
  deletePeiGoal,
  getPeiData,
  savePeiGoal,
  suspendPeiGoal,
  type PeiGoalItem,
  type PeiHistoryItem,
} from "@/queries/pei";
import { getPatientById } from "@/queries/patients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Target, History, LineChart, Loader2, Plus, Pencil, Ban, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/pei/$patientId")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "PEI — Plano de Ensino Individualizado | Gestão Clínica ABA" },
      { name: "description", content: "Gestão completa das metas do PEI, revisões e histórico." },
    ],
  }),
  component: PeiPage,
});

const statusTone: Record<string, string> = {
  "Em andamento": "bg-primary-soft text-primary border-0",
  Atingida: "bg-success/15 text-success border-0",
  Suspensa: "bg-warning/20 text-warning-foreground border-0",
};

function emptyGoal(patientId: string) {
  return {
    id: "",
    patientId,
    area: "",
    goal: "",
    criteria: "",
    baseline: "0",
    current: "0",
    target: "80",
    status: "Em andamento",
    review: "",
  };
}

function PeiPage() {
  const { patientId } = useParams({ from: "/pei/$patientId" });
  const currentUser = useCurrentUser();
  const canEdit = currentUser?.role !== "parent";

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<{ id: string; name: string } | null>(null);
  const [goals, setGoals] = useState<PeiGoalItem[]>([]);
  const [history, setHistory] = useState<PeiHistoryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyGoal(patientId));

  const load = () => {
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
        setPatient(pat ? { id: pat.id, name: pat.name } : { id: patientId, name: "Paciente" });
        setGoals(pei.goals || []);
        setHistory(pei.history || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [patientId, currentUser]);

  const openNew = () => {
    setForm(emptyGoal(patientId));
    setShowForm(true);
  };

  const openEdit = (g: PeiGoalItem) => {
    setForm({
      id: g.id,
      patientId,
      area: g.area,
      goal: g.goal,
      criteria: g.criteria,
      baseline: String(g.baseline),
      current: String(g.current),
      target: String(g.target),
      status: g.status,
      review: g.review === "A definir" ? "" : g.review,
    });
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.area || !form.goal || !form.criteria) {
      toast.error("Preencha área, meta e critério.");
      return;
    }
    setSaving(true);
    try {
      await savePeiGoal({
        data: {
          id: form.id || undefined,
          patientId,
          area: form.area,
          goal: form.goal,
          criteria: form.criteria,
          baseline: Number(form.baseline) || 0,
          current: Number(form.current) || 0,
          target: Number(form.target) || 80,
          status: form.status as any,
          review: form.review || undefined,
        },
      });
      toast.success(form.id ? "Meta atualizada." : "Meta criada.");
      setShowForm(false);
      load();
    } catch (err) {
      toast.error("Erro ao salvar meta", { description: err instanceof Error ? err.message : "Erro" });
    } finally {
      setSaving(false);
    }
  };

  const review = async (g: PeiGoalItem) => {
    const note = prompt("Nota da revisão:");
    if (!note) return;
    const currentRaw = prompt("Progresso atual em %:", String(g.current));
    const current = currentRaw ? Number(currentRaw) : g.current;
    await addPeiReview({ data: { goalId: g.id, patientId, note, current } });
    toast.success("Revisão registrada.");
    load();
  };

  const suspend = async (g: PeiGoalItem) => {
    const reason = prompt("Motivo da suspensão:");
    if (reason === null) return;
    await suspendPeiGoal({ data: { goalId: g.id, patientId, reason } });
    toast.success("Meta suspensa.");
    load();
  };

  const remove = async (g: PeiGoalItem) => {
    if (!confirm("Excluir esta meta do PEI definitivamente?")) return;
    await deletePeiGoal({ data: { goalId: g.id, patientId } });
    toast.success("Meta excluída.");
    load();
  };

  const achieved = goals.filter((g) => g.status === "Atingida").length;

  return (
    <AppLayout>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/patient/$patientId" params={{ patientId }}>
          <ArrowLeft className="size-4" /> Prontuário
        </Link>
      </Button>

      <PageHeader
        title="Plano de Ensino Individualizado"
        subtitle={`${patient?.name || "Paciente"} • ${goals.length} metas • ${achieved} atingida(s)`}
        action={
          <div className="flex gap-2">
            {canEdit && <Button size="sm" onClick={openNew}><Plus className="size-4" /> Nova meta</Button>}
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/evolution/$patientId" params={{ patientId }}>
                <LineChart className="size-4" /> Ver evolução
              </Link>
            </Button>
          </div>
        }
      />

      {showForm && (
        <Card className="mb-5 border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label className="text-xs">Área</Label><Input className="mt-1" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} placeholder="Comunicação" /></div>
              <div><Label className="text-xs">Revisão prevista</Label><Input className="mt-1" type="date" value={form.review} onChange={(e) => setForm((f) => ({ ...f, review: e.target.value }))} /></div>
              <div className="md:col-span-2"><Label className="text-xs">Meta</Label><Textarea className="mt-1" rows={2} value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} /></div>
              <div className="md:col-span-2"><Label className="text-xs">Critério de domínio</Label><Textarea className="mt-1" rows={2} value={form.criteria} onChange={(e) => setForm((f) => ({ ...f, criteria: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Base</Label><Input className="mt-1" type="number" value={form.baseline} onChange={(e) => setForm((f) => ({ ...f, baseline: e.target.value }))} /></div>
                <div><Label className="text-xs">Atual</Label><Input className="mt-1" type="number" value={form.current} onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))} /></div>
                <div><Label className="text-xs">Meta %</Label><Input className="mt-1" type="number" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} /></div>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Em andamento", "Atingida", "Suspensa"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <><Save className="size-4" /> Salvar</>}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card className="p-12 text-center">
          <Loader2 className="size-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Carregando PEI...</p>
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
                      <Badge className={cn("shrink-0", statusTone[g.status] || "bg-muted text-muted-foreground")}>{g.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Target className="size-3.5 mt-0.5 shrink-0" /> {g.criteria}
                    </p>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Base {g.baseline}% → Meta {g.target}%</span>
                        <span className="font-medium">{g.current}%</span>
                      </div>
                      <Progress value={pct} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{g.responsible}</span>
                      <span>Revisão: {g.review}</span>
                    </div>
                    {canEdit && (
                      <div className="flex flex-wrap justify-end gap-1 pt-2 border-t">
                        <Button size="sm" variant="outline" onClick={() => review(g)}>Revisar</Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(g)}><Pencil className="size-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => suspend(g)}><Ban className="size-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(g)}><Trash2 className="size-4 text-destructive" /></Button>
                      </div>
                    )}
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
