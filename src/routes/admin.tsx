import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { requireAuth, requireRole } from "@/lib/route-guard";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { adminStats, therapists, patients, monthlyPerformance } from "@/lib/mock-data";
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from "@/server/queries/communication";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Users,
  Stethoscope,
  Clock4,
  Activity,
  ArrowRight,
  Bell,
  Plus,
  Trash2,
  Loader2,
  Megaphone,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  beforeLoad: requireRole("admin"),
  head: () => ({
    meta: [
      { title: "Dashboard da Supervisão — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Indicadores da clínica ABA: pacientes ativos, equipe terapêutica, aprovações pendentes e gestão de comunicados.",
      },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const [announcements, setAnnouncements] = useState<
    Array<{ id: string; title: string; body: string; published_at: string; author_name: string }>
  >([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  // Formulário de novo comunicado
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [title, setTitle]             = useState("");
  const [body, setBody]               = useState("");
  const [publishing, setPublishing]   = useState(false);

  const loadAnnouncementsData = () => {
    getAnnouncements()
      .then((res) => setAnnouncements(res))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoadingAnnouncements(false));
  };

  useEffect(() => {
    loadAnnouncementsData();
  }, []);

  const handleCreateAnnouncement = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Preencha título e conteúdo do comunicado.");
      return;
    }

    setPublishing(true);
    try {
      await createAnnouncement({
        data: { title: title.trim(), body: body.trim() },
      });
      toast.success("Comunicado publicado no Portal dos Pais! 📢");
      setTitle("");
      setBody("");
      setShowAnnForm(false);
      loadAnnouncementsData();
    } catch (err) {
      toast.error("Erro ao publicar aviso", {
        description: err instanceof Error ? err.message : "Erro",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncement({ data: { announcementId: id } });
      toast.success("Comunicado removido.");
      loadAnnouncementsData();
    } catch {
      toast.error("Erro ao remover aviso.");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard da supervisão"
        subtitle="Visão geral da clínica e comunicados oficiais."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/hours">
              <Clock4 className="size-4" /> Controle de horas
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat icon={Users} label="Pacientes ativos" value={adminStats.patients} />
        <Stat icon={Stethoscope} label="Terapeutas" value={adminStats.therapists} />
        <Stat icon={Activity} label="Sessões/semana" value={adminStats.sessionsThisWeek} />
        <Stat icon={Clock4} label="Aprovações pendentes" value={adminStats.pendingApprovals} accent />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Evolução global das sessões</h3>
              <Badge variant="secondary">Mês atual</Badge>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Desempenho"]} />
                  <Area type="monotone" dataKey="desempenho" stroke="oklch(0.5 0.22 285)" fill="oklch(0.5 0.22 285 / 0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── QUADRO DE GESTÃO DE COMUNICADOS PARA O ADMIN ───────────────────── */}
        <Card className="lg:col-span-1 border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Megaphone className="size-4 text-primary" />
                Mural de Avisos Gerais
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAnnForm((v) => !v)}
                className="h-7 text-xs"
              >
                <Plus className="size-3.5 mr-1" /> Novo
              </Button>
            </div>

            {showAnnForm && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                <div>
                  <Label className="text-[11px] mb-1 block">Título do Aviso *</Label>
                  <Input
                    placeholder="Ex: Recesso de Carnaval"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block">Conteúdo do Comunicado *</Label>
                  <Textarea
                    placeholder="Mensagem destinada a todos os pais..."
                    rows={2}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <Button onClick={handleCreateAnnouncement} disabled={publishing} size="sm" className="w-full h-7 text-xs">
                  {publishing ? <Loader2 className="size-3.5 animate-spin" /> : "Publicar para os Pais"}
                </Button>
              </div>
            )}

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {loadingAnnouncements ? (
                <div className="py-4 text-center text-xs text-muted-foreground">Carregando...</div>
              ) : announcements.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">Nenhum aviso ativo.</p>
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="p-2.5 rounded-lg border border-border/80 bg-card flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-xs text-foreground">{a.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteAnnouncement(a.id)} className="size-6 shrink-0">
                      <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-3">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Pacientes recentes</h3>
              <Button asChild variant="ghost" size="sm">
                <Link to="/patient/$patientId" params={{ patientId: "p1" }}>
                  Ver todos <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {patients.map((p) => (
                <Link
                  key={p.id}
                  to="/patient/$patientId"
                  params={{ patientId: p.id }}
                  className="rounded-xl border border-border p-3 hover:border-primary/40 hover:bg-primary-soft/40 transition-colors"
                >
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.diagnosis}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/40 bg-primary-soft/40" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`size-10 rounded-xl grid place-items-center ${
              accent ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"
            }`}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
