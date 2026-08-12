import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { requireAuth } from "@/lib/route-guard";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { patients } from "@/lib/mock-data";
import {
  CHECKLIST_STEPS,
  REPERTOIRE_TEMPLATE,
  SKILL_LEVELS,
  REINFORCER_CATEGORIES,
  STEREOTYPY_CATEGORIES,
  type SkillLevel,
} from "@/lib/pep-constants";
import {
  getClinicalChecklist,
  saveClinicalChecklist,
  getRepertoireRecords,
  saveRepertoireBatch,
  saveRepertoireRecord,
  getReinforcerData,
  saveReinforcerRecord,
  saveStereotypyRecord,
  deleteReinforcerRecord,
  deleteStereotypyRecord,
} from "@/queries/pep";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  TrendingUp,
  FileText,
  FileDown,
  Save,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/patient/$patientId")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Prontuário Eletrônico ABA — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "PEP completo: Checklist de 8 passos, Avaliação de Repertório Inicial (5 categorias), Mapeamento de Reforçadores e Autoestimulações.",
      },
    ],
  }),
  component: PatientPEP,
});

function PatientPEP() {
  const { patientId } = useParams({ from: "/patient/$patientId" });
  const p = patients.find((x) => x.id === patientId) ?? patients[0];

  return (
    <AppLayout>
      {/* Header do Paciente */}
      <Card className="mb-5 overflow-hidden border-primary/10 shadow-sm">
        <div className="h-20 bg-gradient-to-r from-primary/80 via-primary to-accent" />
        <CardContent className="p-5 pt-0">
          <div className="flex flex-col sm:flex-row gap-4 -mt-10">
            <Avatar className="size-20 ring-4 ring-background bg-primary-soft shadow-md">
              <AvatarFallback className="text-2xl bg-primary-soft text-primary font-semibold">
                {p.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 sm:pt-10">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">{p.name}</h1>
                <Badge variant="secondary" className="font-normal">
                  {p.diagnosis}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {p.age} anos · Responsável: {p.guardian}
              </p>
            </div>
            <div className="sm:pt-10 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/evolution/$patientId" params={{ patientId: p.id }}>
                  <TrendingUp className="size-4" /> Evolução
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm" className="border border-primary/20 bg-primary-soft text-primary hover:bg-primary/20">
                <Link to="/patients/$patientId/print-report" params={{ patientId: p.id }} target="_blank">
                  <FileDown className="size-4 mr-1" /> Exportar Relatório PDF
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

      {/* Tabs Principais do PEP */}
      <Tabs defaultValue="checklist" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto p-1 bg-muted/60">
          <TabsTrigger value="checklist" className="data-[state=active]:bg-background">
            Checklist Clínico (8 Passos)
          </TabsTrigger>
          <TabsTrigger value="repertoire" className="data-[state=active]:bg-background">
            Repertório Inicial (5 Áreas)
          </TabsTrigger>
          <TabsTrigger value="reinforcers" className="data-[state=active]:bg-background">
            Reforçadores & Autoestimulações
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CHECKLIST ABA (8 PASSOS) */}
        <TabsContent value="checklist">
          <ClinicalChecklistTab patientId={p.id} />
        </TabsContent>

        {/* TAB 2: REPERTÓRIO INICIAL (5 CATEGORIAS) */}
        <TabsContent value="repertoire">
          <RepertoireTab patientId={p.id} />
        </TabsContent>

        {/* TAB 3: REFORÇADORES & ESTEREOTIPIAS */}
        <TabsContent value="reinforcers">
          <ReinforcersTab patientId={p.id} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE TAB 1: CHECKLIST CLÍNICO ABA (8 PASSOS)
// ─────────────────────────────────────────────────────────────────────────────

type StepState = {
  done: boolean;
  text: string;
};

function ClinicalChecklistTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [steps, setSteps]     = useState<Record<number, StepState>>({
    1: { done: false, text: "" },
    2: { done: false, text: "" },
    3: { done: false, text: "" },
    4: { done: false, text: "" },
    5: { done: false, text: "" },
    6: { done: false, text: "" },
    7: { done: false, text: "" },
    8: { done: false, text: "" },
  });

  useEffect(() => {
    let unmounted = false;
    getClinicalChecklist({ data: { patientId } })
      .then((res) => {
        if (unmounted) return;
        if (res) {
          setSteps({
            1: { done: Boolean(res.step1_done), text: (res.step1_text as string) || "" },
            2: { done: Boolean(res.step2_done), text: (res.step2_text as string) || "" },
            3: { done: Boolean(res.step3_done), text: (res.step3_text as string) || "" },
            4: { done: Boolean(res.step4_done), text: (res.step4_text as string) || "" },
            5: { done: Boolean(res.step5_done), text: (res.step5_text as string) || "" },
            6: { done: Boolean(res.step6_done), text: (res.step6_text as string) || "" },
            7: { done: Boolean(res.step7_done), text: (res.step7_text as string) || "" },
            8: { done: Boolean(res.step8_done), text: (res.step8_text as string) || "" },
          });
        }
      })
      .catch(() => {
        // Usa estado vazio se falhar busca local
      })
      .finally(() => {
        if (!unmounted) setLoading(false);
      });

    return () => {
      unmounted = true;
    };
  }, [patientId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveClinicalChecklist({
        data: {
          patientId,
          step1_done: steps[1].done, step1_text: steps[1].text,
          step2_done: steps[2].done, step2_text: steps[2].text,
          step3_done: steps[3].done, step3_text: steps[3].text,
          step4_done: steps[4].done, step4_text: steps[4].text,
          step5_done: steps[5].done, step5_text: steps[5].text,
          step6_done: steps[6].done, step6_text: steps[6].text,
          step7_done: steps[7].done, step7_text: steps[7].text,
          step8_done: steps[8].done, step8_text: steps[8].text,
        },
      });
      toast.success("Checklist Clínico salvo no D1! ✅");
    } catch (err) {
      toast.error("Erro ao salvar checklist", {
        description: err instanceof Error ? err.message : "Erro de conexão",
      });
    } finally {
      setSaving(false);
    }
  };

  const completedCount = Object.values(steps).filter((s) => s.done).length;

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Carregando Checklist Clínico ABA...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card de Resumo do Checklist */}
      <Card className="bg-primary-soft/40 border-primary/20">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Checklist Clínico ABA — Sequência de Tomada de Decisão
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Protocolo oficial de 8 passos da GiZé&apos;s Clínica para análise comportamental.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-background">
              {completedCount} / 8 Revisados
            </Badge>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar Análise Clínica
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Os 8 Passos */}
      <div className="grid grid-cols-1 gap-4">
        {CHECKLIST_STEPS.map((step) => {
          const st = steps[step.n] ?? { done: false, text: "" };

          return (
            <Card
              key={step.n}
              className={cn(
                "transition-colors border",
                st.done ? "border-success/40 bg-success/5" : "border-border",
              )}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "size-7 rounded-lg text-xs font-bold grid place-items-center shrink-0",
                        st.done
                          ? "bg-success text-success-foreground"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      {step.n}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{step.label}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.hint}</p>
                    </div>
                  </div>

                  {/* Switch de Supervisor */}
                  <label className="flex items-center gap-2 cursor-pointer shrink-0 select-none bg-background px-2.5 py-1.5 rounded-lg border border-border">
                    <Switch
                      checked={st.done}
                      onCheckedChange={(val) =>
                        setSteps((prev) => ({
                          ...prev,
                          [step.n]: { ...prev[step.n], done: val },
                        }))
                      }
                    />
                    <span className="text-xs font-medium">
                      {st.done ? "Revisado" : "Pendente"}
                    </span>
                  </label>
                </div>

                <Textarea
                  value={st.text}
                  onChange={(e) =>
                    setSteps((prev) => ({
                      ...prev,
                      [step.n]: { ...prev[step.n], text: e.target.value },
                    }))
                  }
                  placeholder={step.placeholder}
                  rows={3}
                  className="text-sm bg-background/80"
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
          Salvar Análise Clínica (8 Passos)
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE TAB 2: REPERTÓRIO INICIAL (5 CATEGORIAS)
// ─────────────────────────────────────────────────────────────────────────────

type SkillRow = {
  id?: string;
  category: string;
  skill: string;
  level: SkillLevel;
  start_date: string;
  end_date: string;
  notes?: string;
};

function RepertoireTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [skillsMap, setSkillsMap] = useState<Record<string, SkillRow[]>>({});

  useEffect(() => {
    let unmounted = false;

    getRepertoireRecords({ data: { patientId } })
      .then((records) => {
        if (unmounted) return;

        // Agrupa registros do banco por categoria
        const grouped: Record<string, SkillRow[]> = {};

        // Inicializa com o template padrão das 5 categorias
        Object.entries(REPERTOIRE_TEMPLATE).forEach(([cat, defaultSkills]) => {
          grouped[cat] = defaultSkills.map((s) => ({
            category: cat,
            skill: s,
            level: "Sem Entrada",
            start_date: "",
            end_date: "",
          }));
        });

        // Preenche com os dados vindos do D1
        records.forEach((r) => {
          const cat = r.category;
          if (!grouped[cat]) grouped[cat] = [];

          const existingIdx = grouped[cat].findIndex((x) => x.skill === r.skill);
          const rowData: SkillRow = {
            id: r.id,
            category: r.category,
            skill: r.skill,
            level: (r.level as SkillLevel) || "Sem Entrada",
            start_date: r.start_date || "",
            end_date: r.end_date || "",
            notes: r.notes || "",
          };

          if (existingIdx >= 0) {
            grouped[cat][existingIdx] = rowData;
          } else {
            grouped[cat].push(rowData);
          }
        });

        setSkillsMap(grouped);
      })
      .catch(() => {
        // Fallback para template
        const fallback: Record<string, SkillRow[]> = {};
        Object.entries(REPERTOIRE_TEMPLATE).forEach(([cat, defaultSkills]) => {
          fallback[cat] = defaultSkills.map((s) => ({
            category: cat,
            skill: s,
            level: "Sem Entrada",
            start_date: "",
            end_date: "",
          }));
        });
        setSkillsMap(fallback);
      })
      .finally(() => {
        if (!unmounted) setLoading(false);
      });

    return () => {
      unmounted = true;
    };
  }, [patientId]);

  const handleUpdateSkill = (
    category: string,
    idx: number,
    patch: Partial<SkillRow>,
  ) => {
    setSkillsMap((prev) => {
      const list = [...(prev[category] || [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, [category]: list };
    });
  };

  const handleAddCustomSkill = (category: string) => {
    const name = prompt(`Nova habilidade para ${category}:`);
    if (!name?.trim()) return;

    setSkillsMap((prev) => {
      const list = [...(prev[category] || [])];
      list.push({
        category,
        skill: name.trim(),
        level: "Sem Entrada",
        start_date: "",
        end_date: "",
      });
      return { ...prev, [category]: list };
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const rowsToSave: {
        patientId: string;
        skillId?: string;
        category: string;
        skill: string;
        level: SkillLevel;
        start_date?: string;
        end_date?: string;
      }[] = [];

      Object.values(skillsMap).forEach((list) => {
        list.forEach((item) => {
          rowsToSave.push({
            patientId,
            skillId: item.id,
            category: item.category,
            skill: item.skill,
            level: item.level,
            start_date: item.start_date || undefined,
            end_date: item.end_date || undefined,
          });
        });
      });

      await saveRepertoireBatch({
        data: { patientId, rows: rowsToSave },
      });

      toast.success("Repertório Inicial salvo no D1! ✅");
    } catch (err) {
      toast.error("Erro ao salvar repertório", {
        description: err instanceof Error ? err.message : "Erro de comunicação",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Carregando Habilidades de Repertório...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">Avaliação de Repertório Inicial (5 Áreas Oficial)</h3>
          <p className="text-xs text-muted-foreground">
            Atenção, Imitação, Linguagem Receptiva, Linguagem Expressiva e Pré-Acadêmicas.
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={saving} size="sm">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar Repertório
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={Object.keys(REPERTOIRE_TEMPLATE)} className="space-y-3">
        {Object.entries(skillsMap).map(([cat, list]) => {
          const acquiredCount = list.filter((s) => s.level === "Adquirido").length;
          const inProgressCount = list.filter((s) => s.level === "Em Aquisição").length;

          return (
            <AccordionItem
              key={cat}
              value={cat}
              className="border border-border rounded-xl px-4 bg-card shadow-sm"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{cat}</span>
                    <Badge variant="outline" className="text-xs">
                      {list.length} habilidades
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-success font-medium">{acquiredCount} Adquiridos</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-amber-600 font-medium">{inProgressCount} Em Aquisição</span>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Habilidade</TableHead>
                        <TableHead className="w-[180px]">Nível de Aquisição</TableHead>
                        <TableHead className="w-[140px]">Data Início</TableHead>
                        <TableHead className="w-[140px]">Data Conclusão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-sm">{item.skill}</TableCell>

                          {/* Seletor de Nível */}
                          <TableCell>
                            <Select
                              value={item.level}
                              onValueChange={(val) =>
                                handleUpdateSkill(cat, idx, { level: val as SkillLevel })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SKILL_LEVELS.map((lvl) => (
                                  <SelectItem key={lvl} value={lvl} className="text-xs">
                                    {lvl}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Data Início */}
                          <TableCell>
                            <Input
                              type="date"
                              value={item.start_date}
                              onChange={(e) =>
                                handleUpdateSkill(cat, idx, { start_date: e.target.value })
                              }
                              className="h-8 text-xs"
                            />
                          </TableCell>

                          {/* Data Conclusão */}
                          <TableCell>
                            <Input
                              type="date"
                              value={item.end_date}
                              onChange={(e) =>
                                handleUpdateSkill(cat, idx, { end_date: e.target.value })
                              }
                              className="h-8 text-xs"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddCustomSkill(cat)}
                  className="mt-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3.5 mr-1" /> Adicionar habilidade em {cat}
                </Button>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSaveAll} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
          Salvar Todas as Habilidades
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE TAB 3: REFORÇADORES & AUTOESTIMULAÇÕES (PADRÕES SENSORIAIS)
// ─────────────────────────────────────────────────────────────────────────────

type ReinforcerItem = {
  id?: string;
  item: string;
  category: string;
  preference: "Alta" | "Média" | "Baixa";
  procura_sozinho: boolean;
  chora_se_retirado: boolean;
  engagement_min?: number;
  frequency_pct?: number;
  notes?: string;
};

type StereotypyItem = {
  id?: string;
  category: string;
  topography: string;
  frequency: "Alta" | "Média" | "Baixa";
  intensity: "Leve" | "Moderada" | "Intensa";
  context?: string;
  interferes_teaching: boolean;
  probable_function?: string;
  notes?: string;
};

function ReinforcersTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [reinforcers, setReinforcers] = useState<ReinforcerItem[]>([]);
  const [stereotypies, setStereotypies] = useState<StereotypyItem[]>([]);

  // Estado para novo reforçador
  const [newReinf, setNewReinf] = useState<ReinforcerItem>({
    item: "",
    category: REINFORCER_CATEGORIES[0],
    preference: "Alta",
    procura_sozinho: false,
    chora_se_retirado: false,
    engagement_min: 5,
    frequency_pct: 80,
  });
  const [savingReinf, setSavingReinf] = useState(false);

  // Estado para nova estereotipia
  const [newSt, setNewSt] = useState<StereotypyItem>({
    category: STEREOTYPY_CATEGORIES[0],
    topography: "",
    frequency: "Média",
    intensity: "Leve",
    context: "",
    interferes_teaching: false,
    probable_function: "Auto-regulação sensorial",
  });
  const [savingSt, setSavingSt] = useState(false);

  const loadData = () => {
    getReinforcerData({ data: { patientId } })
      .then((data) => {
        setReinforcers(
          data.reinforcers.map((r) => ({
            id: r.id as string,
            item: r.item as string,
            category: r.category as string,
            preference: r.preference as "Alta" | "Média" | "Baixa",
            procura_sozinho: Boolean(r.procura_sozinho),
            chora_se_retirado: Boolean(r.chora_se_retirado),
            engagement_min: (r.engagement_min as number) || 0,
            frequency_pct: (r.frequency_pct as number) || 0,
            notes: (r.notes as string) || "",
          })),
        );

        setStereotypies(
          data.stereotypies.map((s) => ({
            id: s.id as string,
            category: s.category as string,
            topography: s.topography as string,
            frequency: s.frequency as "Alta" | "Média" | "Baixa",
            intensity: s.intensity as "Leve" | "Moderada" | "Intensa",
            context: (s.context as string) || "",
            interferes_teaching: Boolean(s.interferes_teaching),
            probable_function: (s.probable_function as string) || "",
            notes: (s.notes as string) || "",
          })),
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  const handleAddReinforcer = async () => {
    if (!newReinf.item.trim()) {
      toast.error("Informe o nome do item reforçador.");
      return;
    }

    setSavingReinf(true);
    try {
      await saveReinforcerRecord({
        data: {
          patientId,
          item: newReinf.item.trim(),
          category: newReinf.category,
          preference: newReinf.preference,
          procura_sozinho: newReinf.procura_sozinho,
          chora_se_retirado: newReinf.chora_se_retirado,
          engagement_min: Number(newReinf.engagement_min || 0),
          frequency_pct: Number(newReinf.frequency_pct || 0),
        },
      });
      toast.success("Reforçador salvo no D1!");
      setNewReinf({
        item: "",
        category: REINFORCER_CATEGORIES[0],
        preference: "Alta",
        procura_sozinho: false,
        chora_se_retirado: false,
        engagement_min: 5,
        frequency_pct: 80,
      });
      loadData();
    } catch (err) {
      toast.error("Erro ao salvar reforçador", {
        description: err instanceof Error ? err.message : "Erro",
      });
    } finally {
      setSavingReinf(false);
    }
  };

  const handleAddStereotypy = async () => {
    if (!newSt.topography.trim()) {
      toast.error("Informe a topografia do comportamento autoestimulatório.");
      return;
    }

    setSavingSt(true);
    try {
      await saveStereotypyRecord({
        data: {
          patientId,
          category: newSt.category,
          topography: newSt.topography.trim(),
          frequency: newSt.frequency,
          intensity: newSt.intensity,
          context: newSt.context?.trim() || undefined,
          interferes_teaching: newSt.interferes_teaching,
          probable_function: newSt.probable_function?.trim() || undefined,
        },
      });
      toast.success("Padrão sensorial/autoestimulatório salvo!");
      setNewSt({
        category: STEREOTYPY_CATEGORIES[0],
        topography: "",
        frequency: "Média",
        intensity: "Leve",
        context: "",
        interferes_teaching: false,
        probable_function: "Auto-regulação sensorial",
      });
      loadData();
    } catch (err) {
      toast.error("Erro ao salvar padrão autoestimulatório", {
        description: err instanceof Error ? err.message : "Erro",
      });
    } finally {
      setSavingSt(false);
    }
  };

  const handleDeleteReinf = async (id: string) => {
    try {
      await deleteReinforcerRecord({ data: { recordId: id } });
      toast.success("Item removido.");
      loadData();
    } catch {
      toast.error("Erro ao remover item.");
    }
  };

  const handleDeleteSt = async (id: string) => {
    try {
      await deleteStereotypyRecord({ data: { recordId: id } });
      toast.success("Item removido.");
      loadData();
    } catch {
      toast.error("Erro ao remover item.");
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Carregando Mapeamento de Reforçadores...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── PAINEL 1: AVALIAÇÃO DE PREFERÊNCIA E REFORÇADORES (10 CATEGORIAS) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Mapeamento de Reforçadores & Avaliação de Preferência</span>
            <Badge variant="outline">10 Categorias</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Registro de engajamento (10 min de avaliação) e escolha livre (5 min).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulário de Inclusão de Reforçador */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cadastrar Novo Item Reforçador
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Item Reforçador *</Label>
                <Input
                  placeholder="Ex: Bolhas de Sabão, Carro de Controle"
                  value={newReinf.item}
                  onChange={(e) => setNewReinf((prev) => ({ ...prev, item: e.target.value }))}
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Categoria (10 Oficiais)</Label>
                <Select
                  value={newReinf.category}
                  onValueChange={(val) => setNewReinf((prev) => ({ ...prev, category: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REINFORCER_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Nível de Preferência</Label>
                <Select
                  value={newReinf.preference}
                  onValueChange={(val) =>
                    setNewReinf((prev) => ({ ...prev, preference: val as "Alta" | "Média" | "Baixa" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta Preferência</SelectItem>
                    <SelectItem value="Média">Média Preferência</SelectItem>
                    <SelectItem value="Baixa">Baixa Preferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <Label className="text-xs mb-1 block">Engajamento (min em 10m)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={newReinf.engagement_min}
                  onChange={(e) =>
                    setNewReinf((prev) => ({ ...prev, engagement_min: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Escolha (% em 5m)</Label>
                <Input
                  type="number"
                  value={newReinf.frequency_pct}
                  onChange={(e) =>
                    setNewReinf((prev) => ({ ...prev, frequency_pct: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <Checkbox
                  id="procura_sozinho"
                  checked={newReinf.procura_sozinho}
                  onCheckedChange={(val) =>
                    setNewReinf((prev) => ({ ...prev, procura_sozinho: Boolean(val) }))
                  }
                />
                <Label htmlFor="procura_sozinho" className="text-xs cursor-pointer select-none">
                  Procura sozinho?
                </Label>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <Checkbox
                  id="chora_se_retirado"
                  checked={newReinf.chora_se_retirado}
                  onCheckedChange={(val) =>
                    setNewReinf((prev) => ({ ...prev, chora_se_retirado: Boolean(val) }))
                  }
                />
                <Label htmlFor="chora_se_retirado" className="text-xs cursor-pointer select-none">
                  Chora se retirado?
                </Label>
              </div>
            </div>

            <Button onClick={handleAddReinforcer} disabled={savingReinf} className="w-full mt-2">
              {savingReinf ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Adicionar Reforçador ao Prontuário
            </Button>
          </div>

          {/* Tabela de Reforçadores Salvos */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preferência</TableHead>
                  <TableHead>Procura Sozinho?</TableHead>
                  <TableHead>Chora Retirado?</TableHead>
                  <TableHead>Engajamento</TableHead>
                  <TableHead>Escolha (5m)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reinforcers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                      Nenhum reforçador cadastrado ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  reinforcers.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.item}</TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            r.preference === "Alta"
                              ? "bg-success/15 text-success border-0"
                              : r.preference === "Média"
                              ? "bg-amber-100 text-amber-700 border-0"
                              : "bg-muted text-muted-foreground border-0"
                          }
                        >
                          {r.preference}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.procura_sozinho ? "Sim" : "Não"}</TableCell>
                      <TableCell>{r.chora_se_retirado ? "Sim" : "Não"}</TableCell>
                      <TableCell>{r.engagement_min ? `${r.engagement_min} min` : "-"}</TableCell>
                      <TableCell>{r.frequency_pct ? `${r.frequency_pct}%` : "-"}</TableCell>
                      <TableCell>
                        {r.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteReinf(r.id!)}
                          >
                            <Trash2 className="size-4 text-muted-foreground" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── PAINEL 2: PADRÕES AUTOESTIMULATÓRIOS / SENSORIAIS ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Padrões Autoestimulatórios e Sensoriais
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Mapeamento comportamental de estereotipias motoras, vocais e busca por regulação sensorial.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulário de Inclusão de Estereotipia */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cadastrar Padrão Autoestimulatório
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Categoria *</Label>
                <Select
                  value={newSt.category}
                  onValueChange={(val) => setNewSt((prev) => ({ ...prev, category: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STEREOTYPY_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Topografia (Comportamento) *</Label>
                <Input
                  placeholder="Ex: Flapping de mãos, Balançar o tronco..."
                  value={newSt.topography}
                  onChange={(e) => setNewSt((prev) => ({ ...prev, topography: e.target.value }))}
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Função Provável</Label>
                <Input
                  placeholder="Ex: Auto-regulação, Fuga de demanda..."
                  value={newSt.probable_function}
                  onChange={(e) =>
                    setNewSt((prev) => ({ ...prev, probable_function: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <Label className="text-xs mb-1 block">Frequência</Label>
                <Select
                  value={newSt.frequency}
                  onValueChange={(val) =>
                    setNewSt((prev) => ({ ...prev, frequency: val as "Alta" | "Média" | "Baixa" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Intensidade</Label>
                <Select
                  value={newSt.intensity}
                  onValueChange={(val) =>
                    setNewSt((prev) => ({ ...prev, intensity: val as "Leve" | "Moderada" | "Intensa" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Leve">Leve</SelectItem>
                    <SelectItem value="Moderada">Moderada</SelectItem>
                    <SelectItem value="Intensa">Intensa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <Checkbox
                  id="interferes_teaching"
                  checked={newSt.interferes_teaching}
                  onCheckedChange={(val) =>
                    setNewSt((prev) => ({ ...prev, interferes_teaching: Boolean(val) }))
                  }
                />
                <Label htmlFor="interferes_teaching" className="text-xs cursor-pointer select-none">
                  Interfere no Ensino?
                </Label>
              </div>
            </div>

            <Button onClick={handleAddStereotypy} disabled={savingSt} className="w-full mt-2">
              {savingSt ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Adicionar Padrão Sensorial
            </Button>
          </div>

          {/* Tabela de Estereotipias Salvas */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Topografia</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Intensidade</TableHead>
                  <TableHead>Interfere no Ensino?</TableHead>
                  <TableHead>Função Provável</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stereotypies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                      Nenhum padrão autoestimulatório cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  stereotypies.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.category}</TableCell>
                      <TableCell>{s.topography}</TableCell>
                      <TableCell>{s.frequency}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            s.intensity === "Intensa"
                              ? "bg-rose-100 text-rose-700 border-0"
                              : s.intensity === "Moderada"
                              ? "bg-amber-100 text-amber-700 border-0"
                              : "bg-blue-50 text-blue-700 border-0"
                          }
                        >
                          {s.intensity}
                        </Badge>
                      </TableCell>
                      <TableCell>{s.interferes_teaching ? "Sim" : "Não"}</TableCell>
                      <TableCell className="text-muted-foreground">{s.probable_function || "-"}</TableCell>
                      <TableCell>
                        {s.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSt(s.id!)}
                          >
                            <Trash2 className="size-4 text-muted-foreground" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
