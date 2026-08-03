import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Users,
  CalendarDays,
  MessageSquare,
  Clock,
  LineChart,
  Bell,
  Stethoscope,
  ShieldCheck,
  Heart,
  ClipboardCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useRole } from "@/lib/role-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-gize.png";

type NavItem = { to: string; label: string; icon: typeof Home };

const navByRole: Record<string, NavItem[]> = {
  therapist: [
    { to: "/", label: "Hoje", icon: Home },
    { to: "/agenda", label: "Agenda", icon: CalendarDays },
    { to: "/patients", label: "Pacientes", icon: Users },
    { to: "/pei/p1", label: "PEI", icon: ClipboardCheck },
    { to: "/forum", label: "Fórum", icon: MessageSquare },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: Home },
    { to: "/admin/approvals", label: "Aprovações", icon: ClipboardCheck },
    { to: "/agenda", label: "Agenda", icon: CalendarDays },
    { to: "/patients", label: "Pacientes", icon: Users },
    { to: "/admin/hours", label: "Horas", icon: Clock },
    { to: "/forum", label: "Fórum", icon: MessageSquare },
  ],
  parent: [
    { to: "/parent", label: "Devolutivas", icon: Heart },
    { to: "/parent#avisos", label: "Avisos", icon: Bell },
  ],
};


const roleIcon = {
  admin: ShieldCheck,
  therapist: Stethoscope,
  parent: Heart,
} as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { role, setRole } = useRole();
  const items = navByRole[role];
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const RoleIcon = roleIcon[role];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-sidebar-border bg-sidebar z-30">
        <div className="px-5 py-5 flex items-center gap-2">
          <div className="size-9 rounded-xl gradient-brand grid place-items-center text-primary-foreground shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">GiZé's Clínica</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Gestão ABA</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1">
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
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <it.icon className="size-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
            Perfil ativo
          </div>
          <Select value={role} onValueChange={(v) => setRole(v as never)}>
            <SelectTrigger className="w-full">
              <RoleIcon className="size-4 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="therapist">Terapeuta</SelectItem>
              <SelectItem value="parent">Responsável / Pai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-3 bg-background/85 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-8 rounded-lg gradient-brand grid place-items-center text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <p className="text-sm font-semibold truncate">GiZé's ABA</p>
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as never)}>
          <SelectTrigger className="h-9 w-[160px]">
            <RoleIcon className="size-4 text-primary" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="therapist">Terapeuta</SelectItem>
            <SelectItem value="parent">Responsável</SelectItem>
          </SelectContent>
        </Select>
      </header>

      {/* Desktop header (slim) */}
      <header className="hidden md:flex sticky top-0 z-20 ml-64 h-14 items-center justify-end gap-3 px-6 bg-background/85 backdrop-blur border-b border-border">
        <span className="text-xs text-muted-foreground">
          Atuando como{" "}
          <span className="font-medium text-foreground capitalize">
            {role === "admin" ? "Administrador" : role === "therapist" ? "Terapeuta" : "Responsável"}
          </span>
        </span>
      </header>

      {/* Main */}
      <main className="md:ml-64 px-4 md:px-8 py-5 md:py-7 pb-24 md:pb-10 max-w-6xl mx-auto md:mx-0">
        {children}
      </main>

      {/* Mobile bottom tabs */}
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
                  active ? "text-primary" : "text-muted-foreground"
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
