import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { createPatient } from "@/queries/patients";
import { getClinicTeam } from "@/queries/team";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createAndLinkGuardian } from "@/queries/guardians";
import {
  ArrowLeft,
  UserPlus,
  Save,
  Loader2,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  User,
  Users,
  Stethoscope,
  Heart,
  BadgeAlert,
  MessageCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  openWhatsAppWeb,
  formatGuardianCredentialsText,
} from "@/lib/whatsapp-credentials";

export const Route = createFileRoute("/patients/new")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Cadastro de Paciente — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Formulário de admissão em 3 etapas: dados clínicos, responsáveis, convênio e plano terapêutico inicial.",
      },
    ],
  }),
  component: NewPatient,
});

// ── Esquemas de Validação por Etapa (Zod) ──────────────────────────────────────

const step1Schema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo (mínimo 3 caracteres)").max(120),
  birthDate: z.string().min(1, "Informe a data de nascimento"),
  gender: z.string().min(1, "Selecione o sexo"),
  cpf: z.string().trim().max(14).optional().or(z.literal("")),
  diagnosis: z.string().trim().min(3, "Informe o diagnóstico ou hipótese diagnóstica").max(160),
  school: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

const step2Schema = z.object({
  guardianName: z.string().trim().min(3, "Informe o nome do responsável").max(120),
  guardianRelation: z.string().trim().max(40).optional().or(z.literal("")),
  guardianPhone: z.string().trim().min(8, "Telefone de contato inválido").max(20),
  guardianEmail: z.string().trim().email("E-mail do responsável inválido").max(255),
  address: z.string().trim().max(200).optional().or(z.literal("")),
});

const step3Schema = z.object({
  therapistId: z.string().min(1, "Selecione o terapeuta de referência"),
  weeklyHours: z.string().min(1, "Informe a carga horária semanal"),
  insurance: z.string().trim().max(80).optional().or(z.literal("")),
  insuranceNumber: z.string().trim().max(40).optional().or(z.literal("")),
  consent: z.literal(true, {
    errorMap: () => ({ message: "É necessário o consentimento do responsável" }),
  }),
});

const therapies = [
  "ABA Intensivo",
  "Fonoaudiologia",
  "Terapia Ocupacional",
  "Psicologia",
  "Psicopedagogia",
  "Musicoterapia",
];

const quickDiagnoses = [
  "TEA Nível 1",
  "TEA Nível 2",
  "TEA Nível 3",
  "TDAH",
  "Atraso Global do Desenvolvimento",
  "Transtorno Opositor Desafiador",
];

const emptyForm = {
  name: "",
  birthDate: "",
  gender: "",
  cpf: "",
  diagnosis: "",
  school: "",
  notes: "",
  guardianName: "",
  guardianRelation: "",
  guardianPhone: "",
  guardianEmail: "",
  address: "",
  therapistId: "",
  insurance: "",
  insuranceNumber: "",
  weeklyHours: "",
  consent: false as boolean,
};

function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}
    </div>
  );
}

function NewPatient() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState(emptyForm);
  const [selectedTherapies, setSelectedTherapies] = useState<string[]>(["ABA Intensivo"]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [therapistsList, setTherapistsList] = useState<
    Array<{ id: string; name: string; specialty: string }>
  >([]);

  // Credenciais para acesso do responsável no Portal da Família
  const [createPortalAccess, setCreatePortalAccess] = useState(true);
  const [guardianPassword, setGuardianPassword] = useState("Gz@Fam2026!");
  const [showGuardianPassword, setShowGuardianPassword] = useState(false);

  // Modal de pós-cadastro com credenciais e WhatsApp Web
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [createdSuccessData, setCreatedSuccessData] = useState<{
    patientId: string;
    patientName: string;
    guardianName: string;
    guardianEmail: string;
    guardianPhone?: string;
    password?: string;
  } | null>(null);

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
    let pass = "";
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setGuardianPassword(`Gz@${pass}26`);
    toast.success("Nova senha aleatória gerada!");
  };

  useEffect(() => {
    getClinicTeam()
      .then((team) => {
        if (team && team.length > 0) {
          setTherapistsList(
            team.map((t: any) => ({
              id: t.id,
              name: t.name,
              specialty: t.specialty,
            })),
          );
          setForm((f) => (f.therapistId ? f : { ...f, therapistId: team[0].id }));
        }
      })
      .catch(() => setTherapistsList([]));
  }, []);

  const set = (key: keyof typeof emptyForm, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const toggleTherapy = (t: string) => {
    setSelectedTherapies((prev) => {
      const next = prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
      if (next.length > 0 && errors.therapies) {
        setErrors((errs) => {
          const copy = { ...errs };
          delete copy.therapies;
          return copy;
        });
      }
      return next;
    });
  };

  // ── Validação por Etapa ───────────────────────────────────────────────────

  const validateCurrentStep = (step: 1 | 2 | 3): boolean => {
    setErrors({});
    if (step === 1) {
      const res = step1Schema.safeParse(form);
      if (!res.success) {
        const errMap: Record<string, string> = {};
        for (const issue of res.error.issues) {
          errMap[String(issue.path[0])] = issue.message;
        }
        setErrors(errMap);
        toast.error("Preencha os campos obrigatórios da Etapa 1 antes de avançar.");
        return false;
      }
      return true;
    }

    if (step === 2) {
      const res = step2Schema.safeParse(form);
      const errMap: Record<string, string> = {};
      if (!res.success) {
        for (const issue of res.error.issues) {
          errMap[String(issue.path[0])] = issue.message;
        }
      }
      if (createPortalAccess && (!guardianPassword || guardianPassword.length < 6)) {
        errMap.guardianPassword = "A senha inicial deve conter pelo menos 6 caracteres";
      }
      if (Object.keys(errMap).length > 0) {
        setErrors(errMap);
        toast.error("Verifique os dados do responsável antes de avançar.");
        return false;
      }
      return true;
    }

    if (step === 3) {
      const res = step3Schema.safeParse(form);
      const errMap: Record<string, string> = {};
      if (!res.success) {
        for (const issue of res.error.issues) {
          errMap[String(issue.path[0])] = issue.message;
        }
      }
      if (selectedTherapies.length === 0) {
        errMap.therapies = "Selecione ao menos uma terapia indicada";
      }
      if (Object.keys(errMap).length > 0) {
        setErrors(errMap);
        toast.error("Complete as informações do plano terapêutico para finalizar.");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep((s) => (s + 1) as 1 | 2 | 3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => (s - 1) as 1 | 2 | 3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ── Submissão Final ───────────────────────────────────────────────────────

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep(3)) return;

    setSaving(true);
    try {
      const created = await createPatient({
        data: {
          name: form.name,
          birthDate: form.birthDate,
          gender: form.gender,
          cpf: form.cpf || undefined,
          diagnosis: form.diagnosis,
          therapistId: form.therapistId,
          guardianName: form.guardianName,
          guardianRelation: form.guardianRelation || undefined,
          guardianPhone: form.guardianPhone,
          guardianEmail: form.guardianEmail,
          address: form.address || undefined,
          school: form.school || undefined,
          insurance: form.insurance || undefined,
          insuranceNumber: form.insuranceNumber || undefined,
          weeklyHours: form.weeklyHours.replace("h", ""),
          notes: form.notes || undefined,
          therapies: selectedTherapies,
        },
      });

      toast.success(`Paciente ${created.name} cadastrado com sucesso! 🎉`, {
        description: "Prontuário clínico criado e integrado ao D1.",
      });

      // Cria credenciais de acesso para o responsável se marcado
      if (createPortalAccess && form.guardianEmail && guardianPassword) {
        try {
          await createAndLinkGuardian({
            data: {
              patientId: created.id,
              name: form.guardianName,
              email: form.guardianEmail,
              password: guardianPassword,
              relation: form.guardianRelation || "Responsável",
            },
          });
          toast.success("Acesso familiar liberado no Portal dos Pais! 🔑", {
            description: `Login criado com sucesso para ${form.guardianEmail}.`,
          });
        } catch (gErr) {
          toast.warning("Paciente cadastrado, mas houve um erro ao criar o acesso do responsável", {
            description: gErr instanceof Error ? gErr.message : "Erro ao vincular responsável",
          });
        }

        // Abre diálogo para envio das credenciais geradas pelo WhatsApp Web
        setCreatedSuccessData({
          patientId: created.id,
          patientName: created.name,
          guardianName: form.guardianName,
          guardianEmail: form.guardianEmail,
          guardianPhone: form.guardianPhone,
          password: guardianPassword,
        });
        setSuccessModalOpen(true);
      } else {
        navigate({ to: "/patients" });
      }
    } catch (err) {
      toast.error("Erro ao cadastrar paciente", {
        description: err instanceof Error ? err.message : "Erro no banco D1",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/patients">
            <ArrowLeft className="size-3.5 mr-1" /> Voltar para lista de pacientes
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Cadastro de Paciente"
        subtitle="Fluxo guiado de admissão — dados pessoais, responsáveis legais e plano terapêutico."
      />

      {/* ── STEPPER WIZARD INDICATOR ────────────────────────────────────────── */}
      <div className="max-w-3xl mb-6">
        {/* Barra de Progresso Superior */}
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-primary flex items-center gap-1.5">
            <span className="size-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold grid place-items-center">
              {currentStep}
            </span>
            Etapa {currentStep} de 3
          </span>
          <span className="text-muted-foreground font-medium">
            {currentStep === 1 && "Identificação & Diagnóstico"}
            {currentStep === 2 && "Responsáveis & Portal da Família"}
            {currentStep === 3 && "Terapias, Convênio & Contrato"}
          </span>
        </div>

        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-4 shadow-inner">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {/* Botões do Stepper */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={cn(
              "p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5",
              currentStep === 1
                ? "border-primary bg-primary/10 shadow-xs"
                : currentStep > 1
                  ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20"
                  : "border-border bg-card/60 opacity-60",
            )}
          >
            <div
              className={cn(
                "size-7 rounded-full text-xs font-bold grid place-items-center shrink-0",
                currentStep === 1
                  ? "bg-primary text-primary-foreground"
                  : currentStep > 1
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {currentStep > 1 ? <CheckCircle2 className="size-4" /> : "1"}
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="text-xs font-semibold truncate leading-tight">Paciente</p>
              <p className="text-[10px] text-muted-foreground truncate">Dados clínicos</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (currentStep === 3 || validateCurrentStep(1)) setCurrentStep(2);
            }}
            className={cn(
              "p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5",
              currentStep === 2
                ? "border-primary bg-primary/10 shadow-xs"
                : currentStep > 2
                  ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20"
                  : "border-border bg-card/60 opacity-60",
            )}
          >
            <div
              className={cn(
                "size-7 rounded-full text-xs font-bold grid place-items-center shrink-0",
                currentStep === 2
                  ? "bg-primary text-primary-foreground"
                  : currentStep > 2
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {currentStep > 2 ? <CheckCircle2 className="size-4" /> : "2"}
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="text-xs font-semibold truncate leading-tight">Família</p>
              <p className="text-[10px] text-muted-foreground truncate">Acesso aos pais</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (validateCurrentStep(1) && validateCurrentStep(2)) setCurrentStep(3);
            }}
            className={cn(
              "p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5",
              currentStep === 3
                ? "border-primary bg-primary/10 shadow-xs"
                : "border-border bg-card/60 opacity-60",
            )}
          >
            <div
              className={cn(
                "size-7 rounded-full text-xs font-bold grid place-items-center shrink-0",
                currentStep === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              3
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="text-xs font-semibold truncate leading-tight">Plano Clínico</p>
              <p className="text-[10px] text-muted-foreground truncate">Terapias & Termo</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── FORMULÁRIO STEPPER ─────────────────────────────────────────────── */}
      <form onSubmit={submit} className="max-w-3xl pb-12">
        {/* ── ETAPA 1: DADOS DO PACIENTE & DIAGNÓSTICO ─────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <Card>
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="size-4 text-primary" /> Identificação e Dados Pessoais do Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Nome Completo da Criança *" htmlFor="name" error={errors.name}>
                    <Input
                      id="name"
                      value={form.name}
                      maxLength={120}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Ex.: Gabriel Silva Tavares"
                      autoFocus
                    />
                  </Field>
                </div>

                <Field label="Data de Nascimento *" htmlFor="birth" error={errors.birthDate}>
                  <Input
                    id="birth"
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => set("birthDate", e.target.value)}
                  />
                </Field>

                <Field label="CPF (opcional)" htmlFor="cpf" error={errors.cpf}>
                  <Input
                    id="cpf"
                    value={form.cpf}
                    maxLength={14}
                    onChange={(e) => set("cpf", e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Sexo Biológico *" error={errors.gender}>
                    <RadioGroup
                      value={form.gender}
                      onValueChange={(v) => set("gender", v)}
                      className="flex flex-wrap gap-4 pt-1"
                    >
                      {["Masculino", "Feminino", "Não informar"].map((g) => (
                        <div key={g} className="flex items-center gap-2">
                          <RadioGroupItem value={g} id={`g-${g}`} />
                          <Label htmlFor={`g-${g}`} className="text-xs font-normal cursor-pointer">
                            {g}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field
                    label="Diagnóstico Clínico / CID *"
                    htmlFor="dx"
                    error={errors.diagnosis}
                    hint="Informe o diagnóstico médico formal ou a hipótese investigativa."
                  >
                    <Input
                      id="dx"
                      value={form.diagnosis}
                      maxLength={160}
                      onChange={(e) => set("diagnosis", e.target.value)}
                      placeholder="Ex.: TEA Nível 2 (F84.0)"
                    />
                  </Field>

                  {/* Sugestões rápidas de preenchimento */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-[10px] text-muted-foreground mr-1">Sugestões rápidas:</span>
                    {quickDiagnoses.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => set("diagnosis", q)}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/50 hover:bg-primary-soft hover:text-primary hover:border-primary/30 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="Escola / Série (opcional)" htmlFor="school" error={errors.school}>
                  <Input
                    id="school"
                    value={form.school}
                    maxLength={120}
                    onChange={(e) => set("school", e.target.value)}
                    placeholder="Ex.: Colégio Pequeno Príncipe — 1º Ano"
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field
                    label="Observações da Admissão (opcional)"
                    htmlFor="notes"
                    error={errors.notes}
                    hint="Histórico do desenvolvimento, medicações de uso contínuo, restrições alimentares ou alergias."
                  >
                    <Textarea
                      id="notes"
                      value={form.notes}
                      maxLength={1000}
                      rows={3}
                      onChange={(e) => set("notes", e.target.value)}
                      placeholder="Descreva detalhes comportamentais e histórico trazido pela família..."
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto h-11 px-6 font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                Avançar para Responsáveis <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── ETAPA 2: RESPONSÁVEIS & PORTAL DA FAMÍLIA ─────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <Card>
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="size-4 text-primary" /> Responsável Legal e Contato Familiar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 grid gap-4 sm:grid-cols-2">
                <Field label="Nome Completo do Responsável *" htmlFor="gname" error={errors.guardianName}>
                  <Input
                    id="gname"
                    value={form.guardianName}
                    maxLength={120}
                    onChange={(e) => set("guardianName", e.target.value)}
                    placeholder="Ex.: Maria Silva Tavares"
                    autoFocus
                  />
                </Field>

                <Field label="Grau de Parentesco" htmlFor="grel" error={errors.guardianRelation}>
                  <Input
                    id="grel"
                    value={form.guardianRelation}
                    maxLength={40}
                    onChange={(e) => set("guardianRelation", e.target.value)}
                    placeholder="Ex.: Mãe, Pai, Avó, Guardião Legal..."
                  />
                </Field>

                <Field label="Telefone de Contato (WhatsApp) *" htmlFor="gphone" error={errors.guardianPhone}>
                  <Input
                    id="gphone"
                    value={form.guardianPhone}
                    maxLength={20}
                    onChange={(e) => set("guardianPhone", e.target.value)}
                    placeholder="(11) 98877-6655"
                  />
                </Field>

                <Field label="E-mail do Responsável (Chave de Login) *" htmlFor="gmail" error={errors.guardianEmail}>
                  <Input
                    id="gmail"
                    type="email"
                    value={form.guardianEmail}
                    maxLength={255}
                    onChange={(e) => set("guardianEmail", e.target.value)}
                    placeholder="maria.silva@email.com"
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Endereço Residencial Completo (opcional)" htmlFor="addr" error={errors.address}>
                    <Input
                      id="addr"
                      value={form.address}
                      maxLength={200}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="Rua, número, complemento, bairro, cidade - UF"
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Painel do Portal dos Pais */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="createPortalAccess"
                    checked={createPortalAccess}
                    onCheckedChange={(c) => setCreatePortalAccess(Boolean(c))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="createPortalAccess"
                      className="text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      <Key className="size-3.5 text-primary" />
                      Criar acesso de login no Portal dos Pais para este responsável
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Gera uma conta com perfil de responsável para que a família acompanhe as devolutivas diárias, quadros de avisos e relatórios clínicos emitidos pela clínica.
                    </p>
                  </div>
                </div>

                {createPortalAccess && (
                  <div className="p-3.5 rounded-lg bg-background border border-primary/20 space-y-3 mt-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="guardianPwd" className="text-xs font-medium">
                          Senha Inicial de Acesso do Responsável *
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={generateRandomPassword}
                          className="h-6 text-[11px] px-2 text-primary hover:text-primary hover:bg-primary-soft"
                        >
                          <Sparkles className="size-3 mr-1" /> Gerar Senha Aleatória
                        </Button>
                      </div>

                      <div className="relative">
                        <Input
                          id="guardianPwd"
                          type={showGuardianPassword ? "text" : "password"}
                          value={guardianPassword}
                          onChange={(e) => setGuardianPassword(e.target.value)}
                          placeholder="Mínimo de 6 caracteres"
                          className="pr-10 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGuardianPassword(!showGuardianPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          title={showGuardianPassword ? "Ocultar senha" : "Exibir senha"}
                        >
                          {showGuardianPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {errors.guardianPassword && (
                        <p className="text-[11px] text-destructive font-medium">{errors.guardianPassword}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 p-2 rounded">
                      <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                      <span>
                        A senha será criptografada com PBKDF2 WebCrypto (100.000 iterações) e vinculada exclusivamente a este paciente no banco D1.
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" onClick={handleBack} className="h-11 px-5">
                <ArrowLeft className="size-4 mr-1.5" /> Voltar
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                className="h-11 px-6 font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                Avançar para Terapias <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── ETAPA 3: TERAPIAS, CONVÊNIO & CONTRATO ────────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <Card>
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Stethoscope className="size-4 text-primary" /> Plano Terapêutico e Convênio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 grid gap-4 sm:grid-cols-2">
                <Field label="Terapeuta de Referência *" error={errors.therapistId}>
                  <Select value={form.therapistId} onValueChange={(v) => set("therapistId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {therapistsList.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} · {t.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Carga Horária Semanal *" error={errors.weeklyHours}>
                  <Select value={form.weeklyHours} onValueChange={(v) => set("weeklyHours", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a carga semanal" />
                    </SelectTrigger>
                    <SelectContent>
                      {["2h", "4h", "6h", "8h", "10h", "12h", "16h", "20h"].map((h) => (
                        <SelectItem key={h} value={h}>
                          {h} por semana
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Convênio / Plano de Saúde" htmlFor="ins" error={errors.insurance}>
                  <Input
                    id="ins"
                    value={form.insurance}
                    maxLength={80}
                    onChange={(e) => set("insurance", e.target.value)}
                    placeholder="Ex.: Unimed, Bradesco Saúde, Particular"
                  />
                </Field>

                <Field label="Nº da Carteirinha do Convênio" htmlFor="insn" error={errors.insuranceNumber}>
                  <Input
                    id="insn"
                    value={form.insuranceNumber}
                    maxLength={40}
                    onChange={(e) => set("insuranceNumber", e.target.value)}
                    placeholder="0000000000"
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Terapias Multidisciplinares Indicadas *" error={errors.therapies}>
                    <div className="grid gap-2 sm:grid-cols-2 pt-1">
                      {therapies.map((t) => (
                        <label
                          key={t}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border p-3 text-xs cursor-pointer transition-colors",
                            selectedTherapies.includes(t)
                              ? "border-primary bg-primary/5 text-foreground font-medium"
                              : "border-border hover:bg-muted/50 text-muted-foreground",
                          )}
                        >
                          <Checkbox
                            checked={selectedTherapies.includes(t)}
                            onCheckedChange={() => toggleTherapy(t)}
                          />
                          {t}
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Termo de Consentimento */}
            <Card className="border-border">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <label className="flex items-start gap-3 text-xs cursor-pointer select-none">
                  <Checkbox
                    checked={form.consent}
                    onCheckedChange={(c) => set("consent", Boolean(c))}
                    className="mt-0.5"
                  />
                  <span className="text-muted-foreground leading-relaxed">
                    Confirmo que os responsáveis legais pelo paciente assinaram o{" "}
                    <strong className="text-foreground">Termo de Consentimento Livre e Esclarecido (TCLE)</strong>,
                    autorizando a avaliação, intervenção comportamental no modelo ABA e o armazenamento dos registros clínicos em conformidade com a LGPD.
                  </span>
                </label>
                {errors.consent && (
                  <p className="text-[11px] text-destructive font-medium pl-6">{errors.consent}</p>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" onClick={handleBack} className="h-11 px-5">
                <ArrowLeft className="size-4 mr-1.5" /> Voltar
              </Button>

              <Button
                type="submit"
                disabled={saving}
                className="h-11 px-8 font-semibold bg-primary text-primary-foreground shadow-md flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Salvando no Banco D1...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Concluir e Cadastrar Paciente
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* ── MODAL DE SUCESSO & ENVIO VIA WHATSAPP WEB ───────────────────────── */}
      <Dialog
        open={successModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            navigate({ to: "/patients" });
          }
        }}
      >
        <DialogContent className="max-w-md">
          {createdSuccessData && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 grid place-items-center mb-1">
                  <CheckCircle2 className="size-7" />
                </div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Paciente Cadastrado & Acesso Familiar Criado!
                </DialogTitle>
                <DialogDescription className="text-xs">
                  O prontuário de <span className="font-semibold text-foreground">{createdSuccessData.patientName}</span> foi criado com sucesso no banco de dados.
                </DialogDescription>
              </DialogHeader>

              {/* Card de Credenciais da Família */}
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-300 font-semibold border-b border-emerald-200/60 dark:border-emerald-800/60 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Key className="size-3.5" /> Credenciais do Portal dos Pais
                  </span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded-full font-normal">
                    Ativo
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Responsável:</span>
                  <span className="font-medium text-foreground">{createdSuccessData.guardianName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">E-mail de Login:</span>
                  <span className="font-mono font-medium text-foreground">{createdSuccessData.guardianEmail}</span>
                </div>

                <div className="flex items-center justify-between bg-background p-2 rounded-lg border border-border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    Senha Inicial:
                  </span>
                  <span className="font-mono font-bold text-primary text-sm select-all">
                    {createdSuccessData.password}
                  </span>
                </div>

                {createdSuccessData.guardianPhone && (
                  <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-emerald-200/40 dark:border-emerald-800/40">
                    <span>WhatsApp de Envio:</span>
                    <span className="font-mono text-foreground font-medium">{createdSuccessData.guardianPhone}</span>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 shadow-sm"
                  onClick={() => {
                    openWhatsAppWeb({
                      guardianName: createdSuccessData.guardianName,
                      patientName: createdSuccessData.patientName,
                      guardianEmail: createdSuccessData.guardianEmail,
                      guardianPhone: createdSuccessData.guardianPhone,
                      password: createdSuccessData.password,
                      isPasswordReset: false,
                    });
                    toast.success("WhatsApp Web aberto em uma nova guia!");
                  }}
                >
                  <MessageCircle className="size-4" />
                  Enviar Credenciais pelo WhatsApp Web
                  <ExternalLink className="size-3.5 ml-auto opacity-70" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-9 text-xs gap-1.5"
                  onClick={() => {
                    const text = formatGuardianCredentialsText({
                      guardianName: createdSuccessData.guardianName,
                      patientName: createdSuccessData.patientName,
                      guardianEmail: createdSuccessData.guardianEmail,
                      guardianPhone: createdSuccessData.guardianPhone,
                      password: createdSuccessData.password,
                      isPasswordReset: false,
                    });
                    navigator.clipboard.writeText(text);
                    toast.success("Mensagem copiada para a área de transferência!");
                  }}
                >
                  <Copy className="size-3.5" />
                  Copiar Mensagem das Credenciais
                </Button>
              </div>

              <DialogFooter className="pt-2 border-t flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => navigate({ to: `/patient/${createdSuccessData.patientId}` })}
                >
                  Abrir Prontuário (PEP)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="text-xs"
                  onClick={() => navigate({ to: "/patients" })}
                >
                  Ir para Lista de Pacientes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
