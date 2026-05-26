import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { patients } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/session/$patientId")({
  component: SessionForm,
});

type Target = { id: string; name: string; trials: number; correct: number };

function SessionForm() {
  const { patientId } = useParams({ from: "/session/$patientId" });
  const patient = patients.find((p) => p.id === patientId) ?? patients[0];

  const [cooperation, setCooperation] = useState(true);
  const [attention, setAttention] = useState(true);
  const [inappropriate, setInappropriate] = useState(false);
  const [transitions, setTransitions] = useState("facil");
  const [eyeContact, setEyeContact] = useState("adequado");
  const [communication, setCommunication] = useState("parcial");

  const [targets, setTargets] = useState<Target[]>([
    { id: "1", name: "Pareamento por cor", trials: 10, correct: 8 },
    { id: "2", name: "Imitação motora grossa", trials: 8, correct: 6 },
  ]);

  const addTarget = () =>
    setTargets((t) => [...t, { id: crypto.randomUUID(), name: "", trials: 0, correct: 0 }]);

  const updateTarget = (id: string, patch: Partial<Target>) =>
    setTargets((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const removeTarget = (id: string) => setTargets((ts) => ts.filter((t) => t.id !== id));

  const save = () => toast.success("Folha de registro salva!", { description: `Sessão de ${patient.name} arquivada no prontuário.` });

  return (
    <AppLayout>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </Button>
      <PageHeader
        title="Folha de Registro ABA"
        subtitle="Diário de sessão — preenchimento otimizado para mobile."
      />

      {/* Cabeçalho */}
      <Card className="mb-4">
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Paciente"><p className="font-medium text-sm">{patient.name}</p></Field>
          <Field label="Data"><p className="text-sm">27/05/2026</p></Field>
          <Field label="Horário"><p className="text-sm">14:00</p></Field>
          <Field label="Duração"><p className="text-sm">50 min</p></Field>
        </CardContent>
      </Card>

      {/* Seção 1 — Comportamentos */}
      <SectionTitle n={1}>Comportamentos</SectionTitle>
      <Card className="mb-4">
        <CardContent className="p-4 space-y-1">
          <ToggleRow label="Cooperação" value={cooperation} onChange={setCooperation} />
          <ToggleRow label="Atenção à tarefa" value={attention} onChange={setAttention} />
          <ToggleRow label="Respostas inadequadas" value={inappropriate} onChange={setInappropriate} danger />

          <div className="h-px bg-border my-3" />

          <RadioRow
            label="Transições"
            value={transitions}
            onChange={setTransitions}
            options={[
              { v: "facil", l: "Fácil" },
              { v: "moderada", l: "Moderada" },
              { v: "dificil", l: "Difícil" },
            ]}
          />
          <RadioRow
            label="Contato visual"
            value={eyeContact}
            onChange={setEyeContact}
            options={[
              { v: "adequado", l: "Adequado" },
              { v: "parcial", l: "Parcial" },
              { v: "ausente", l: "Ausente" },
            ]}
          />
          <RadioRow
            label="Comunicação funcional"
            value={communication}
            onChange={setCommunication}
            options={[
              { v: "adequada", l: "Adequada" },
              { v: "parcial", l: "Parcial" },
              { v: "ausente", l: "Ausente" },
            ]}
          />
        </CardContent>
      </Card>

      {/* Seção 2 — Programas */}
      <SectionTitle n={2}>Programas de Ensino</SectionTitle>
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          {targets.map((t) => {
            const pct = t.trials > 0 ? Math.round((t.correct / t.trials) * 100) : 0;
            const tone =
              pct >= 80 ? "bg-success/15 text-success" : pct >= 50 ? "bg-warning/20 text-warning-foreground" : "bg-destructive/15 text-destructive";
            return (
              <div key={t.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-5">
                  <Label className="text-xs">Alvo</Label>
                  <Input
                    value={t.name}
                    onChange={(e) => updateTarget(t.id, { name: e.target.value })}
                    placeholder="Ex: Identifica cores"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-xs">Tentativas</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={t.trials}
                    onChange={(e) => updateTarget(t.id, { trials: +e.target.value })}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-xs">Acertos</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={t.trials}
                    value={t.correct}
                    onChange={(e) => updateTarget(t.id, { correct: +e.target.value })}
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <Badge className={cn("w-full justify-center py-2 text-sm border-0", tone)}>
                    {pct}%
                  </Badge>
                </div>
                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTarget(t.id)}
                    aria-label="Remover alvo"
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            );
          })}
          <Button variant="outline" onClick={addTarget} className="w-full">
            <Plus className="size-4" /> Adicionar alvo
          </Button>
        </CardContent>
      </Card>

      {/* Seção 3 */}
      <SectionTitle n={3}>Reforçadores utilizados</SectionTitle>
      <Card className="mb-4">
        <CardContent className="p-4">
          <Textarea
            rows={3}
            placeholder="Liste os reforçadores e a forma de entrega..."
            defaultValue="Bolhas de sabão (após cada bloco), elogio social, biscoito recheado ao final."
          />
        </CardContent>
      </Card>

      {/* Seção 4 */}
      <SectionTitle n={4}>Observações gerais</SectionTitle>
      <Card className="mb-6">
        <CardContent className="p-4">
          <Textarea
            rows={4}
            placeholder="Anote intercorrências, marcos e ajustes do plano..."
            defaultValue="Paciente chegou agitado, levou 5 min para se acomodar. Ótima resposta no bloco de imitação."
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-20 md:bottom-4 flex gap-2">
        <Button onClick={save} className="flex-1 h-12 text-base shadow-lg">
          <Save className="size-5" /> Salvar registro
        </Button>
      </div>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-2">
      <div className="size-6 rounded-md bg-primary text-primary-foreground text-xs font-semibold grid place-items-center">
        {n}
      </div>
      <h2 className="text-sm font-semibold">{children}</h2>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  danger,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <label className="flex items-center justify-between py-2.5 cursor-pointer">
      <span className="text-sm flex items-center gap-2">
        {value && !danger && <CheckCircle2 className="size-4 text-success" />}
        {label}
      </span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );
}

function RadioRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="py-2">
      <p className="text-sm mb-2">{label}</p>
      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <label
            key={o.v}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm cursor-pointer transition-colors",
              value === o.v
                ? "border-primary bg-primary-soft text-primary font-medium"
                : "border-border hover:bg-muted"
            )}
          >
            <RadioGroupItem value={o.v} className="sr-only" />
            {o.l}
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
