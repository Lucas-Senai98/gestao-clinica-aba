import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth-context";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { getPatientById, updatePatient } from "@/queries/patients";
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
import { ArrowLeft, Save, UserCog, Loader2 } from "lucide-react";

export const Route = createFileRoute("/patients/$patientId")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Editar Paciente — Gestão Clínica ABA" },
      { name: "description", content: "Atualize dados pessoais, responsável, convênio e terapias indicadas." },
    ],
  }),
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

function EditPatient() {
  const { patientId } = useParams({ from: "/patients/$patientId" });
  const currentUser = useCurrentUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [therapistsList, setTherapistsList] = useState<Array<{ id: string; name: string; specialty: string }>>([]);

  const [form, setForm] = useState({
    name: "",
    birthDate: "2020-01-01",
    gender: "Não informar",
    cpf: "",
    diagnosis: "",
    therapistId: "",
    guardianName: "",
    guardianRelation: "Mãe/Pai",
    guardianPhone: "",
    guardianEmail: "",
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

  useEffect(() => {
    let unmounted = false;
    setLoading(true);

    Promise.all([
      getPatientById({
        data: {
          patientId,
          userId: currentUser?.id || "u1",
          role: currentUser?.role || "admin",
        },
      }).catch(() => null),
      getClinicTeam().catch(() => []),
    ])
      .then(([patientData, teamData]) => {
        if (unmounted) return;

        if (teamData && teamData.length > 0) {
          setTherapistsList(
            teamData.map((t: any) => ({
              id: t.id,
              name: t.name,
              specialty: t.specialty,
            })),
          );
        }

        if (patientData) {
          setForm({
            name: patientData.name || "",
            birthDate: patientData.birth_date || "2020-01-01",
            gender: (patientData as any).gender || "Não informar",
            cpf: (patientData as any).cpf || "",
            diagnosis: patientData.diagnosis || "",
            therapistId: (patientData as any).therapist_id || (teamData?.[0]?.id ?? "u2"),
            guardianName: patientData.guardian_name || "",
            guardianRelation: (patientData as any).guardian_relation || "Mãe/Pai",
            guardianPhone: patientData.guardian_phone || "",
            guardianEmail: patientData.guardian_email || "",
            address: (patientData as any).address || "",
            school: (patientData as any).school || "",
            insurance: (patientData as any).insurance || "Particular",
            insuranceNumber: (patientData as any).insurance_number || "",
            weeklyHours: `${(patientData as any).weekly_hours || 8}h`,
            status: patientData.status || "Ativo",
            notes: (patientData as any).notes || "",
          });
        }
      })
      .finally(() => {
        if (!unmounted) setLoading(false);
      });

    return () => {
      unmounted = true;
    };
  }, [patientId, currentUser]);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const toggleTherapy = (t: string) =>
    setSelectedTherapies((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = async (e: React.FormEvent) => {
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

    setSaving(true);
    try {
      await updatePatient({
        data: {
          id: patientId,
          data: {
            name: form.name,
            birthDate: form.birthDate,
            gender: form.gender,
            cpf: form.cpf,
            diagnosis: form.diagnosis,
            therapistId: form.therapistId,
            guardianName: form.guardianName,
            guardianRelation: form.guardianRelation,
            guardianPhone: form.guardianPhone,
            guardianEmail: form.guardianEmail,
            address: form.address,
            school: form.school,
            insurance: form.insurance,
            insuranceNumber: form.insuranceNumber,
            weeklyHours: form.weeklyHours.replace("h", ""),
            status: form.status,
            notes: form.notes,
            therapies: selectedTherapies,
          },
        },
      });

      setErrors({});
      toast.success(`Cadastro de ${result.data.name} atualizado!`, {
        description: "As alterações foram gravadas no banco D1 com sucesso.",
      });
      navigate({ to: "/patients" });
    } catch (err) {
      toast.error("Erro ao salvar paciente", {
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <Card className="p-12 text-center max-w-xl mx-auto my-12">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-3">Carregando dados do paciente...</p>
        </Card>
      </AppLayout>
    );
  }

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
        title={`Editar ${form.name || "Paciente"}`}
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
                  {therapistsList.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.specialty}
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
