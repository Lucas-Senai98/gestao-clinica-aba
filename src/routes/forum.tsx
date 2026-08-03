import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { forumThreads } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forum")({
  head: () => ({
    meta: [
      { title: "Fórum Clínico Interno — Gestão Clínica ABA" },
      { name: "description", content: "Discussão de casos clínicos e reuniões semanais da equipe em threads internas seguras." },
      { property: "og:title", content: "Fórum Clínico Interno — Gestão Clínica ABA" },
      { property: "og:description", content: "Threads internas para discussão de casos e reuniões da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Forum,
});

type Reply = { id: string; author: string; avatar: string; text: string; when: string };

const initialReplies: Record<string, Reply[]> = {
  th1: [
    { id: "r1", author: "Supervisão", avatar: "SV", text: "Já tentou reduzir o tempo da demanda para 1 min e ir escalonando?", when: "1h" },
    { id: "r2", author: "Carla Mendes", avatar: "CM", text: "Aqui funcionou bem usar PECS para ele pedir pausa.", when: "45m" },
  ],
  th2: [{ id: "r3", author: "Diego Ramos", avatar: "DR", text: "Recebido. Revisando hoje à tarde.", when: "Ontem" }],
  th3: [],
};

function Forum() {
  const [active, setActive] = useState(forumThreads[0].id);
  const [replies, setReplies] = useState(initialReplies);
  const [draft, setDraft] = useState("");

  const thread = forumThreads.find((t) => t.id === active)!;
  const list = replies[active] ?? [];

  const send = () => {
    if (!draft.trim()) return;
    setReplies((r) => ({
      ...r,
      [active]: [
        ...(r[active] ?? []),
        { id: crypto.randomUUID(), author: "Você", avatar: "VC", text: draft, when: "agora" },
      ],
    }));
    setDraft("");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Fórum clínico"
        subtitle="Discussão de casos e reuniões da equipe."
        action={
          <Button size="sm">
            <Plus className="size-4" /> Novo tópico
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        {/* Threads list */}
        <Card className="lg:max-h-[70vh] overflow-hidden flex flex-col">
          <CardContent className="p-3">
            <Input placeholder="Buscar tópico..." className="mb-2" />
            <div className="space-y-1">
              {forumThreads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={cn(
                    "w-full text-left rounded-lg p-3 transition-colors",
                    active === t.id ? "bg-primary-soft" : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="size-8 bg-primary-soft">
                      <AvatarFallback className="text-[10px] bg-primary-soft text-primary font-semibold">
                        {t.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight truncate">{t.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t.author} · {t.when} · {t.replies} respostas
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Thread view */}
        <Card className="flex flex-col">
          <CardContent className="p-5 flex-1 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold">{thread.title}</h2>
              <p className="text-xs text-muted-foreground">
                Iniciado por {thread.author} · {thread.when}
              </p>
              <p className="mt-3 text-sm text-foreground/85">{thread.preview}</p>
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MessageSquare className="size-3.5" /> Respostas
              </p>
              {list.length === 0 && (
                <p className="text-sm text-muted-foreground">Seja o primeiro a responder.</p>
              )}
              {list.map((r) => (
                <div key={r.id} className="flex gap-3">
                  <Avatar className="size-8 bg-primary-soft shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary-soft text-primary font-semibold">
                      {r.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 rounded-xl bg-muted/60 p-3">
                    <p className="text-xs font-medium">
                      {r.author} <span className="text-muted-foreground font-normal">· {r.when}</span>
                    </p>
                    <p className="text-sm mt-1">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto flex gap-2 items-end">
              <Textarea
                placeholder="Escreva sua resposta..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <Button onClick={send} size="icon" className="size-10 shrink-0">
                <Send className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
