import { createFileRoute, Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { requireAuth } from "@/lib/route-guard";
import { useCurrentUser } from "@/lib/auth-context";
import { getSessionRecordDetail, saveDailyRecord } from "@/queries/sessions";
import { getPatientById } from "@/queries/patients";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Target,
  Activity,
  Flame,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Tipos locais ──────────────────────────────────────────────────────────────

type TargetItem = {
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

type SessionTab = "geral" | "programas" | "comportamentos" | "notas";

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcPct(correct: number, trials: number): number {
  if (trials <= 0) return 0;
  return Math.round((correct / trials) * 100);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function formatSeconds(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const intensityConfig = {
  Leve: {
    base:     "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    selected: "border-emerald-600 bg-emerald-600 text-white shadow-sm",
    dot:      "bg-emerald-500",
    label:    "Leve",
  },
  Moderada: {
    base:     "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    selected: "border-amber-600 bg-amber-600 text-white shadow-sm",
    dot:      "bg-amber-500",
    label:    "Moderada",
  },
  Intensa: {
    base:     "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
    selected: "border-rose-600 bg-rose-600 text-white shadow-sm",
    dot:      "bg-rose-600",
    label:    "Intensa",
  },
} as const;

// ── Rota ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/session/$patientId")({
  beforeLoad: requireAuth(),
  validateSearch: (search: Record<string, unknown>): { recordId?: string } => ({
    recordId: typeof search.recordId === "string" ? search.recordId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Folha de Registro de Sessão ABA — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Diário de sessão ABA mobile-first com cronômetro em tempo real, navegação por abas e registro tátil de tentativas.",
      },
    ],
  }),
  component: SessionForm,
});

// ── Componente Principal ──────────────────────────────────────────────────────

function SessionForm() {
  const { patientId } = useParams({ from: "/session/$patientId" });
  const { recordId } = useSearch({ from: "/session/$patientId" });
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [patient, setPatient] = useState<{ id: string; name: string } | null>(null);

  // ── Abas de Navegação (Mobile Bottom Bar & Desktop Tabs) ─────────────────────
  const [activeTab, setActiveTab] = useState<SessionTab>("programas");

  // ── Cronômetro Clínico Ativo (Sticky Timer) ─────────────────────────────────
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Sincroniza a duração em minutos automaticamente com o cronômetro
  useEffect(() => {
    if (timerSeconds > 0 && timerSeconds % 60 === 0) {
      setDurationMin(Math.max(1, Math.round(timerSeconds / 60)));
    }
  }, [timerSeconds]);

  const handleResetTimer = () => {
    if (confirm("Deseja zerar o cronômetro desta sessão?")) {
      setTimerSeconds(0);
      setTimerRunning(false);
    }
  };

  const handleSyncTimerToDuration = () => {
    const mins = Math.max(1, Math.round(timerSeconds / 60));
    setDurationMin(mins);
    toast.info(`Duração ajustada para ${mins} min de acordo com o cronômetro.`);
  };

  // ── Carregamento de Dados Iniciais ──────────────────────────────────────────
  useEffect(() => {
    if (currentUser) {
      getPatientById({
        data: {
          patientId,
          userId: currentUser.id,
          role: currentUser.role,
        },
      })
        .then((p) => setPatient({ id: p.id, name: p.name }))
        .catch(() => setPatient({ id: patientId, name: "Paciente" }));
    }
  }, [patientId, currentUser]);

  useEffect(() => {
    if (!recordId) return;
    getSessionRecordDetail({ data: { recordId } })
      .then((res) => {
        if (!res) return;
        const r = res.record as any;
        setSessionDate(String(r.session_date || todayISO()));
        setSessionTime(String(r.session_time || nowTime()).slice(0, 5));
        const dMin = r.duration_min ? Number(r.duration_min) : 50;
        setDurationMin(dMin);
        setTimerSeconds(dMin * 60);
        setTimerRunning(false);
        setCooperation(Number(r.cooperation) === 1);
        setAttention(Number(r.attention) === 1);
        setInappropriate(Number(r.inappropriate) === 1);
        setTransitions((r.transitions || "facil") as any);
        setEyeContact((r.eye_contact || "adequado") as any);
        setCommunication((r.communication || "parcial") as any);
        setReinforcers(String(r.reinforcers_used || ""));
        setGeneralNotes(String(r.general_notes || ""));
        if (res.targets) {
          setTargets(
            res.targets.map((t: any) => ({
              id: String(t.id),
              name: String(t.target_name || ""),
              trials: Number(t.trials) || 0,
              correct: Number(t.correct) || 0,
            })),
          );
        }
        if (res.behaviors) {
          setBehaviors(
            res.behaviors.map((b: any) => ({
              id: String(b.id),
              topography: String(b.topography || ""),
              duration_min: b.duration_min == null ? "" : Number(b.duration_min),
              intensity: (b.intensity || "") as any,
              context: String(b.context || ""),
            })),
          );
        }
      })
      .catch((err) => toast.error("Erro ao carregar sessão", { description: err instanceof Error ? err.message : "Erro" }));
  }, [recordId]);

  // ── Estado: Cabeçalho da Sessão ─────────────────────────────────────────────
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [sessionTime, setSessionTime] = useState(nowTime());
  const [durationMin, setDurationMin] = useState<number | "">(50);

  // ── Estado: Seção 1 — Comportamentos de Prontidão ───────────────────────────
  const [cooperation,   setCooperation]   = useState(true);
  const [attention,     setAttention]     = useState(true);
  const [inappropriate, setInappropriate] = useState(false);
  const [transitions,   setTransitions]   = useState<"facil" | "moderada" | "dificil">("facil");
  const [eyeContact,    setEyeContact]    = useState<"adequado" | "parcial" | "ausente">("adequado");
  const [communication, setCommunication] = useState<"adequada" | "parcial" | "ausente">("parcial");

  // ── Estado: Seção 2 — Programas de Ensino ───────────────────────────────────
  const [targets, setTargets] = useState<TargetItem[]>([
    { id: "1", name: "Pareamento por cor",      trials: 10, correct: 8 },
    { id: "2", name: "Imitação motora grossa",  trials: 8,  correct: 6 },
  ]);

  const addTarget = useCallback(() => {
    setTargets((ts) => [...ts, { id: crypto.randomUUID(), name: "", trials: 0, correct: 0 }]);
    setActiveTab("programas");
  }, []);

  const updateTarget = useCallback((id: string, patch: Partial<TargetItem>) => {
    setTargets((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const removeTarget = useCallback((id: string) => {
    setTargets((ts) => ts.filter((t) => t.id !== id));
  }, []);

  // Helpers de incremento tátil rápido para mobile
  const incrementCorrect = (id: string) => {
    setTargets((ts) =>
      ts.map((t) =>
        t.id === id ? { ...t, trials: t.trials + 1, correct: t.correct + 1 } : t,
      ),
    );
  };

  const incrementIncorrect = (id: string) => {
    setTargets((ts) =>
      ts.map((t) =>
        t.id === id ? { ...t, trials: t.trials + 1 } : t,
      ),
    );
  };

  const decrementTrial = (id: string) => {
    setTargets((ts) =>
      ts.map((t) => {
        if (t.id !== id || t.trials <= 0) return t;
        const newTrials = t.trials - 1;
        const newCorrect = Math.min(t.correct, newTrials);
        return { ...t, trials: newTrials, correct: newCorrect };
      }),
    );
  };

  // ── Estado: Seção 3 — Reforçadores e Observações ───────────────────────────
  const [reinforcers, setReinforcers] = useState(
    "Bolhas de sabão (após cada bloco), elogio social, biscoito recheado ao final.",
  );
  const [generalNotes, setGeneralNotes] = useState(
    "Paciente chegou receptivo. Ótima resposta no bloco de imitação motora e contato visual consistente.",
  );

  // ── Estado: Seção 4 — Comportamentos-Problema ──────────────────────────────
  const [behaviors, setBehaviors] = useState<BehaviorEntry[]>([]);

  const addBehavior = () => {
    setBehaviors((bs) => [
      ...bs,
      { id: crypto.randomUUID(), topography: "", duration_min: "", intensity: "", context: "" },
    ]);
    setActiveTab("comportamentos");
  };

  const updateBehavior = (id: string, patch: Partial<BehaviorEntry>) => {
    setBehaviors((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBehavior = (id: string) => {
    setBehaviors((bs) => bs.filter((b) => b.id !== id));
  };

  // ── Submissão ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  const handleSave = async (isQuickDraft = false) => {
    if (!sessionDate) {
      toast.error("Informe a data da sessão.");
      setActiveTab("geral");
      return;
    }
    const filledTargets = targets.filter((t) => t.name.trim());
    if (filledTargets.length === 0) {
      toast.error("Registre ao menos um programa de ensino com nome.");
      setActiveTab("programas");
      return;
    }

    const filledBehaviors = behaviors.filter((b) => b.topography.trim());
    const invalidBehavior = filledBehaviors.find((b) => !b.intensity);
    if (invalidBehavior) {
      toast.error(`Selecione a intensidade do comportamento "${invalidBehavior.topography}".`);
      setActiveTab("comportamentos");
      return;
    }

    setSaving(true);
    try {
      const calculatedDuration = durationMin !== "" ? Number(durationMin) : Math.max(1, Math.round(timerSeconds / 60));

      const result = await saveDailyRecord({
        data: {
          patientId,
          recordId,
          sessionDate,
          sessionTime:  sessionTime || undefined,
          durationMin:  calculatedDuration,
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

      if (isQuickDraft) {
        toast.success("Rascunho da sessão salvo com sucesso! 💾", {
          description: "Os dados foram preservados no banco D1.",
        });
      } else {
        toast.success(recordId ? "Folha de registro atualizada com sucesso! ✅" : "Folha de registro salva com sucesso! ✅", {
          description: `Sessão de ${patient?.name ?? "Paciente"} arquivada no prontuário (${result.targets_saved} programa${result.targets_saved !== 1 ? "s" : ""}${result.behaviors_saved > 0 ? ` · ${result.behaviors_saved} comportamento${result.behaviors_saved !== 1 ? "s" : ""}` : ""}).`,
          duration: 4000,
        });
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar. Verifique sua conexão e tente novamente.";
      toast.error("Erro ao salvar registro", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const filledTargetsCount = targets.filter((t) => t.name.trim()).length;
  const filledBehaviorsCount = behaviors.filter((b) => b.topography.trim()).length;

  return (
    <AppLayout hideMobileNav>
      {/* ── STICKY HEADER COM CRONÔMETRO ATIVO DA SESSÃO ───────────────────── */}
      <header className="sticky top-0 z-20 -mx-4 md:-mx-8 -mt-5 md:-mt-7 mb-4 px-4 md:px-8 py-2.5 bg-background/95 backdrop-blur-md border-b border-border shadow-xs flex items-center justify-between gap-3">
        {/* Paciente e Voltar */}
        <div className="flex items-center gap-2 min-w-0">
          <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
            <Link to="/">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="size-8 bg-primary/10 border border-primary/20 shrink-0">
              <AvatarFallback className="text-[11px] font-bold text-primary">
                {patient?.name?.slice(0, 2).toUpperCase() ?? "PA"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold truncate leading-tight">
                {patient?.name ?? "Carregando..."}
              </p>
              <p className="text-[10px] text-muted-foreground truncate hidden sm:block">
                {recordId ? "Edição de Sessão" : "Coleta Clínica ABA"}
              </p>
            </div>
          </div>
        </div>

        {/* Cronômetro Clínico Compacto */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 bg-card px-2.5 sm:px-3 py-1 rounded-full border border-border shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full",
                timerRunning ? "bg-emerald-500 animate-pulse" : "bg-amber-500",
              )}
            />
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-foreground">
              {formatSeconds(timerSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-0.5 border-l border-border pl-1.5 sm:pl-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setTimerRunning(!timerRunning)}
              className={cn(
                "size-6 sm:size-7 rounded-full",
                timerRunning ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40" : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
              )}
              title={timerRunning ? "Pausar Cronômetro" : "Iniciar Cronômetro"}
            >
              {timerRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5 fill-current" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleResetTimer}
              className="size-6 sm:size-7 rounded-full text-muted-foreground hover:text-foreground"
              title="Zerar Cronômetro"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Botão de Salvamento Rápido no Topo */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={saving}
            variant="outline"
            className="hidden sm:inline-flex text-xs h-8 px-2.5"
            title="Salvar rascunho sem sair"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5 mr-1" />}
            Rascunho
          </Button>

          <Button
            size="sm"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="text-xs h-8 px-3 shadow-xs bg-primary text-primary-foreground"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="size-3.5 mr-1" />
                <span className="hidden sm:inline">Concluir</span>
                <span className="sm:hidden">Salvar</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* ── BARRA DE ABAS EM DESKTOP (MD+) ─────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-1.5 mb-5 p-1 bg-muted/60 rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setActiveTab("geral")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all",
            activeTab === "geral"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50",
          )}
        >
          <Activity className="size-4 text-primary" />
          1. Geral & Conduta
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("programas")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all",
            activeTab === "programas"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50",
          )}
        >
          <Target className="size-4 text-emerald-600" />
          2. Programas ABA
          {filledTargetsCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold">
              {filledTargetsCount}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("comportamentos")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all",
            activeTab === "comportamentos"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50",
          )}
        >
          <Flame className="size-4 text-amber-600" />
          3. Comportamentos
          {filledBehaviorsCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800 text-[10px] h-4 px-1.5 font-bold border-0">
              {filledBehaviorsCount}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notas")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all",
            activeTab === "notas"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50",
          )}
        >
          <FileText className="size-4 text-purple-600" />
          4. Notas & Devolutiva
        </button>
      </div>

      {/* ── CONTEÚDO DAS ABAS ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* ── ABA 1: GERAL & CONDUTA ───────────────────────────────────────── */}
        {activeTab === "geral" && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            <Card>
              <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Terapeuta
                  </p>
                  <p className="text-sm font-medium">{currentUser?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Data da Sessão
                  </p>
                  <Input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Horário Início
                  </p>
                  <Input
                    type="time"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Duração (min)
                    </p>
                    <button
                      type="button"
                      onClick={handleSyncTimerToDuration}
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      Puxar do Timer
                    </button>
                  </div>
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
              </CardContent>
            </Card>

            <SectionHeader
              icon={Activity}
              title="Disposição Geral e Prontidão"
              subtitle="Parâmetros de engajamento e autorregulação durante o atendimento."
            />

            <Card>
              <CardContent className="p-4 space-y-1">
                <ToggleRow
                  label="Cooperação com o terapeuta"
                  value={cooperation}
                  onChange={setCooperation}
                />
                <ToggleRow
                  label="Atenção sustentada à tarefa"
                  value={attention}
                  onChange={setAttention}
                />
                <ToggleRow
                  label="Respostas inadequadas / oposição"
                  value={inappropriate}
                  onChange={setInappropriate}
                  danger
                />

                <div className="h-px bg-border my-3" />

                <RadioRow
                  label="Transições entre atividades"
                  value={transitions}
                  onChange={(v) => setTransitions(v as typeof transitions)}
                  options={[
                    { v: "facil",    l: "Fácil" },
                    { v: "moderada", l: "Moderada" },
                    { v: "dificil",  l: "Difícil" },
                  ]}
                />
                <RadioRow
                  label="Contato visual com o aplicador"
                  value={eyeContact}
                  onChange={(v) => setEyeContact(v as typeof eyeContact)}
                  options={[
                    { v: "adequado", l: "Adequado" },
                    { v: "parcial",  l: "Parcial" },
                    { v: "ausente",  l: "Ausente" },
                  ]}
                />
                <RadioRow
                  label="Comunicação funcional / Mandos"
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

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => setActiveTab("programas")}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5"
              >
                Avançar para Programas ABA <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── ABA 2: PROGRAMAS DE ENSINO ABA ──────────────────────────────── */}
        {activeTab === "programas" && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <SectionHeader
                icon={Target}
                title="Programas de Ensino & Tentativas Discretas (DTT)"
                subtitle="Toque em + Acerto ou + Erro para registrar as tentativas rapidamente no tablet/celular."
              />
              <Button size="sm" onClick={addTarget} variant="outline" className="text-xs h-8">
                <Plus className="size-3.5 mr-1" /> Novo Programa
              </Button>
            </div>

            <div className="space-y-3">
              {targets.map((t, idx) => {
                const pct = calcPct(t.correct, t.trials);
                const tone =
                  pct >= 80
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : pct >= 50
                      ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300"
                      : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300";

                return (
                  <Card key={t.id} className="border-border shadow-2xs overflow-hidden">
                    <CardContent className="p-3.5 sm:p-4 space-y-3">
                      {/* Linha Superior: Nome do Alvo + Desempenho + Remover */}
                      <div className="flex items-start gap-2 justify-between">
                        <div className="flex-1 min-w-0">
                          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                            Programa #{idx + 1}
                          </Label>
                          <Input
                            value={t.name}
                            onChange={(e) => updateTarget(t.id, { name: e.target.value })}
                            placeholder="Ex: Imitação Motora, Mando com PECS, Pareamento..."
                            className="text-sm font-medium h-9"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pt-5">
                          <Badge className={cn("text-xs font-bold px-2.5 py-1 border", tone)}>
                            {pct}% ({t.correct}/{t.trials})
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTarget(t.id)}
                            disabled={targets.length === 1}
                            className="size-8 text-muted-foreground hover:text-destructive"
                            title="Remover Programa"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Botões Táteis Rápidos (Otimizado para Polegar em Mobile) */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => incrementCorrect(t.id)}
                          className="h-11 flex flex-col items-center justify-center bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 select-none active:scale-95 transition-transform"
                        >
                          <span className="text-xs font-bold flex items-center gap-1">
                            <Plus className="size-3 stroke-[3]" /> Acerto
                          </span>
                          <span className="text-[10px] opacity-80 font-normal">
                            {t.correct} acertos
                          </span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => incrementIncorrect(t.id)}
                          className="h-11 flex flex-col items-center justify-center bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100 hover:text-rose-900 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300 select-none active:scale-95 transition-transform"
                        >
                          <span className="text-xs font-bold flex items-center gap-1">
                            <Plus className="size-3 stroke-[3]" /> Erro
                          </span>
                          <span className="text-[10px] opacity-80 font-normal">
                            {t.trials - t.correct} erros
                          </span>
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => decrementTrial(t.id)}
                          disabled={t.trials <= 0}
                          className="h-11 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted select-none active:scale-95 transition-transform"
                        >
                          <span className="text-xs font-medium flex items-center gap-1">
                            <Minus className="size-3" /> Desfazer
                          </span>
                          <span className="text-[10px] opacity-70">
                            {t.trials} total
                          </span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Button variant="outline" onClick={addTarget} className="w-full border-dashed py-5">
              <Plus className="size-4 mr-1.5" /> Adicionar Outro Programa de Ensino
            </Button>

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setActiveTab("geral")}>
                <ArrowLeft className="size-4 mr-1" /> Voltar
              </Button>
              <Button type="button" size="sm" onClick={() => setActiveTab("comportamentos")}>
                Comportamentos-Problema <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── ABA 3: COMPORTAMENTOS-PROBLEMA ──────────────────────────────── */}
        {activeTab === "comportamentos" && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <SectionHeader
                icon={Flame}
                title="Comportamentos-Problema e Crises"
                subtitle="Monitore topografia, duração e intensidade das crises ocorridas na sessão."
              />
              <Button size="sm" onClick={addBehavior} variant="outline" className="text-xs h-8">
                <Plus className="size-3.5 mr-1" /> Registrar Crise
              </Button>
            </div>

            {behaviors.length === 0 ? (
              <Card className="border-dashed p-8 text-center bg-muted/20">
                <CheckCircle2 className="size-10 text-emerald-600 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-medium">Nenhum comportamento-problema registrado.</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Gabriel manteve-se regulado durante o atendimento. Se ocorrer alguma crise, toque no botão abaixo:
                </p>
                <Button size="sm" variant="outline" onClick={addBehavior}>
                  <Plus className="size-3.5 mr-1" /> Adicionar Ocorrência Comportamental
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {behaviors.map((b, idx) => (
                  <Card key={b.id} className="border-border shadow-2xs">
                    <CardContent className="p-3.5 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Ocorrência #{idx + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBehavior(b.id)}
                          className="size-7 text-muted-foreground hover:text-destructive"
                          title="Remover"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block">Topografia do Comportamento *</Label>
                        <Input
                          value={b.topography}
                          onChange={(e) => updateBehavior(b.id, { topography: e.target.value })}
                          placeholder="Ex: Crise de fuga da mesa, atirar objetos, autoagressão..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <Label className="text-xs mb-1 block">Duração (minutos)</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.5}
                            placeholder="Ex: 5"
                            value={b.duration_min}
                            onChange={(e) =>
                              updateBehavior(b.id, {
                                duration_min: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Contexto / Antecedente</Label>
                          <Input
                            value={b.context}
                            onChange={(e) => updateBehavior(b.id, { context: e.target.value })}
                            placeholder="Ex: Transição de brinquedo"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs mb-1.5 block">Intensidade Clínica *</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["Leve", "Moderada", "Intensa"] as const).map((lvl) => {
                            const cfg = intensityConfig[lvl];
                            const active = b.intensity === lvl;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => updateBehavior(b.id, { intensity: lvl })}
                                className={cn(
                                  "flex items-center justify-center gap-1.5 rounded-lg border-2 px-2.5 py-2 text-xs sm:text-sm font-medium transition-all select-none",
                                  active ? cfg.selected : cfg.base,
                                )}
                              >
                                <span
                                  className={cn(
                                    "size-2 rounded-full shrink-0",
                                    active ? "bg-white" : cfg.dot,
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setActiveTab("programas")}>
                <ArrowLeft className="size-4 mr-1" /> Voltar
              </Button>
              <Button type="button" size="sm" onClick={() => setActiveTab("notas")}>
                Notas & Devolutiva <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── ABA 4: NOTAS & DEVOLUTIVA ────────────────────────────────────── */}
        {activeTab === "notas" && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            <SectionHeader
              icon={FileText}
              title="Reforçadores, Notas Clínicas e Devolutiva"
              subtitle="Registre os reforçadores entregues e observações para a equipe e família."
            />

            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Reforçadores Utilizados</Label>
                  <Textarea
                    rows={2}
                    placeholder="Quais reforçadores foram entregues e o esquema de reforçamento..."
                    value={reinforcers}
                    onChange={(e) => setReinforcers(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">Observações Gerais da Equipe</Label>
                  <Textarea
                    rows={3}
                    placeholder="Anote intercorrências, estado de saúde, sono, alimentação..."
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-primary/10 grid place-items-center shrink-0 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      Dica de Devolutiva Familiar
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ao concluir a folha de registro, você poderá publicar uma devolutiva afetuosa com 1 clique para os pais no Portal da Família!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="h-11 flex-1"
              >
                {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Save className="size-4 mr-1.5" />}
                Salvar Rascunho
              </Button>

              <Button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="h-11 flex-1 shadow-md bg-primary text-primary-foreground text-sm font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Salvando no Banco...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 mr-2" />
                    {recordId ? "Salvar Alterações da Sessão" : "Finalizar e Arquivar Sessão"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAVIGATION BAR EM MOBILE (< 768px) ───────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border shadow-lg">
        <div className="grid grid-cols-4 gap-1 px-1.5 py-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("geral")}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-medium transition-all select-none",
              activeTab === "geral"
                ? "text-primary font-bold bg-primary/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Activity className={cn("size-4 mb-0.5", activeTab === "geral" && "stroke-[2.5]")} />
            <span>Geral</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("programas")}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-medium transition-all relative select-none",
              activeTab === "programas"
                ? "text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Target className={cn("size-4 mb-0.5", activeTab === "programas" && "stroke-[2.5]")} />
            <span>Programas</span>
            {filledTargetsCount > 0 && (
              <span className="absolute top-1 right-2.5 size-4 bg-emerald-600 text-white rounded-full text-[9px] font-bold grid place-items-center">
                {filledTargetsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("comportamentos")}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-medium transition-all relative select-none",
              activeTab === "comportamentos"
                ? "text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Flame className={cn("size-4 mb-0.5", activeTab === "comportamentos" && "stroke-[2.5]")} />
            <span>Crises</span>
            {filledBehaviorsCount > 0 && (
              <span className="absolute top-1 right-2.5 size-4 bg-amber-600 text-white rounded-full text-[9px] font-bold grid place-items-center">
                {filledBehaviorsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notas")}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-medium transition-all select-none",
              activeTab === "notas"
                ? "text-purple-700 dark:text-purple-400 font-bold bg-purple-500/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileText className={cn("size-4 mb-0.5", activeTab === "notas" && "stroke-[2.5]")} />
            <span>Notas</span>
          </button>
        </div>
      </nav>
    </AppLayout>
  );
}

// ── Subcomponentes de Apoio ───────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 mb-1">
      <div className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0 mt-0.5">
        <Icon className="size-4" />
      </div>
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>}
      </div>
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
        {value && !danger && <CheckCircle2 className="size-4 text-emerald-600" />}
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
