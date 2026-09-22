import React, { useState, useEffect } from "react";
import {
  getPatientGuardians,
  createAndLinkGuardian,
  updateGuardianPassword,
  unlinkGuardian,
  type PatientGuardianItem,
} from "@/queries/guardians";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  Trash2,
  Copy,
  Check,
  Mail,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface PatientGuardiansManagerProps {
  patientId: string;
  patientName?: string;
  defaultGuardianName?: string;
  defaultGuardianEmail?: string;
  defaultGuardianRelation?: string;
  onGuardiansChange?: () => void;
}

function generateRandomPassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
  let pass = "";
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Gz@${pass}26`;
}

export function PatientGuardiansManager({
  patientId,
  patientName = "Paciente",
  defaultGuardianName = "",
  defaultGuardianEmail = "",
  defaultGuardianRelation = "",
  onGuardiansChange,
}: PatientGuardiansManagerProps) {
  const [guardians, setGuardians] = useState<PatientGuardianItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Criação / Vínculo
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRelation, setCreateRelation] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);

  // Modal de Redefinição de Senha
  const [resetOpen, setResetOpen] = useState(false);
  const [targetGuardian, setTargetGuardian] = useState<PatientGuardianItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingReset, setSavingReset] = useState(false);

  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getPatientGuardians({ data: { patientId } })
      .then((res) => {
        setGuardians(res || []);
      })
      .catch(() => setGuardians([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (patientId) load();
  }, [patientId]);

  const openCreateModal = () => {
    setCreateName(defaultGuardianName || "");
    setCreateEmail(defaultGuardianEmail || "");
    setCreateRelation(defaultGuardianRelation || "Mãe");
    setCreatePassword(generateRandomPassword());
    setShowCreatePassword(false);
    setCreateOpen(true);
  };

  const handleCreateAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      toast.error("Informe o nome do responsável.");
      return;
    }
    if (!createEmail.trim() || !createEmail.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (createPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSavingCreate(true);
    try {
      const res = await createAndLinkGuardian({
        data: {
          patientId,
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          relation: createRelation.trim(),
        },
      });

      toast.success(res.message);
      setCreateOpen(false);
      load();
      onGuardiansChange?.();
    } catch (err) {
      toast.error("Erro ao cadastrar responsável", {
        description: err instanceof Error ? err.message : "Erro no servidor",
      });
    } finally {
      setSavingCreate(false);
    }
  };

  const openResetModal = (g: PatientGuardianItem) => {
    setTargetGuardian(g);
    setNewPassword(generateRandomPassword());
    setShowNewPassword(false);
    setResetOpen(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGuardian) return;
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSavingReset(true);
    try {
      const res = await updateGuardianPassword({
        data: {
          guardianId: targetGuardian.guardianId,
          newPassword,
          patientId,
        },
      });

      toast.success(res.message);
      setResetOpen(false);
      setTargetGuardian(null);
    } catch (err) {
      toast.error("Erro ao redefinir senha", {
        description: err instanceof Error ? err.message : "Erro no servidor",
      });
    } finally {
      setSavingReset(false);
    }
  };

  const handleUnlink = async (g: PatientGuardianItem) => {
    if (!confirm(`Deseja desvincular o responsável "${g.name}" de ${patientName}?`)) return;

    try {
      await unlinkGuardian({
        data: {
          patientId,
          guardianId: g.guardianId,
        },
      });
      toast.success("Responsável desvinculado com sucesso.");
      load();
      onGuardiansChange?.();
    } catch (err) {
      toast.error("Erro ao desvincular", {
        description: err instanceof Error ? err.message : "Erro",
      });
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    toast.success("E-mail copiado!");
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="pb-3 border-b bg-muted/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Users className="size-4 text-primary" /> Acesso dos Responsáveis (Portal da Família)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Gerencie as credenciais de login dos pais/mães para acesso exclusivo às devolutivas e relatórios de {patientName}.
            </CardDescription>
          </div>

          <Button size="sm" className="h-8 gap-1.5 text-xs self-start sm:self-auto" onClick={openCreateModal}>
            <UserPlus className="size-3.5" /> Adicionar Responsável
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            <Loader2 className="size-5 animate-spin mx-auto text-primary mb-2" /> Carregando responsáveis...
          </div>
        ) : guardians.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center mx-auto">
              <Users className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Nenhum login de responsável cadastrado</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Cadastre o e-mail e senha inicial para que os pais possam acompanhar as devolutivas diárias das sessões e os relatórios clínicos oficiais.
              </p>
            </div>
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={openCreateModal}>
              <UserPlus className="size-3.5" /> Criar Acesso do Responsável
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {guardians.map((g) => {
              const initials = g.name
                .split(/\s+/)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase();

              return (
                <div
                  key={g.guardianId}
                  className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <Avatar className="size-10 ring-2 ring-primary/20 shrink-0 mt-0.5 sm:mt-0">
                      <AvatarFallback className="bg-primary-soft text-primary font-semibold text-xs">
                        {initials || "RS"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{g.name}</span>
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {g.relation || "Responsável"}
                        </Badge>
                        <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          Portal da Família Ativo
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Mail className="size-3" />
                          {g.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(g.email)}
                          className="hover:text-foreground text-[11px] flex items-center gap-0.5 text-primary"
                          title="Copiar e-mail"
                        >
                          {copiedEmail === g.email ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                        </button>
                        {g.phone && <span>• Tel: {g.phone}</span>}
                        <span>• Vinculado em: {g.assignedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => openResetModal(g)}
                      title="Redefinir ou alterar a senha de acesso deste responsável"
                    >
                      <Key className="size-3.5" />
                      <span>Alterar senha</span>
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleUnlink(g)}
                      title="Desvincular responsável deste paciente"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* MODAL 1: CRIAR E VINCULAR RESPONSÁVEL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateAndLink}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <UserPlus className="size-4 text-primary" /> Cadastrar Acesso do Responsável
              </DialogTitle>
              <DialogDescription className="text-xs">
                Crie as credenciais de acesso ao Portal dos Pais para acompanhar a evolução de {patientName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div className="space-y-1">
                <Label htmlFor="gName" className="text-xs font-medium">
                  Nome do Responsável *
                </Label>
                <Input
                  id="gName"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ex.: Mariana Almeida"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="gEmail" className="text-xs font-medium">
                    E-mail (Login) *
                  </Label>
                  <Input
                    id="gEmail"
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="responsavel@email.com"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="gRel" className="text-xs font-medium">
                    Parentesco
                  </Label>
                  <Input
                    id="gRel"
                    value={createRelation}
                    onChange={(e) => setCreateRelation(e.target.value)}
                    placeholder="Ex.: Mãe, Pai, Avó..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="gPass" className="text-xs font-medium">
                    Senha Inicial de Acesso *
                  </Label>
                  <button
                    type="button"
                    onClick={() => setCreatePassword(generateRandomPassword())}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="size-3" /> Gerar Senha Aleatória
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="gPass"
                    type={showCreatePassword ? "text" : "password"}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-9 font-mono text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCreatePassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  A senha é protegida via criptografia PBKDF2 no banco D1. Anote para informar aos pais.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" /> Permissões da Família
                </p>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  Ao cadastrar, o responsável terá perfil <strong>parent</strong> com permissão restrita para ver devolutivas diárias e relatórios clínicos emitidos exclusivamente para este filho.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={savingCreate} className="gap-1.5">
                {savingCreate ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Cadastrar e Vincular
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: REDEFINIR SENHA DO RESPONSÁVEL */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleUpdatePassword}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Key className="size-4 text-primary" /> Alterar Senha do Responsável
              </DialogTitle>
              <DialogDescription className="text-xs">
                Defina uma nova senha de acesso ao Portal dos Pais para{" "}
                <span className="font-semibold text-foreground">{targetGuardian?.name}</span> ({targetGuardian?.email}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="newPass" className="text-xs font-medium">
                    Nova Senha *
                  </Label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="size-3" /> Gerar Senha Forte
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="newPass"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-9 font-mono text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Lock className="size-3.5 text-amber-600 dark:text-amber-400" /> Atualização Imediata
                </p>
                <p className="text-[11px] leading-relaxed">
                  A nova senha entrará em vigor imediatamente. A alteração será registrada na Trilha de Auditoria LGPD.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setResetOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={savingReset} className="gap-1.5">
                {savingReset ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Confirmar Redefinição
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

