import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guard";
import { useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem,
} from "@/queries/notifications_audit";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BellRing, CheckCheck, Info, Heart, Megaphone, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Central de notificações — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Alertas ativas in-app para terapeutas e familiares sobre devolutivas, avisos e discussões clínicas.",
      },
    ],
  }),
  component: NotificationsPage,
});

const typeMeta = {
  devolutiva: { icon: Heart, tone: "bg-purple-100 text-purple-700" },
  announcement: { icon: Megaphone, tone: "bg-amber-100 text-amber-700" },
  forum: { icon: MessageSquare, tone: "bg-blue-100 text-blue-700" },
  info: { icon: Info, tone: "bg-slate-100 text-slate-700" },
} as const;

function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems]     = useState<NotificationItem[]>([]);

  const loadNotifications = () => {
    setLoading(true);
    getNotifications()
      .then((res) => {
        if (res && res.length > 0) {
          setItems(res);
        } else {
          // Fallback demonstrativo se não houver notificações gravadas
          setItems([
            {
              id: "n1",
              user_id: "u1",
              title: "Nova Devolutiva de Sessão 💜",
              message: "Terapeuta Carla Mendes publicou o resumo afetuoso da sessão de hoje.",
              type: "devolutiva",
              is_read: 0,
              created_at: new Date().toISOString(),
            },
            {
              id: "n2",
              user_id: "u1",
              title: "Aviso da Supervisão Geral 📣",
              message: "Lembrete: Reunião clínica de alinhamento quinzenal na próxima sexta-feira.",
              type: "announcement",
              is_read: 0,
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
          ]);
        }
      })
      .catch((err) => {
        toast.error("Erro ao carregar notificações", {
          description: err instanceof Error ? err.message : "Erro",
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead({ data: { notificationId: id } });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: 1 } : item)));
      toast.success("Notificação marcada como lida");
    } catch {
      // Fallback otimista se offline
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: 1 } : item)));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setItems((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
      toast.success("Todas as notificações foram marcadas como lidas");
    } catch {
      setItems((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
    }
  };

  const unreadCount = items.filter((i) => i.is_read === 0).length;

  return (
    <AppLayout>
      <PageHeader
        title="Central de Notificações In-App"
        subtitle={unreadCount > 0 ? `${unreadCount} alerta(s) não lido(s).` : "Nenhum alerta pendente."}
        action={
          unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCheck className="size-4 mr-1.5" /> Marcar todas como lidas
            </Button>
          )
        }
      />

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="size-7 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Buscando alertas do sistema...</p>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          <BellRing className="size-8 mx-auto mb-2 text-muted-foreground/60" />
          Nenhuma notificação registrada no momento.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const meta = typeMeta[n.type as keyof typeof typeMeta] ?? typeMeta.info;
            const Icon = meta.icon;
            const isUnread = n.is_read === 0;

            return (
              <Card key={n.id} className={cn(isUnread && "border-primary/40 bg-primary-soft/20 shadow-xs")}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={cn("size-9 rounded-full grid place-items-center shrink-0", meta.tone)}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      {isUnread && <Badge className="text-[10px] bg-primary text-primary-foreground border-0">Nova</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {n.created_at.slice(0, 16).replace("T", " ")}
                    </p>
                  </div>
                  {isUnread && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => handleMarkAsRead(n.id)}
                    >
                      Marcar como lida
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-6">
        <BellRing className="size-3.5 text-primary" />
        Alertas ativas em tempo real eliminam a necessidade de grupos externos não seguros.
      </p>
    </AppLayout>
  );
}
