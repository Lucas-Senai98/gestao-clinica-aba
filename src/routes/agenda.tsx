import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { AppLayout, PageHeader } from "@/components/app-layout";
import {
  getAppointments,
  saveAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  type AppointmentItem,
} from "@/queries/appointments";
import { getPatients } from "@/queries/patients";
import { getClinicTeam, type TeamMemberItem } from "@/queries/team";
import type { PatientSummary } from "@/db/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, MapPin, Play, Loader2, Plus, Pencil, Trash2, Ban, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/agenda")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Agenda de Sessões — Gestão Clínica ABA" },
      { name: "description", content: "Agenda semanal da clínica com criação, edição e cancelamento de sessões." },
    ],
  }),
  component: Agenda,
});

const statusTone: Record<string, string> = {
  Concluída: "bg-success/15 text-success",
  "Em andamento": "bg-primary-soft text-primary",
  Agendada: "bg-muted text-muted-foreground",
  Confirmada: "bg-blue-100 text-blue-700",
  Cancelada: "bg-destructive/15 text-destructive",
  Remarcada: "bg-warning/20 text-warning-foreground",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(date = todayISO()) {
  return {
    id: "",
    patientId: "",
    therapistId: "",
    date,
    time: "08:00",
    durationMin: "50",
    type: "ABA Intensivo",
    room: "Sala 01",
    status: "Agendada",
    notes: "",
  };
}

function Agenda() {
  const currentUser = useCurrentUser();
  const canManage = currentUser?.role !== "parent";
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [appointmentsList, setAppointmentsList] = useState<AppointmentItem[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [team, setTeam] = useState<TeamMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = () => {
    setLoading(true);
    Promise.all([
      getAppointments({ data: { date: selectedDate } }),
      getPatients({ data: { role: currentUser?.role || "admin", userId: currentUser?.id || "u1" } }).catch(() => []),
      currentUser?.role === "admin" ? getClinicTeam().catch(() => []) : Promise.resolve([]),
    ])
      .then(([appointments, patientsData, teamData]) => {
        setAppointmentsList(appointments || []);
        setPatients(patientsData || []);
        setTeam(teamData || []);
      })
      .catch(() => setAppointmentsList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentUser) load();
  }, [selectedDate, currentUser]);

  const therapists = currentUser?.role === "therapist"
    ? [{ id: currentUser.id, name: currentUser.name, role: "therapist" } as TeamMemberItem]
    : team.filter((m) => m.role === "therapist" && m.is_active === 1);

  const openNew = () => {
    setForm({
      ...emptyForm(selectedDate),
      patientId: patients[0]?.id || "",
      therapistId: therapists[0]?.id || currentUser?.id || "",
    });
    setShowForm(true);
  };

  const openEdit = (a: AppointmentItem) => {
    setForm({
      id: a.id,
      patientId: a.patientId,
      therapistId: a.therapistId,
      date: a.date,
      time: a.time,
      durationMin: String(a.durationMin),
      type: a.type,
      room: a.room,
      status: a.status,
      notes: a.notes || "",
    });
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.patientId || !form.therapistId) {
      toast.error("Selecione paciente e terapeuta.");
      return;
    }
    setSaving(true);
    try {
      await saveAppointment({
        data: {
          id: form.id || undefined,
          patientId: form.patientId,
          therapistId: form.therapistId,
          date: form.date,
          time: form.time,
          durationMin: Number(form.durationMin) || 50,
          type: form.type,
          room: form.room,
          status: form.status as any,
          notes: form.notes || undefined,
        },
      });
      toast.success(form.id ? "Agendamento atualizado." : "Agendamento criado.");
      setShowForm(false);
      load();
    } catch (err) {
      toast.error("Erro ao salvar agendamento", { description: err instanceof Error ? err.message : "Erro" });
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: AppointmentItem["status"]) => {
    await updateAppointmentStatus({ data: { id, status } });
    toast.success(`Agendamento marcado como ${status.toLowerCase()}.`);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este agendamento definitivamente?")) return;
    await deleteAppointment({ data: { id } });
    toast.success("Agendamento excluído.");
    load();
  };

  return (
    <AppLayout>
      <PageHeader
        title="Agenda da clínica"
        subtitle="Crie, edite, remarque, cancele e acompanhe sessões."
        action={canManage && (
          <Button size="sm" onClick={openNew}>
            <Plus className="size-4" /> Novo agendamento
          </Button>
        )}
      />

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Data</Label>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="mt-1" />
          </div>
          <Badge variant="outline" className="mb-2">
            <CalendarDays className="size-3.5 mr-1" /> {appointmentsList.length} sessão(ões)
          </Badge>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="mb-5 border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Paciente</Label>
                <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Terapeuta</Label>
                <Select value={form.therapistId} onValueChange={(v) => setForm((f) => ({ ...f, therapistId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{therapists.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Data</Label><Input className="mt-1" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
                <div><Label className="text-xs">Hora</Label><Input className="mt-1" type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} /></div>
                <div><Label className="text-xs">Min</Label><Input className="mt-1" type="number" value={form.durationMin} onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Tipo</Label><Input className="mt-1" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} /></div>
                <div><Label className="text-xs">Sala</Label><Input className="mt-1" value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} /></div>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Agendada", "Confirmada", "Em andamento", "Concluída", "Remarcada", "Cancelada"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea className="mt-1" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card className="p-8 text-center">
          <Loader2 className="size-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Carregando agendamentos...</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {appointmentsList.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <div className="w-16 shrink-0">
                  <p className="text-lg font-semibold leading-none">{a.time}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="size-3" /> {a.duration}
                  </p>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium text-sm">{a.patient}</p>
                  <p className="text-xs text-muted-foreground">{a.type} · {a.therapist}</p>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3.5" /> {a.room}
                </div>
                <Badge className={cn("border-0", statusTone[a.status] || "bg-muted")}>{a.status}</Badge>
                <Button asChild size="sm" variant="outline">
                  <Link to="/session/$patientId" params={{ patientId: a.patientId }}>
                    <Play className="size-3.5" /> Registro
                  </Link>
                </Button>
                {canManage && (
                  <div className="flex gap-1 ml-auto">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setStatus(a.id, "Cancelada")}><Ban className="size-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {appointmentsList.length === 0 && (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-muted-foreground">Nenhum atendimento agendado para esta data.</p>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
}
