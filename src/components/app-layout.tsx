import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import {
  Home, Users, CalendarDays, MessageSquare, Clock,
  LineChart, Bell, Stethoscope, FileText, UserCog,
  ShieldCheck, Heart, ClipboardCheck, LogOut, Loader2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useCurrentUser } from "@/lib/auth-context";
import { logoutUser } from "@/server/queries/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import logo from "@/assets/logo-gize.png";

type NavItem = { to: string; label: string; icon: typeof Home };

const navByRole: Record<string, NavItem[]> = {
  therapist: [
    { to: "/",            label: "Hoje",         icon: Home },
    { to: "/agenda",      label: "Agenda",        icon: CalendarDays },
    { to: "/patients",    label: "Pacientes",     icon: Users },
    { to: "/pei/p1",      label: "PEI",           icon: ClipboardCheck },
    { to: "/reports",     label: "Relatórios",    icon: FileText },
    { to: "/forum",       label: "Fórum",         icon: MessageSquare },
    { to: "/notifications",label: "Notificações", icon: Bell },
  ],
  admin: [
    { to: "/admin",           label: "Dashboard",     icon: Home },
    { to: "/admin/approvals", label: "Aprovações",    icon: ClipboardCheck },
    { to: "/agenda",          label: "Agenda",        icon: CalendarDays },
    { to: "/patients",        label: "Pacientes",     icon: Users },
    { to: "/admin/team",      label: "Equipe",        icon: UserCog },
    { to: "/admin/hours",     label: "Horas",         icon: Clock },
    { to: "/reports",         label: "Relatórios",    icon: FileText },
    { to: "/forum",           label: "Fórum",         icon: MessageSquare },
    { to: "/notifications",   label: "Notificações",  icon: Bell },
  ],
  parent: [
    { to: "/parent",        label: "Devolutivas", icon: Heart },
    { to: "/parent/agenda", label: "Agenda",      icon: CalendarDays },
  ],
};

const roleLabel: Record<string, string> = {
  admin:     "Supervisora",
  therapist: "Terapeuta",
  parent:    "Responsável",
};

const roleIcon = {
  admin:     ShieldCheck,
  therapist: Stethoscope,
  parent:    Heart,
} as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const user     = useCurrentUser();
  const router   = useRouter();
  const role     = user?.role ?? "therapist";
  const items    = navByRole[role] ?? [];
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const RoleIcon = roleIcon[role as keyof typeof roleIcon] ?? Stethoscope;
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
      await router.invalidate();
      router.navigate({ to: "/login" });
    } catch {
      toast.error("Erro ao sair. Tente novamente.");
    } finally {
      setLoggingOut(false);
    }
  };

  const UserInfo = () => (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold shrink-0">
        {user?.avatar_initials ?? "??"}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium leading-tight truncate">{user?.name ?? "—"}</p>
        <p className="text-[10px] text-muted-foreground leading-tight flex items-center gap-1">
          <RoleIcon className="size-3" />
          {roleLabel[role]}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Desktop sidebar ───────────────────────────────────────── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-sidebar-border bg-sidebar z-30">
        <div className="px-5 py-5 flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary-soft grid place-items-center shadow-sm overflow-hidden">
            <img src={logo} alt="GiZé's Clínica" width={36} height={36} loading="lazy" className="size-7 object-contain" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">GiZé&apos;s Clínica</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Gestão ABA</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {items.map((it) => {
            const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <it.icon className="size-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        {/* Usuário + logout */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-2 px-1 py-1">
            <UserInfo />
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-destructive transition-colors"
          >
            {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            Sair
          </button>
        </div>
      </aside>

      {/* ── Mobile header ─────────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-3 bg-background/85 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-8 rounded-lg bg-primary-soft grid place-items-center overflow-hidden">
            <img src={logo} alt="GiZé's" width={32} height={32} loading="lazy" className="size-6 object-contain" />
          </div>
          <p className="text-sm font-semibold truncate">GiZé&apos;s ABA</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Sair"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          Sair
        </button>
      </header>

      {/* ── Desktop header (slim) ─────────────────────────────────── */}
      <header className="hidden md:flex sticky top-0 z-20 ml-64 h-14 items-center justify-end gap-3 px-6 bg-background/85 backdrop-blur border-b border-border">
        <span className="text-xs text-muted-foreground">
          Atuando como{" "}
          <span className="font-medium text-foreground">{roleLabel[role]}</span>
        </span>
      </header>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="md:ml-64 px-4 md:px-8 py-5 md:py-7 pb-24 md:pb-10 max-w-6xl mx-auto md:mx-0">
        {children}
      </main>

      {/* ── Mobile bottom tabs ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border">
        <div className="grid grid-cols-5 gap-1 px-2 py-1.5">
          {items.slice(0, 4).map((it) => {
            const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <it.icon className={cn("size-5", active && "stroke-[2.3]")} />
                {it.label}
              </Link>
            );
          })}
          <Link
            to="/evolution/p1"
            className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground"
          >
            <LineChart className="size-5" />
            Evolução
          </Link>
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
