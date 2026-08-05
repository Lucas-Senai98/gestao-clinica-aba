import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { patients, therapists } from "@/lib/mock-data";
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
import { ArrowLeft, Save, UserCog } from "lucide-react";

export const Route = createFileRoute("/patients/$patientId")({
  loader: ({ params }) => {
    const patient = patients.find((p) => p.id === params.patientId);
    if (!patient) throw notFound();
    return { patient };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Paciente não encontrado — Gestão Clínica ABA" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `Editar ${loaderData.patient.name} — Gestão Clínica ABA`;
    const description = `Atualize dados pessoais, responsável, convênio e terapias indicadas de ${loaderData.patient.name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: PatientNotFound,
  component: EditPatient,
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
  status: z.string().min(1, "Selecione a situação"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

const therapies = [
  "ABA Intensivo",
  "Fonoaudiologia",
  "Terapia Ocupacional",
  "Psicologia",
  "Psicopedagogia",
  "Musicoterapia",
];

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

function PatientNotFound() {
  return (
    <AppLayout>
      <PageHeader title="Paciente não encontrado" subtitle="O cadastro solicitado não existe ou foi removido." />
      <Button asChild variant="outline">
        <Link to="/patients">
          <ArrowLeft className="size-3.5" /> Voltar para pacientes
        </Link>
      </Button>
    </AppLayout>
  );
}

function EditPatient() {
  const { patient } = Route.useLoaderData();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: patient.name,
    birthDate: `${2026 - patient.age}-03-12`,
    gender: "Não informar",
    cpf: "",
    diagnosis: patient.diagnosis,
    therapistId: patient.therapistId,
    guardianName: patient.guardian,
    guardianRelation: "Mãe/Pai",
    guardianPhone: "(11) 90000-0000",
    guardianEmail: "responsavel@email.com",
    address: "",
    school: "",
    insurance: "Particular",
    insuranceNumber: "",
    weeklyHours: "8h",
    status: "Ativo",
    notes: "",
  });
  const [selectedTherapies, setSelectedTherapies] = useState<string[]>(["ABA Intensivo"]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

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
    toast.success(`Cadastro de ${result.data.name} atualizado!`, {
      description: "As alterações seguem para registro no prontuário.",
    });
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
        title={`Editar ${patient.name}`}
        subtitle="Atualize dados pessoais, responsável, convênio e plano terapêutico."
      />

      <form onSubmit={submit} className="space-y-4 max-w-3xl pb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCog className="size-4 text-primary" /> Dados do paciente
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
            <Field label="Situação do cadastro *" error={errors.status}>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {["Ativo", "Em avaliação", "Pausado", "Alta"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
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
              />
            </Field>
            <Field label="Parentesco" htmlFor="grel" error={errors.guardianRelation}>
              <Input
                id="grel"
                value={form.guardianRelation}
                maxLength={40}
                onChange={(e) => set("guardianRelation", e.target.value)}
              />
            </Field>
            <Field label="Telefone / WhatsApp *" htmlFor="gphone" error={errors.guardianPhone}>
              <Input
                id="gphone"
                value={form.guardianPhone}
                maxLength={20}
                onChange={(e) => set("guardianPhone", e.target.value)}
              />
            </Field>
            <Field label="E-mail *" htmlFor="gmail" error={errors.guardianEmail}>
              <Input
                id="gmail"
                type="email"
                value={form.guardianEmail}
                maxLength={255}
                onChange={(e) => set("guardianEmail", e.target.value)}
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
                label="Observações clínicas"
                htmlFor="notes"
                error={errors.notes}
                hint="Atualizações de medicação, restrições ou combinados com a família."
              >
                <Textarea
                  id="notes"
                  value={form.notes}
                  maxLength={1000}
                  rows={4}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2">
            <Button type="submit">
              <Save className="size-4" /> Salvar alterações
            </Button>
            <Button asChild type="button" variant="outline">
              <Link to="/patients">Cancelar</Link>
            </Button>
          </CardContent>
        </Card>
      </form>
    </AppLayout>
  );
}
