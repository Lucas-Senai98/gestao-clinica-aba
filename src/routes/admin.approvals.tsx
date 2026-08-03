import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { pendingApprovals } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Inbox } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/approvals")({
  head: () => ({
    meta: [
      { title: "Aprovações pendentes — Supervisão | Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Fila de aprovações da supervisão: folhas de sessão, alterações de PEI, remarcações, horas extras e novos cadastros.",
      },
      { property: "og:title", content: "Aprovações pendentes — Supervisão" },
      { property: "og:description", content: "Aprove ou devolva solicitações da equipe clínica em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApprovalsPage,
});

const prioTone: Record<string, string> = {
  Alta: "bg-destructive/15 text-destructive border-0",
  Média: "bg-warning/20 text-warning-foreground border-0",
  Baixa: "bg-muted text-muted-foreground border-0",
};

function ApprovalsPage() {
  const [items, setItems] = useState(pendingApprovals);

  const resolve = (id: string, approved: boolean) => {
    const item = items.find((i) => i.id === id);
    setItems((list) => list.filter((i) => i.id !== id));
    if (!item) return;
    approved
      ? toast.success("Solicitação aprovada", { description: `${item.type} — ${item.detail}` })
      : toast("Solicitação devolvida", { description: `${item.type} — ${item.detail}` });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Aprovações pendentes"
        subtitle={`${items.length} solicitação(ões) aguardando a supervisão.`}
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Inbox className="size-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Tudo em dia!</p>
            <p className="text-xs text-muted-foreground mt-1">Nenhuma solicitação pendente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{a.type}</p>
                    <Badge className={cn("text-[10px]", prioTone[a.priority])}>{a.priority}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{a.detail}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {a.requester} • {a.when}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="icon" variant="outline" aria-label="Devolver" onClick={() => resolve(a.id, false)}>
                    <X className="size-4" />
                  </Button>
                  <Button size="icon" aria-label="Aprovar" onClick={() => resolve(a.id, true)}>
                    <Check className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
