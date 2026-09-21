import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { AppLayout, PageHeader } from "@/components/app-layout";
import {
  createTeamMember,
  getClinicTeam,
  resetTeamMemberPassword,
  setTeamMemberActive,
  updateTeamMember,
  type TeamMemberItem,
} from "@/queries/team";
import {
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
  PRESETS,
  normalizePermissions,
} from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Pencil,
  Ban,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/team")({
  beforeLoad: requirePermission("team:view"),
  head: () => ({
    meta: [
      { title: "Gestão de Equipe e Permissões — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Cadastro da equipe multidisciplinar e controle granular de permissões de acesso da clínica.",
      },
      { property: "og:title", content: "Gestão de equipe clínica e permissões" },
      {
        property: "og:description",
        content: "Acompanhe equipe clínica, carga horária e gerencie níveis de permissões granulares.",
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
  const currentUser = useCurrentUser();
  const isMaster = currentUser?.is_master === 1;
  const [team, setTeam] = useState<TeamMemberItem[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [q, setQ] = useState("");

  // Modal de cadastro e edição
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberItem | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [registry, setRegistry] = useState("");
  const [role, setRole] = useState<"therapist" | "admin">("therapist");
  const [memberIsMaster, setMemberIsMaster] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    ...PRESETS.THERAPIST,
  ]);
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

  const applyPreset = (presetKey: keyof typeof PRESETS | "ALL" | "NONE") => {
    if (presetKey === "ALL") {
      setSelectedPermissions(ALL_PERMISSIONS.map((p) => p.id));
      toast.info("Todas as permissões foram marcadas.");
    } else if (presetKey === "NONE") {
      setSelectedPermissions([]);
      toast.info("Permissões limpas.");
    } else {
      setSelectedPermissions([...PRESETS[presetKey]]);
      toast.info(`Preset aplicado com sucesso.`);
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId],
    );
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
    if (!editingMember && (!password || password.length < 6)) {
      setFormError("A senha inicial deve conter pelo menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const finalPermissions = memberIsMaster ? [...PRESETS.MASTER] : selectedPermissions;

      if (editingMember) {
        await updateTeamMember({
          data: {
            id: editingMember.id,
            name: name.trim(),
            email: email.trim(),
            registry: registry.trim() || undefined,
            role,
            isMaster: role === "admin" && memberIsMaster,
            permissions: finalPermissions,
          },
        });
        toast.success("Profissional atualizado com sucesso!");
      } else {
        const res = await createTeamMember({
          data: {
            name: name.trim(),
            email: email.trim(),
            registry: registry.trim() || undefined,
            role,
            isMaster: role === "admin" && memberIsMaster,
            password,
            permissions: finalPermissions,
          },
        });

        toast.success(`Profissional ${res.name} cadastrado com sucesso! 🎉`, {
          description: `Senha padrão configurada: ${res.password} (Copie e envie ao usuário)`,
          duration: 8000,
        });
      }

      // Limpa e fecha modal
      setName("");
      setEmail("");
      setRegistry("");
      setRole("therapist");
      setMemberIsMaster(false);
      setSelectedPermissions([...PRESETS.THERAPIST]);
      setPassword("Gize@2026");
      setEditingMember(null);
      setDialogOpen(false);

      // Recarrega equipe em tempo real
      loadTeamData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar profissional.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openCreate = () => {
    setEditingMember(null);
    setName("");
    setEmail("");
    setRegistry("");
    setRole("therapist");
    setMemberIsMaster(false);
    setSelectedPermissions([...PRESETS.THERAPIST]);
    setPassword("Gize@2026");
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (member: TeamMemberItem) => {
    setEditingMember(member);
    setName(member.name);
    setEmail(member.email);
    setRegistry(member.registry || "");
    setRole(member.role);
    setMemberIsMaster(member.is_master === 1);
    setSelectedPermissions(
      member.permissions && member.permissions.length > 0
        ? [...member.permissions]
        : normalizePermissions(null, member.role, member.is_master),
    );
    setPassword("");
    setFormError(null);
    setDialogOpen(true);
  };

  const toggleActive = async (member: TeamMemberItem) => {
    if (!isMaster) {
      toast.error("Apenas o usuário master pode desativar ou reativar usuários.");
      return;
    }
    const active = member.is_active !== 1;
    await setTeamMemberActive({ data: { id: member.id, active } });
    toast.success(active ? "Profissional reativado." : "Profissional desativado.");
    loadTeamData();
  };

  const resetPassword = async (member: TeamMemberItem) => {
    if (!isMaster) {
      toast.error("Apenas o usuário master pode redefinir senhas.");
      return;
    }
    const newPassword = prompt(`Nova senha para ${member.name}:`, "Gize@2026");
    if (!newPassword) return;
    if (newPassword.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    await resetTeamMemberPassword({
      data: { id: member.id, email: member.email, password: newPassword },
    });
    toast.success("Senha redefinida.", {
      description: `Nova senha: ${newPassword}`,
      duration: 8000,
    });
  };

  const filteredTeam = team.filter(
    (m) =>
      m.name.toLowerCase().includes(q.toLowerCase()) ||
      m.role.toLowerCase().includes(q.toLowerCase()) ||
      m.email.toLowerCase().includes(q.toLowerCase()) ||
      (m.registry && m.registry.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <AppLayout>
      <PageHeader
        title="Equipe e Permissões"
        subtitle={`${team.length} profissionais cadastrados na unidade.`}
        action={
          <Button size="sm" onClick={openCreate} disabled={!isMaster}>
            <UserPlus className="size-4 mr-1.5" /> Adicionar Membro
          </Button>
        }
      />

      {!isMaster && (
        <Card className="mb-4 border-warning/30 bg-warning/10">
          <CardContent className="p-3 text-xs text-warning-foreground">
            Você está em uma conta administrativa comum. Apenas o usuário master pode cadastrar usuários, editar permissões, redefinir senhas e desativar acessos.
          </CardContent>
        </Card>
      )}

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
            <Card key={m.id} className="flex flex-col justify-between">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-11 bg-primary-soft shrink-0">
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
                      {m.is_master === 1 && (
                        <Badge className="text-[10px] bg-primary/15 text-primary border-0 flex items-center gap-1">
                          <ShieldCheck className="size-3" /> Master
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.registry ? `${m.registry}` : "Sem registro profissional informado"}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="size-3 shrink-0" /> {m.email}
                    </p>

                    {/* Resumo de Permissões */}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {m.is_master === 1 ? (
                        <Badge variant="secondary" className="text-[9px] bg-primary/15 text-primary border-primary/30">
                          Acesso Total Irrestrito
                        </Badge>
                      ) : (
                        <>
                          {m.permissions?.includes("financial:view") && (
                            <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                              Financeiro
                            </Badge>
                          )}
                          {m.permissions?.includes("approvals:manage") && (
                            <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
                              Aprovações
                            </Badge>
                          )}
                          {m.permissions?.includes("audit:view") && (
                            <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                              Auditoria
                            </Badge>
                          )}
                          {m.permissions?.includes("team:view") && (
                            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                              Equipe
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[9px] text-muted-foreground">
                            {m.permissions?.length ?? 0} permissões
                          </Badge>
                        </>
                      )}
                    </div>
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

                <div className="mt-3 flex flex-wrap justify-end gap-1 border-t border-border/60 pt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(m)} disabled={!isMaster}>
                    <Pencil className="size-3.5 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resetPassword(m)} disabled={!isMaster}>
                    <KeyRound className="size-3.5 mr-1" /> Senha
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActive(m)}
                    disabled={!isMaster || m.id === currentUser?.id}
                  >
                    <Ban className="size-3.5 mr-1" /> {m.is_active === 1 ? "Desativar" : "Reativar"}
                  </Button>
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
            <Award className="size-4 text-primary" /> Registros e Habilitações Vigentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {team.filter((m) => m.registry).length === 0 ? (
              <p className="px-5 py-4 text-xs text-muted-foreground italic">
                Nenhum registro profissional cadastrado no momento.
              </p>
            ) : (
              team
                .filter((m) => m.registry)
                .map((m) => (
                  <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.role === "admin" ? "Supervisão Técnica" : "Terapeuta ABA"} ({m.registry})
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{m.name}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {m.status}
                    </Badge>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── MODAL DE CADASTRO / EDIÇÃO COM RBAC GRANULAR ───────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <UserPlus className="size-5 text-primary" />
              {editingMember ? `Editar ${editingMember.name}` : "Cadastrar Novo Membro"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingMember
                ? "Configure os dados profissionais, papel e permissões de acesso ao sistema."
                : "Cadastre um novo colaborador na clínica e selecione suas permissões modulares."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMember} className="flex-1 overflow-y-auto pr-1 space-y-4 py-2">
            {/* Dados Básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>

            {/* Registro e Cargo em linha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  onValueChange={(val: "therapist" | "admin") => {
                    setRole(val);
                    if (val !== "admin") {
                      setMemberIsMaster(false);
                      setSelectedPermissions([...PRESETS.THERAPIST]);
                    } else {
                      setSelectedPermissions([...PRESETS.SUPERVISOR]);
                    }
                  }}
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

            {/* Opção Usuário Master */}
            {role === "admin" && (
              <label className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary-soft/20 p-3 text-xs cursor-pointer">
                <Checkbox
                  checked={memberIsMaster}
                  onCheckedChange={(checked) => setMemberIsMaster(!!checked)}
                  disabled={submitting}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <ShieldCheck className="size-3.5 text-primary" /> Usuário Master (Acesso Total)
                  </span>
                  <span className="block text-muted-foreground text-[11px] mt-0.5">
                    Permite criar e gerenciar usuários, conceder permissões, visualizar logs de auditoria e acessar todos os módulos sem restrições.
                  </span>
                </div>
              </label>
            )}

            {/* SEÇÃO DE PERMISSÕES GRANULARES */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Sliders className="size-3.5 text-primary" /> Matriz de Permissões
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {memberIsMaster
                      ? "Usuários Master têm todas as permissões liberadas automaticamente."
                      : `${selectedPermissions.length} de ${ALL_PERMISSIONS.length} permissões concedidas.`}
                  </p>
                </div>

                {/* Presets Rápidos */}
                <div className="flex items-center gap-1 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={memberIsMaster || submitting}
                    onClick={() => applyPreset("THERAPIST")}
                    className="h-6 text-[10px] px-2"
                  >
                    Terapeuta
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={memberIsMaster || submitting}
                    onClick={() => applyPreset("SUPERVISOR")}
                    className="h-6 text-[10px] px-2"
                  >
                    Supervisora
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={memberIsMaster || submitting}
                    onClick={() => applyPreset("FINANCIAL_ADMIN")}
                    className="h-6 text-[10px] px-2"
                  >
                    Financeiro
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={memberIsMaster || submitting}
                    onClick={() => applyPreset("ALL")}
                    className="h-6 text-[10px] px-1.5 text-primary"
                  >
                    Todas
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={memberIsMaster || submitting}
                    onClick={() => applyPreset("NONE")}
                    className="h-6 text-[10px] px-1.5 text-destructive"
                  >
                    Limpar
                  </Button>
                </div>
              </div>

              {/* Grupos de Permissões */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {PERMISSION_GROUPS.map((group) => {
                  const groupIds = new Set(group.permissions.map((p) => p.id as string));
                  const isAllChecked = group.permissions.every((p) =>
                    memberIsMaster ? true : selectedPermissions.includes(p.id),
                  );

                  return (
                    <div
                      key={group.id}
                      className="rounded-lg border border-border/70 bg-card p-2.5 space-y-2"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-border/50">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-primary" /> {group.label}
                        </span>
                        {!memberIsMaster && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isAllChecked) {
                                setSelectedPermissions((prev) =>
                                  prev.filter((id) => !groupIds.has(id)),
                                );
                              } else {
                                setSelectedPermissions((prev) =>
                                  Array.from(new Set([...prev, ...Array.from(groupIds)])),
                                );
                              }
                            }}
                            className="text-[10px] text-primary hover:underline font-medium"
                          >
                            {isAllChecked ? "Desmarcar todos" : "Marcar todos"}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.permissions.map((perm) => {
                          const isChecked =
                            memberIsMaster || selectedPermissions.includes(perm.id);

                          return (
                            <label
                              key={perm.id}
                              className={cn(
                                "flex items-start gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors",
                                isChecked
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-border/40 hover:bg-muted/40",
                                (memberIsMaster || submitting) && "cursor-default",
                              )}
                            >
                              <Checkbox
                                id={`perm-${perm.id}`}
                                checked={isChecked}
                                disabled={memberIsMaster || submitting}
                                onCheckedChange={() => togglePermission(perm.id)}
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground leading-tight text-[11px]">
                                  {perm.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                  {perm.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seção de Credenciais com Senha Padrão (apenas na criação) */}
            {!editingMember && (
              <div className="p-3.5 rounded-lg border border-primary/20 bg-primary-soft/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="team-password"
                    className="text-xs font-semibold flex items-center gap-1.5 text-foreground"
                  >
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

                <p className="text-[10px] text-muted-foreground leading-tight">
                  ℹ️ O usuário deverá alterar esta senha no primeiro acesso ao sistema.
                </p>
              </div>
            )}

            {/* Mensagem de Erro Inline */}
            {formError && (
              <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {formError}
              </div>
            )}

            <DialogFooter className="pt-2 border-t border-border">
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
                    <Loader2 className="size-4 animate-spin mr-1.5" /> Salvando...
                  </>
                ) : editingMember ? (
                  "Salvar alterações"
                ) : (
                  "Cadastrar e salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
