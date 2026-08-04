import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { notifications as seed } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BellRing, CheckCheck, Info, TriangleAlert, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Central de notificações — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Alertas de folhas de sessão pendentes, revisões de PEI, respostas no fórum clínico e comunicados da clínica em um só lugar.",
      },
      { property: "og:title", content: "Central de notificações" },
      {
        property: "og:description",
        content: "Pendências clínicas, revisões e avisos reunidos em uma única fila.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

const kindMeta = {
  alerta: { icon: TriangleAlert, tone: "bg-destructive/15 text-destructive" },
  info: { icon: Info, tone: "bg-primary-soft text-primary" },
  aviso: { icon: Megaphone, tone: "bg-warning/20 text-warning-foreground" },
} as const;

function NotificationsPage() {
  const [items, setItems] = useState(seed);
  const unread = items.filter((i) => !i.read).length;

  return (
    <AppLayout>
      <PageHeader
        title="Notificações"
        subtitle={unread > 0 ? `${unread} não lida(s).` : "Nenhuma pendência não lida."}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setItems((l) => l.map((i) => ({ ...i, read: true })))}
          >
            <CheckCheck className="size-4" /> Marcar todas
          </Button>
        }
      />

      <div className="space-y-2">
        {items.map((n) => {
          const meta = kindMeta[n.kind as keyof typeof kindMeta] ?? kindMeta.info;
          const Icon = meta.icon;
          return (
            <Card key={n.id} className={cn(!n.read && "border-primary/40 bg-primary-soft/25")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={cn("size-9 rounded-full grid place-items-center shrink-0", meta.tone)}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.read && <Badge className="text-[10px] border-0">nova</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{n.when}</p>
                </div>
                {!n.read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() =>
                      setItems((l) => l.map((i) => (i.id === n.id ? { ...i, read: true } : i)))
                    }
                  >
                    Lida
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-4">
        <BellRing className="size-3.5" /> As notificações substituem os grupos de mensagens externos.
      </p>
    </AppLayout>
  );
}
