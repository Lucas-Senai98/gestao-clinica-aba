import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { therapists } from "@/lib/mock-data";
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
import { ArrowLeft, UserPlus, Save } from "lucide-react";

export const Route = createFileRoute("/patients/new")({
  head: () => ({
    meta: [
      { title: "Cadastro de paciente — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Formulário de admissão de novo paciente: dados pessoais, diagnóstico, responsáveis, convênio e plano terapêutico inicial.",
      },
      { property: "og:title", content: "Cadastro de paciente — Gestão Clínica ABA" },
      {
        property: "og:description",
        content: "Cadastre um novo paciente com dados clínicos, responsáveis e terapias indicadas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewPatient,
});

const schema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo").max(120),
  birthDate: z.string().min(1, "Informe a data de nascimento"),
  gender: z.string().min(1, "Selecione o sexo"),
  cpf: z.string().trim().max(14).optional().or(z.literal("")),
  diagnosis: z.string().trim().min(3, "Informe o diagnóstico / hipótese").max(160),
  therapistId: z.string().min(1, "Selecione o terapeuta de referência"),
  guardianName: z.string().trim().min(3, "Informe o responsável").max(120),
  guardianRelation: z.string().trim().max(40).optional().or(z.literal("")),
  guardianPhone: z.string().trim().min(8, "Telefone inválido").max(20),
  guardianEmail: z.string().trim().email("E-mail inválido").max(255),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  school: z.string().trim().max(120).optional().or(z.literal("")),
  insurance: z.string().trim().max(80).optional().or(z.literal("")),
  insuranceNumber: z.string().trim().max(40).optional().or(z.literal("")),
  weeklyHours: z.string().min(1, "Informe a carga semanal"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  consent: z.literal(true, { errorMap: () => ({ message: "É necessário o consentimento do responsável" }) }),
});

const therapies = [
  "ABA Intensivo",
  "Fonoaudiologia",
  "Terapia Ocupacional",
  "Psicologia",
  "Psicopedagogia",
  "Musicoterapia",
];

const emptyForm = {
  name: "",
  birthDate: "",
  gender: "",
  cpf: "",
  diagnosis: "",
  therapistId: "",
  guardianName: "",
  guardianRelation: "",
  guardianPhone: "",
  guardianEmail: "",
  address: "",
  school: "",
  insurance: "",
  insuranceNumber: "",
  weeklyHours: "",
  notes: "",
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
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function NewPatient() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [selectedTherapies, setSelectedTherapies] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof emptyForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleTherapy = (t: string) =>
    setSelectedTherapies((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const map: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!map[key]) map[key] = issue.message;
      }
      setErrors(map);
      toast.error("Verifique os campos destacados antes de salvar.");
      return;
    }
    if (selectedTherapies.length === 0) {
      setErrors({ therapies: "Selecione ao menos uma terapia indicada" });
      toast.error("Selecione ao menos uma terapia indicada.");
      return;
    }
    setErrors({});
    toast.success(`Paciente ${result.data.name} cadastrado com sucesso!`, {
      description: "O cadastro segue para aprovação da supervisão.",
    });
    setForm(emptyForm);
    setSelectedTherapies([]);
    navigate({ to: "/patients" });
  };

  return (
    <AppLayout>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/patients">
            <ArrowLeft className="size-3.5" /> Voltar para pacientes
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Cadastro de paciente"
        subtitle="Ficha de admissão — dados pessoais, responsáveis, convênio e plano terapêutico inicial."
      />

      <form onSubmit={submit} className="space-y-4 max-w-3xl pb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="size-4 text-primary" /> Dados do paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nome completo *" htmlFor="name" error={errors.name}>
                <Input
                  id="name"
                  value={form.name}
                  maxLength={120}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Ex.: Miguel Tavares"
                />
              </Field>
            </div>
            <Field label="Data de nascimento *" htmlFor="birth" error={errors.birthDate}>
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
              <Field label="Sexo *" error={errors.gender}>
                <RadioGroup
                  value={form.gender}
                  onValueChange={(v) => set("gender", v)}
                  className="flex flex-wrap gap-4 pt-1"
                >
                  {["Feminino", "Masculino", "Não informar"].map((g) => (
                    <div key={g} className="flex items-center gap-2">
                      <RadioGroupItem value={g} id={`g-${g}`} />
                      <Label htmlFor={`g-${g}`} className="text-xs font-normal">
                        {g}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Diagnóstico / hipótese diagnóstica *"
                htmlFor="dx"
                error={errors.diagnosis}
                hint="Ex.: TEA Nível 2, atraso de linguagem, TDAH associado."
              >
                <Input
                  id="dx"
                  value={form.diagnosis}
                  maxLength={160}
                  onChange={(e) => set("diagnosis", e.target.value)}
                  placeholder="Ex.: TEA Nível 2"
                />
              </Field>
            </div>
            <Field label="Escola / série (opcional)" htmlFor="school" error={errors.school}>
              <Input
                id="school"
                value={form.school}
                maxLength={120}
                onChange={(e) => set("school", e.target.value)}
                placeholder="Ex.: EMEI Vila Nova — Pré II"
              />
            </Field>
            <Field label="Terapeuta de referência *" error={errors.therapistId}>
              <Select value={form.therapistId} onValueChange={(v) => set("therapistId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {therapists.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Responsável</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do responsável *" htmlFor="gname" error={errors.guardianName}>
              <Input
                id="gname"
                value={form.guardianName}
                maxLength={120}
                onChange={(e) => set("guardianName", e.target.value)}
                placeholder="Ex.: Mariana Tavares"
              />
            </Field>
            <Field label="Parentesco" htmlFor="grel" error={errors.guardianRelation}>
              <Input
                id="grel"
                value={form.guardianRelation}
                maxLength={40}
                onChange={(e) => set("guardianRelation", e.target.value)}
                placeholder="Mãe, pai, avó..."
              />
            </Field>
            <Field label="Telefone / WhatsApp *" htmlFor="gphone" error={errors.guardianPhone}>
              <Input
                id="gphone"
                value={form.guardianPhone}
                maxLength={20}
                onChange={(e) => set("guardianPhone", e.target.value)}
                placeholder="(11) 90000-0000"
              />
            </Field>
            <Field label="E-mail *" htmlFor="gmail" error={errors.guardianEmail}>
              <Input
                id="gmail"
                type="email"
                value={form.guardianEmail}
                maxLength={255}
                onChange={(e) => set("guardianEmail", e.target.value)}
                placeholder="responsavel@email.com"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Endereço (opcional)" htmlFor="addr" error={errors.address}>
                <Input
                  id="addr"
                  value={form.address}
                  maxLength={200}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Rua, número, bairro, cidade"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Convênio e plano terapêutico</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Convênio / particular" htmlFor="ins" error={errors.insurance}>
              <Input
                id="ins"
                value={form.insurance}
                maxLength={80}
                onChange={(e) => set("insurance", e.target.value)}
                placeholder="Ex.: Unimed, Bradesco Saúde, Particular"
              />
            </Field>
            <Field label="Nº da carteirinha" htmlFor="insn" error={errors.insuranceNumber}>
              <Input
                id="insn"
                value={form.insuranceNumber}
                maxLength={40}
                onChange={(e) => set("insuranceNumber", e.target.value)}
                placeholder="000000000"
              />
            </Field>
            <Field label="Carga horária semanal *" error={errors.weeklyHours}>
              <Select value={form.weeklyHours} onValueChange={(v) => set("weeklyHours", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
            <div className="sm:col-span-2">
              <Field label="Terapias indicadas *" error={errors.therapies}>
                <div className="grid gap-2 sm:grid-cols-2 pt-1">
                  {therapies.map((t) => (
                    <label
                      key={t}
                      className="flex items-center gap-2 rounded-md border border-border p-2.5 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
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
            <div className="sm:col-span-2">
              <Field
                label="Observações da admissão"
                htmlFor="notes"
                error={errors.notes}
                hint="Histórico relevante, medicações, restrições alimentares, gatilhos conhecidos."
              >
                <Textarea
                  id="notes"
                  value={form.notes}
                  maxLength={1000}
                  rows={4}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Descreva informações importantes para a equipe..."
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <label className="flex items-start gap-3 text-xs cursor-pointer">
              <Checkbox
                checked={form.consent}
                onCheckedChange={(v) => set("consent", v === true)}
                className="mt-0.5"
              />
              <span className="leading-relaxed">
                Confirmo que o responsável autorizou o cadastro, o registro de dados clínicos e o
                compartilhamento das informações com a equipe terapêutica da clínica.
              </span>
            </label>
            {errors.consent && <p className="text-[11px] text-destructive">{errors.consent}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="submit">
                <Save className="size-4" /> Salvar cadastro
              </Button>
              <Button asChild type="button" variant="outline">
                <Link to="/patients">Cancelar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </AppLayout>
  );
}
