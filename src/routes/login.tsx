import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { loginUser } from "@/queries/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, HeartPulse, ShieldCheck } from "lucide-react";
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

function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError("Informe seu e-mail."); return; }
    if (!password)      { setError("Informe sua senha."); return; }

    setLoading(true);
    try {
      const user = await loginUser({ data: { email, password } });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(270_60%_97%)] via-background to-[hsl(270_40%_95%)] flex flex-col items-center justify-center px-4">

      {/* Logo + título */}
      <div className="mb-8 flex flex-col items-center gap-3 select-none">
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

      {/* Card de login */}
      <Card className="w-full max-w-sm shadow-xl border-primary/10">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-1">Entrar</h2>
          <p className="text-xs text-muted-foreground mb-6">
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
              className="w-full h-11 text-sm font-medium"
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

      {/* Roles disponíveis — badge visual para contexto */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {[
          { icon: ShieldCheck, label: "Supervisora" },
          { icon: HeartPulse, label: "Terapeuta" },
          { icon: HeartPulse, label: "Responsável" },
        ].map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 rounded-full px-3 py-1"
          >
            <Icon className="size-3" />
            {label}
          </span>
        ))}
      </div>

      <p className="mt-8 text-[11px] text-muted-foreground/60">
        © {new Date().getFullYear()} GiZé&apos;s Clínica · Todos os direitos reservados
      </p>
    </div>
  );
}
