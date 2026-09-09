import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { loginUser } from "@/queries/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, HeartPulse, ShieldCheck, Sparkles, User, Users } from "lucide-react";
import logo from "@/assets/logo-gize.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Gestão Clínica GiZé's" },
      { name: "description", content: "Acesse o sistema de gestão clínica ABA da GiZé's." },
      { name: "robots", content: "noindex" },
    ],
  }),
  // Se já estiver logado, redireciona direto
  beforeLoad: ({ context }) => {
    if (context.user) {
      const dest =
        context.user.role === "admin"
          ? "/admin"
          : context.user.role === "parent"
            ? "/parent"
            : "/";
      throw redirect({ to: dest });
    }
  },
  component: LoginPage,
});

const QUICK_ACCOUNTS = [
  {
    roleLabel: "Supervisora (Admin)",
    name: "Marina Duarte",
    email: "supervisora@gizeclinica.com.br",
    icon: ShieldCheck,
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    desc: "Gestão, DRE, PEP, Equipe",
  },
  {
    roleLabel: "Terapeuta ABA",
    name: "Ana Beatriz Lopes",
    email: "ana.lopes@gizeclinica.com.br",
    icon: HeartPulse,
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    desc: "Registro de Sessão, PEI, Gráficos",
  },
  {
    roleLabel: "Responsável / Pais",
    name: "Mariana Almeida",
    email: "mariana.almeida@email.com",
    icon: Users,
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    desc: "Portal dos Pais, Devolutivas",
  },
];

function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const doLogin = async (targetEmail: string, targetPassword: string) => {
    setError(null);
    setLoading(true);
    try {
      const user = await loginUser({ data: { email: targetEmail, password: targetPassword } });
      toast.success(`Bem-vindo(a), ${user.name.split(" ")[0]}! 👋`);

      // Redireciona pela role
      const dest =
        user.role === "admin" ? "/admin" : user.role === "parent" ? "/parent" : "/";

      await router.invalidate();
      throw redirect({ to: dest });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "to" in err) throw err; // re-throw redirect
      const msg =
        err instanceof Error ? err.message : "Erro ao conectar. Tente novamente.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Informe seu e-mail."); return; }
    if (!password)      { setError("Informe sua senha."); return; }
    await doLogin(email, password);
  };

  const handleQuickLogin = (accEmail: string) => {
    setEmail(accEmail);
    setPassword("Gizes@2025");
    void doLogin(accEmail, "Gizes@2025");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(270_60%_97%)] via-background to-[hsl(270_40%_95%)] flex flex-col items-center justify-center px-4 py-8">

      {/* Logo + título */}
      <div className="mb-6 flex flex-col items-center gap-2 select-none">
        <div className="size-16 rounded-2xl bg-primary-soft shadow-lg grid place-items-center overflow-hidden ring-4 ring-primary/20">
          <img src={logo} alt="GiZé's Clínica" className="size-12 object-contain" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            GiZé&apos;s Clínica
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sistema de Gestão ABA</p>
        </div>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Card de Acesso Rápido / Demo */}
        <Card className="shadow-lg border-primary/20 bg-card/90 backdrop-blur">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-primary animate-pulse" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">
                Acesso Rápido com 1 Clique
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Clique em um dos perfis abaixo para testar instantaneamente:
            </p>

            <div className="grid grid-cols-1 gap-2">
              {QUICK_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleQuickLogin(acc.email)}
                    disabled={loading}
                    className="w-full text-left flex items-center justify-between p-2.5 rounded-lg border border-border/70 hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99] transition-all disabled:opacity-50 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-full bg-muted flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {acc.name}
                          </span>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${acc.badgeColor}`}
                          >
                            {acc.roleLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {acc.desc}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-primary font-medium shrink-0 ml-2 group-hover:underline">
                      Entrar →
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Card de login manual */}
        <Card className="shadow-xl border-primary/10">
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              Ou entre com outro e-mail e senha
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Acesse com suas credenciais institucionais.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* E-mail */}
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-medium">
                  E-mail
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="seunome@gizeclinica.com.br"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  disabled={loading}
                  className={error && !email ? "border-destructive" : ""}
                />
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-xs font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    disabled={loading}
                    className={`pr-10 ${error && !password ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Mensagem de erro inline */}
              {error && (
                <p
                  role="alert"
                  className="text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-md px-3 py-2"
                >
                  {error}
                </p>
              )}

              {/* Botão */}
              <Button
                type="submit"
                className="w-full h-10 text-sm font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground/60 text-center">
        © {new Date().getFullYear()} GiZé&apos;s Clínica · Todos os direitos reservados
      </p>
    </div>
  );
}
