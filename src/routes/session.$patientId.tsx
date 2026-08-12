import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { requireAuth } from "@/lib/route-guard";
import { useCurrentUser } from "@/lib/auth-context";
import { saveDailyRecord } from "@/queries/sessions";
import { patients } from "@/lib/mock-data";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, ArrowLeft, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Tipos locais ──────────────────────────────────────────────────────────────

type Target = {
  id: string;
  name: string;
  trials: number;
  correct: number;
};

type BehaviorEntry = {
  id: string;
  topography: string;
  duration_min: number | "";
  intensity: "Leve" | "Moderada" | "Intensa" | "";
  context: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fórmula clínica: (acertos / tentativas) × 100 */
function calcPct(correct: number, trials: number): number {
  if (trials <= 0) return 0;
  return Math.round((correct / trials) * 100);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5); // HH:MM
}

// ── Cores dos botões de intensidade ──────────────────────────────────────────

const intensityConfig = {
  Leve: {
    base:     "border-blue-300  bg-blue-50   text-blue-700",
    selected: "border-blue-500  bg-blue-500  text-white shadow-md",
    dot:      "bg-blue-500",
    label:    "Leve",
  },
  Moderada: {
    base:     "border-amber-400 bg-amber-50  text-amber-700",
    selected: "border-amber-500 bg-amber-500 text-white shadow-md",
    dot:      "bg-amber-500",
    label:    "Moderada",
  },
  Intensa: {
    base:     "border-rose-400  bg-rose-50   text-rose-700",
    selected: "border-rose-600  bg-rose-600  text-white shadow-md",
    dot:      "bg-rose-600",
    label:    "Intensa",
  },
} as const;

// ── Rota ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/session/$patientId")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Folha de Registro de Sessão ABA — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Diário de sessão ABA mobile-first: comportamentos, programas de ensino, reforçadores e comportamentos-problema.",
      },
    ],
  }),
  component: SessionForm,
});

// ── Componente principal ──────────────────────────────────────────────────────

function SessionForm() {
  const { patientId } = useParams({ from: "/session/$patientId" });
  const navigate      = useNavigate();
  const currentUser   = useCurrentUser();
  const patient       = patients.find((p) => p.id === patientId) ?? patients[0];

  // ── Estado: cabeçalho da sessão ───────────────────────────────────────────
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [sessionTime, setSessionTime] = useState(nowTime());
  const [durationMin, setDurationMin] = useState<number | "">(50);

  // ── Estado: seção 1 — comportamentos ─────────────────────────────────────
  const [cooperation,   setCooperation]   = useState(true);
  const [attention,     setAttention]     = useState(true);
  const [inappropriate, setInappropriate] = useState(false);
  const [transitions,   setTransitions]   = useState<"facil" | "moderada" | "dificil">("facil");
  const [eyeContact,    setEyeContact]    = useState<"adequado" | "parcial" | "ausente">("adequado");
  const [communication, setCommunication] = useState<"adequada" | "parcial" | "ausente">("parcial");

  // ── Estado: seção 2 — programas de ensino ────────────────────────────────
  const [targets, setTargets] = useState<Target[]>([
    { id: "1", name: "Pareamento por cor",      trials: 10, correct: 8 },
    { id: "2", name: "Imitação motora grossa",  trials: 8,  correct: 6 },
  ]);

  const addTarget = useCallback(() =>
    setTargets((ts) => [...ts, { id: crypto.randomUUID(), name: "", trials: 0, correct: 0 }]), []);

  const updateTarget = useCallback((id: string, patch: Partial<Target>) =>
    setTargets((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t))), []);

  const removeTarget = useCallback((id: string) =>
    setTargets((ts) => ts.filter((t) => t.id !== id)), []);

  // ── Estado: seção 3 — reforçadores e observações ─────────────────────────
  const [reinforcers, setReinforcers] = useState(
    "Bolhas de sabão (após cada bloco), elogio social, biscoito recheado ao final.",
  );
  const [generalNotes, setGeneralNotes] = useState(
    "Paciente chegou agitado, levou 5 min para se acomodar. Ótima resposta no bloco de imitação.",
  );

  // ── Estado: seção 4 — comportamentos-problema ────────────────────────────
  const [behaviors, setBehaviors] = useState<BehaviorEntry[]>([]);

  const addBehavior = () =>
    setBehaviors((bs) => [
      ...bs,
      { id: crypto.randomUUID(), topography: "", duration_min: "", intensity: "", context: "" },
    ]);

  const updateBehavior = (id: string, patch: Partial<BehaviorEntry>) =>
    setBehaviors((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const removeBehavior = (id: string) =>
    setBehaviors((bs) => bs.filter((b) => b.id !== id));

  // ── Submissão ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Validações locais antes de enviar
    if (!sessionDate) {
      toast.error("Informe a data da sessão.");
      return;
    }
    const filledTargets = targets.filter((t) => t.name.trim());
    if (filledTargets.length === 0) {
      toast.error("Registre ao menos um programa de ensino com nome.");
      return;
    }

    // Valida comportamentos-problema: exige intensidade se topografia preenchida
    const filledBehaviors = behaviors.filter((b) => b.topography.trim());
    const invalidBehavior = filledBehaviors.find((b) => !b.intensity);
    if (invalidBehavior) {
      toast.error(
        `Selecione a intensidade do comportamento "${invalidBehavior.topography}".`,
      );
      return;
    }

    setSaving(true);
    try {
      const result = await saveDailyRecord({
        data: {
          patientId,
          sessionDate,
          sessionTime:  sessionTime || undefined,
          durationMin:  durationMin !== "" ? Number(durationMin) : undefined,
          cooperation,
          attention,
          inappropriate,
          transitions,
          eyeContact,
          communication,
          targets: filledTargets.map((t) => ({
            name:    t.name.trim(),
            trials:  t.trials,
            correct: Math.min(t.correct, t.trials),
          })),
          reinforcersUsed: reinforcers || undefined,
          generalNotes:    generalNotes || undefined,
          behaviors: filledBehaviors
            .filter((b) => b.intensity !== "")
            .map((b) => ({
              topography:   b.topography.trim(),
              duration_min: b.duration_min !== "" ? Number(b.duration_min) : undefined,
              intensity:    b.intensity as "Leve" | "Moderada" | "Intensa",
              context:      b.context.trim() || undefined,
            })),
        },
      });

      toast.success("Folha de registro salva com sucesso! ✅", {
        description: `Sessão de ${patient.name} arquivada no prontuário (${result.targets_saved} programa${result.targets_saved !== 1 ? "s" : ""}${result.behaviors_saved > 0 ? ` · ${result.behaviors_saved} comportamento${result.behaviors_saved !== 1 ? "s" : ""}` : ""}).`,
        duration: 4000,
      });

      // Redireciona ao dashboard do terapeuta
      navigate({ to: "/" });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao salvar. Verifique sua conexão e tente novamente.";
      toast.error("Erro ao salvar registro", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

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

      {/* ── Cabeçalho da sessão ──────────────────────────────────────────── */}
      <Card className="mb-4">
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              Paciente
            </p>
            <p className="font-medium text-sm">{patient.name}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              Terapeuta
            </p>
            <p className="text-sm">{currentUser?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              Data
            </p>
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                Horário
              </p>
              <Input
                type="time"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                Duração (min)
              </p>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={480}
                value={durationMin}
                onChange={(e) =>
                  setDurationMin(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Seção 1: Comportamentos ───────────────────────────────────────── */}
      <SectionTitle n={1}>Comportamentos</SectionTitle>
      <Card className="mb-4">
        <CardContent className="p-4 space-y-1">
          <ToggleRow
            label="Cooperação"
            value={cooperation}
            onChange={setCooperation}
          />
          <ToggleRow
            label="Atenção à tarefa"
            value={attention}
            onChange={setAttention}
          />
          <ToggleRow
            label="Respostas inadequadas"
            value={inappropriate}
            onChange={setInappropriate}
            danger
          />

          <div className="h-px bg-border my-3" />

          <RadioRow
            label="Transições"
            value={transitions}
            onChange={(v) => setTransitions(v as typeof transitions)}
            options={[
              { v: "facil",    l: "Fácil" },
              { v: "moderada", l: "Moderada" },
              { v: "dificil",  l: "Difícil" },
            ]}
          />
          <RadioRow
            label="Contato visual"
            value={eyeContact}
            onChange={(v) => setEyeContact(v as typeof eyeContact)}
            options={[
              { v: "adequado", l: "Adequado" },
              { v: "parcial",  l: "Parcial" },
              { v: "ausente",  l: "Ausente" },
            ]}
          />
          <RadioRow
            label="Comunicação funcional"
            value={communication}
            onChange={(v) => setCommunication(v as typeof communication)}
            options={[
              { v: "adequada", l: "Adequada" },
              { v: "parcial",  l: "Parcial" },
              { v: "ausente",  l: "Ausente" },
            ]}
          />
        </CardContent>
      </Card>

      {/* ── Seção 2: Programas de ensino ─────────────────────────────────── */}
      <SectionTitle n={2}>Programas de Ensino</SectionTitle>
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          {targets.map((t) => {
            const pct  = calcPct(t.correct, t.trials);
            const tone =
              pct >= 80
                ? "bg-success/15 text-success"
                : pct >= 50
                  ? "bg-amber-100 text-amber-700"
                  : "bg-destructive/15 text-destructive";

            return (
              <div key={t.id} className="grid grid-cols-12 gap-2 items-end">
                {/* Nome do alvo */}
                <div className="col-span-12 sm:col-span-5">
                  <Label className="text-xs mb-1 block">Alvo / Programa</Label>
                  <Input
                    value={t.name}
                    onChange={(e) => updateTarget(t.id, { name: e.target.value })}
                    placeholder="Ex: Identifica cores"
                  />
                </div>
                {/* Tentativas */}
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-xs mb-1 block">Tentativas</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={t.trials}
                    onChange={(e) =>
                      updateTarget(t.id, { trials: Math.max(0, +e.target.value) })
                    }
                  />
                </div>
                {/* Acertos */}
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-xs mb-1 block">Acertos</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={t.trials || undefined}
                    value={t.correct}
                    onChange={(e) =>
                      updateTarget(t.id, {
                        correct: Math.min(Math.max(0, +e.target.value), t.trials),
                      })
                    }
                  />
                </div>
                {/* % desempenho — atualização em tempo real */}
                <div className="col-span-3 sm:col-span-2">
                  <Label className="text-xs mb-1 block">Desempenho</Label>
                  <Badge
                    className={cn(
                      "w-full justify-center py-2 text-sm font-semibold border-0 transition-colors",
                      tone,
                    )}
                  >
                    {pct}%
                  </Badge>
                </div>
                {/* Remover */}
                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTarget(t.id)}
                    aria-label="Remover alvo"
                    disabled={targets.length === 1}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button variant="outline" onClick={addTarget} className="w-full mt-1">
            <Plus className="size-4" /> Adicionar programa
          </Button>
        </CardContent>
      </Card>

      {/* ── Seção 3: Reforçadores utilizados ─────────────────────────────── */}
      <SectionTitle n={3}>Reforçadores utilizados</SectionTitle>
      <Card className="mb-4">
        <CardContent className="p-4">
          <Textarea
            rows={3}
            placeholder="Liste os reforçadores e a forma de entrega..."
            value={reinforcers}
            onChange={(e) => setReinforcers(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* ── Seção 4: Comportamentos-Problema ─────────────────────────────── */}
      <SectionTitle n={4}>
        <span className="flex items-center gap-2">
          Comportamentos-Problema
          <span className="text-[10px] font-normal text-muted-foreground normal-case">
            (se houver)
          </span>
        </span>
      </SectionTitle>
      <Card className="mb-4">
        <CardContent className="p-4 space-y-4">
          {behaviors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum comportamento-problema registrado nesta sessão.
            </p>
          )}

          {behaviors.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-border p-3 space-y-3 bg-muted/20"
            >
              {/* Topografia */}
              <div>
                <Label className="text-xs mb-1 block">
                  Topografia do comportamento *
                </Label>
                <Input
                  value={b.topography}
                  onChange={(e) =>
                    updateBehavior(b.id, { topography: e.target.value })
                  }
                  placeholder="Ex: Jogar materiais no chão, choro intenso..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Duração */}
                <div>
                  <Label className="text-xs mb-1 block">
                    Duração (min)
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    placeholder="Ex: 3.5"
                    value={b.duration_min}
                    onChange={(e) =>
                      updateBehavior(b.id, {
                        duration_min:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>

                {/* Contexto */}
                <div>
                  <Label className="text-xs mb-1 block">Contexto</Label>
                  <Input
                    value={b.context}
                    onChange={(e) =>
                      updateBehavior(b.id, { context: e.target.value })
                    }
                    placeholder="Ex: Após demanda"
                  />
                </div>
              </div>

              {/* Intensidade — botões coloridos */}
              <div>
                <Label className="text-xs mb-2 block">
                  Intensidade *
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    ["Leve", "Moderada", "Intensa"] as const
                  ).map((lvl) => {
                    const cfg = intensityConfig[lvl];
                    const active = b.intensity === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => updateBehavior(b.id, { intensity: lvl })}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all",
                          active ? cfg.selected : cfg.base,
                        )}
                      >
                        <span
                          className={cn(
                            "size-2.5 rounded-full shrink-0",
                            active ? "bg-white/80" : cfg.dot,
                          )}
                        />
                        {lvl}
                      </button>
                    );
                  })}
                </div>
                {!b.intensity && b.topography && (
                  <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="size-3" />
                    Selecione a intensidade para salvar este comportamento.
                  </p>
                )}
              </div>

              {/* Remover comportamento */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBehavior(b.id)}
                  className="text-muted-foreground hover:text-destructive text-xs h-7"
                >
                  <Trash2 className="size-3.5" /> Remover
                </Button>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addBehavior}
            className="w-full border-dashed"
          >
            <Plus className="size-4" /> Registrar comportamento-problema
          </Button>
        </CardContent>
      </Card>

      {/* ── Seção 5: Observações gerais ──────────────────────────────────── */}
      <SectionTitle n={5}>Observações gerais</SectionTitle>
      <Card className="mb-6">
        <CardContent className="p-4">
          <Textarea
            rows={4}
            placeholder="Anote intercorrências, marcos e ajustes do plano..."
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* ── Botão de salvar — sticky no mobile ───────────────────────────── */}
      <div className="sticky bottom-20 md:bottom-4 flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-12 text-base shadow-lg"
        >
          {saving ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Salvando no banco...
            </>
          ) : (
            <>
              <Save className="size-5" />
              Salvar registro
            </>
          )}
        </Button>
      </div>
    </AppLayout>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SectionTitle({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
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
    <label className="flex items-center justify-between py-2.5 cursor-pointer select-none">
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
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="grid grid-cols-3 gap-2"
      >
        {options.map((o) => (
          <label
            key={o.v}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm cursor-pointer transition-colors select-none",
              value === o.v
                ? "border-primary bg-primary-soft text-primary font-medium"
                : "border-border hover:bg-muted",
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
