import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { getClinicTeam, createTeamMember, type TeamMemberItem } from "@/queries/team";
import { teamCertifications } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Search,
  Award,
  Mail,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/team")({
  beforeLoad: requireRole("admin"),
  head: () => ({
    meta: [
      { title: "Gestão de Equipe Clínica — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Cadastro da equipe multidisciplinar: registros profissionais, carga semanal, número de casos atribuídos e certificações vigentes.",
      },
      { property: "og:title", content: "Gestão de equipe clínica" },
      {
        property: "og:description",
        content: "Acompanhe carga horária, casos por terapeuta e certificações da equipe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

const statusTone: Record<string, string> = {
  Ativa: "bg-success/15 text-success border-0",
  Férias: "bg-warning/20 text-warning-foreground border-0",
  Inativo: "bg-muted text-muted-foreground border-0",
};

function TeamPage() {
  const [team, setTeam] = useState<TeamMemberItem[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [q, setQ] = useState("");

  // Modal de cadastro
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [registry, setRegistry] = useState("");
  const [role, setRole] = useState<"therapist" | "admin">("therapist");
  const [password, setPassword] = useState("Gize@2026");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadTeamData = () => {
    getClinicTeam()
      .then((res) => setTeam(res))
      .catch(() => toast.error("Erro ao carregar equipe do D1."))
      .finally(() => setLoadingTeam(false));
  };

  useEffect(() => {
    loadTeamData();
  }, []);

  const handleGenerateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let pwd = "Gize#";
    for (let i = 0; i < 4; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    toast.info("Nova senha aleatória gerada!");
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Informe o nome completo do profissional.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFormError("Informe um e-mail profissional válido.");
      return;
    }
    if (!password || password.length < 6) {
      setFormError("A senha inicial deve conter pelo menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createTeamMember({
        data: {
          name: name.trim(),
          email: email.trim(),
          registry: registry.trim() || undefined,
          role,
          password,
        },
      });

      toast.success(`Profissional ${res.name} cadastrado com sucesso! 🎉`, {
        description: `Senha padrão configurada: ${res.password} (Copie e envie ao usuário)`,
        duration: 8000,
      });

      // Limpa e fecha modal
      setName("");
      setEmail("");
      setRegistry("");
      setRole("therapist");
      setPassword("Gize@2026");
      setDialogOpen(false);

      // Recarrega equipe em tempo real
      loadTeamData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar profissional.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTeam = team.filter(
    (m) =>
      m.name.toLowerCase().includes(q.toLowerCase()) ||
      m.role.toLowerCase().includes(q.toLowerCase()) ||
      m.email.toLowerCase().includes(q.toLowerCase()) ||
      (m.registry && m.registry.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <AppLayout>
      <PageHeader
        title="Equipe clínica"
        subtitle={`${team.length} profissionais cadastrados na unidade.`}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <UserPlus className="size-4 mr-1.5" /> Adicionar Membro
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, especialidade ou registro..."
          className="pl-9"
        />
      </div>

      {loadingTeam ? (
        <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="size-5 animate-spin text-primary" />
          Carregando equipe do banco D1...
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredTeam.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-11 bg-primary-soft">
                    <AvatarFallback className="bg-primary-soft text-primary text-xs font-semibold">
                      {m.avatar_initials ?? m.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{m.name}</p>
                      <Badge className={cn("text-[10px]", statusTone[m.status])}>{m.status}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize flex items-center gap-1">
                        {m.role === "admin" ? (
                          <ShieldCheck className="size-3 text-primary" />
                        ) : (
                          <Stethoscope className="size-3 text-primary" />
                        )}
                        {m.role === "admin" ? "Supervisora" : "Terapeuta"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.registry ? `${m.registry}` : "Sem registro profissional informado"}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="size-3" /> {m.email}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4 border-t border-border/60 pt-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Casos atribuídos</p>
                    <p className="text-sm font-medium">{m.caseload} pacientes</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Carga semanal · {m.weeklyHours}h / 40h
                    </p>
                    <Progress value={(m.weeklyHours / 40) * 100} className="h-1.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loadingTeam && filteredTeam.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum profissional encontrado.
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="size-4 text-primary" /> Certificações vigentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {teamCertifications.map((c) => (
              <div key={c.cert} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.cert}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.member}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  válida até {c.validity}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── MODAL DE CADASTRO DE NOVO MEMBRO DA EQUIPE ───────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <UserPlus className="size-5 text-primary" /> Cadastrar Novo Membro
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre um novo profissional na equipe clínica e defina suas credenciais iniciais.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMember} className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-1">
              <Label htmlFor="team-name" className="text-xs font-medium">
                Nome Completo *
              </Label>
              <Input
                id="team-name"
                placeholder="Ex: Dra. Patricia Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                className="text-xs h-9"
              />
            </div>

            {/* E-mail */}
            <div className="space-y-1">
              <Label htmlFor="team-email" className="text-xs font-medium">
                E-mail Profissional *
              </Label>
              <Input
                id="team-email"
                type="email"
                placeholder="patricia.silva@gizeclinica.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="text-xs h-9"
              />
            </div>

            {/* Registro e Cargo em linha */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="team-registry" className="text-xs font-medium">
                  Registro Profissional
                </Label>
                <Input
                  id="team-registry"
                  placeholder="Ex: CRP 06/99887"
                  value={registry}
                  onChange={(e) => setRegistry(e.target.value)}
                  disabled={submitting}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="team-role" className="text-xs font-medium">
                  Papel / Cargo *
                </Label>
                <Select
                  value={role}
                  onValueChange={(val: "therapist" | "admin") => setRole(val)}
                  disabled={submitting}
                >
                  <SelectTrigger id="team-role" className="text-xs h-9">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="therapist" className="text-xs">
                      Terapeuta ABA
                    </SelectItem>
                    <SelectItem value="admin" className="text-xs">
                      Supervisora (Admin)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Seção de Credenciais com Senha Padrão */}
            <div className="p-3.5 rounded-lg border border-primary/20 bg-primary-soft/30 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="team-password" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <KeyRound className="size-3.5 text-primary" /> Senha Inicial / Padrão *
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateRandomPassword}
                  disabled={submitting}
                  className="h-7 text-[11px] px-2 text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Sparkles className="size-3 mr-1" /> Gerar Aleatória
                </Button>
              </div>

              <div className="relative">
                <Input
                  id="team-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Defina a senha inicial..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="pr-9 text-xs h-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground leading-tight">
                ℹ️ O usuário deverá alterar esta senha no primeiro acesso ou no seu perfil institucional.
              </p>
            </div>

            {/* Mensagem de Erro Inline */}
            {formError && (
              <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {formError}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
                size="sm"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} size="sm">
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" /> Salvando no D1...
                  </>
                ) : (
                  "Salvar no D1"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
