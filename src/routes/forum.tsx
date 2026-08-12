import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { requireAuth } from "@/lib/route-guard";
import { useCurrentUser } from "@/lib/auth-context";
import { AppLayout, PageHeader } from "@/components/app-layout";
import {
  getForumThreads,
  createForumThread,
  getThreadReplies,
  sendThreadReply,
} from "@/queries/communication";
import { forumThreads as mockThreads } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Plus, Pin, UserCheck, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forum")({
  beforeLoad: requireAuth(),
  head: () => ({
    meta: [
      { title: "Fórum Clínico Interno — Gestão Clínica ABA" },
      {
        name: "description",
        content:
          "Discussão de casos clínicos e reuniões semanais da equipe em threads internas seguras.",
      },
    ],
  }),
  component: ForumPage,
});

type ThreadItem = {
  id: string;
  title: string;
  preview: string | null;
  is_pinned: number;
  created_at: string;
  patient_id: string | null;
  patient_name: string | null;
  author_name: string;
  author_avatar: string;
  replies_count: number;
};

type ReplyItem = {
  id: string;
  thread_id: string;
  text: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  author_role: string;
};

function ForumPage() {
  const currentUser = useCurrentUser();

  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threads, setThreads]               = useState<ThreadItem[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replies, setReplies]               = useState<ReplyItem[]>([]);
  const [draftMessage, setDraftMessage]     = useState("");
  const [sendingReply, setSendingReply]     = useState(false);

  // Modal/Form de Novo Tópico
  const [showNewThreadForm, setShowNewThreadForm] = useState(false);
  const [newTitle, setNewTitle]                   = useState("");
  const [newPreview, setNewPreview]               = useState("");
  const [creatingThread, setCreatingThread]       = useState(false);

  // Carrega lista de tópicos
  const loadThreads = () => {
    setLoadingThreads(true);
    getForumThreads({ data: {} })
      .then((res) => {
        if (res && res.length > 0) {
          setThreads(res);
          if (!activeThreadId) setActiveThreadId(res[0].id);
        } else {
          // Fallback para mock se o banco D1 não tiver tópicos criados ainda
          const fallbackThreads: ThreadItem[] = mockThreads.map((m) => ({
            id: m.id,
            title: m.title,
            preview: m.preview,
            is_pinned: m.pinned ? 1 : 0,
            created_at: m.lastActivity,
            patient_id: m.patientId || null,
            patient_name: m.patientName || null,
            author_name: m.author,
            author_avatar: m.author.slice(0, 2).toUpperCase(),
            replies_count: m.repliesCount,
          }));
          setThreads(fallbackThreads);
          if (!activeThreadId) setActiveThreadId(fallbackThreads[0].id);
        }
      })
      .catch(() => {
        const fallbackThreads: ThreadItem[] = mockThreads.map((m) => ({
          id: m.id,
          title: m.title,
          preview: m.preview,
          is_pinned: m.pinned ? 1 : 0,
          created_at: m.lastActivity,
          patient_id: m.patientId || null,
          patient_name: m.patientName || null,
          author_name: m.author,
          author_avatar: m.author.slice(0, 2).toUpperCase(),
          replies_count: m.repliesCount,
        }));
        setThreads(fallbackThreads);
        if (!activeThreadId) setActiveThreadId(fallbackThreads[0].id);
      })
      .finally(() => setLoadingThreads(false));
  };

  useEffect(() => {
    loadThreads();
  }, []);

  // Carrega respostas do tópico ativo
  useEffect(() => {
    if (!activeThreadId) return;

    setLoadingReplies(true);
    getThreadReplies({ data: { threadId: activeThreadId } })
      .then((res) => {
        setReplies(res);
      })
      .catch(() => {
        setReplies([]);
      })
      .finally(() => setLoadingReplies(false));
  }, [activeThreadId]);

  // Criação de novo tópico
  const handleCreateThread = async () => {
    if (!newTitle.trim()) {
      toast.error("Informe o título do tópico.");
      return;
    }

    setCreatingThread(true);
    try {
      const res = await createForumThread({
        data: {
          title: newTitle.trim(),
          preview: newPreview.trim() || undefined,
        },
      });

      toast.success("Tópico de discussão criado! 💬");
      setNewTitle("");
      setNewPreview("");
      setShowNewThreadForm(false);
      loadThreads();
      setActiveThreadId(res.id);
    } catch (err) {
      toast.error("Erro ao criar tópico", {
        description: err instanceof Error ? err.message : "Erro",
      });
    } finally {
      setCreatingThread(false);
    }
  };

  // Envio de resposta no chat do tópico
  const handleSendReply = async () => {
    if (!draftMessage.trim() || !activeThreadId) return;

    setSendingReply(true);
    try {
      await sendThreadReply({
        data: {
          threadId: activeThreadId,
          text: draftMessage.trim(),
        },
      });

      setDraftMessage("");
      // Recarrega respostas
      const updated = await getThreadReplies({ data: { threadId: activeThreadId } });
      setReplies(updated);

      toast.success("Mensagem enviada no fórum.");
    } catch (err) {
      toast.error("Erro ao enviar mensagem", {
        description: err instanceof Error ? err.message : "Erro",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const activeThread = threads.find((t) => t.id === activeThreadId);

  return (
    <AppLayout>
      <PageHeader
        title="Fórum Clínico Interno"
        subtitle="Discussão multiprofissional de casos e suporte a supervisões."
        action={
          <Button onClick={() => setShowNewThreadForm((v) => !v)} size="sm">
            <Plus className="size-4" /> Novo Tópico
          </Button>
        }
      />

      {/* Formulário de criação de tópico */}
      {showNewThreadForm && (
        <Card className="mb-6 border-primary/30 bg-primary-soft/20 shadow-md">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              Criar Novo Tópico de Discussão
            </h3>

            <div>
              <Label className="text-xs mb-1 block">Título do Tópico *</Label>
              <Input
                placeholder="Ex: Estratégias de autorregulação no ambiente escolar"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs mb-1 block">Descrição / Pergunta Inicial</Label>
              <Textarea
                placeholder="Descreva a dúvida clínica ou contexto do caso..."
                rows={2}
                value={newPreview}
                onChange={(e) => setNewPreview(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowNewThreadForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateThread} disabled={creatingThread} size="sm">
                {creatingThread ? <Loader2 className="size-4 animate-spin" /> : "Publicar Tópico"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingThreads ? (
        <Card className="p-8 text-center">
          <Loader2 className="size-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Carregando discussões do fórum...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* ── COLUNA ESQUERDA: LISTA DE TÓPICOS ─────────────────────────────── */}
          <div className="md:col-span-5 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Tópicos de Discussão ({threads.length})
            </h2>

            {threads.map((t) => {
              const isSelected = t.id === activeThreadId;

              return (
                <button
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl border transition-all select-none",
                    isSelected
                      ? "border-primary bg-primary-soft/50 shadow-xs"
                      : "border-border bg-card hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm line-clamp-1">{t.title}</h3>
                    {t.is_pinned === 1 && (
                      <Pin className="size-3.5 text-primary shrink-0 rotate-45" />
                    )}
                  </div>

                  {t.preview && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {t.preview}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <Avatar className="size-4">
                        <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                          {t.author_avatar || "US"}
                        </AvatarFallback>
                      </Avatar>
                      {t.author_name}
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      {t.patient_name && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                          {t.patient_name}
                        </Badge>
                      )}
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="size-3" />
                        {t.replies_count}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── COLUNA DIREITA: CONVERSA / THREAD SELECIONADA ─────────────────── */}
          <div className="md:col-span-7">
            {activeThread ? (
              <Card className="h-full flex flex-col border border-border">
                {/* Header do Tópico Ativo */}
                <div className="p-4 border-b border-border bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-base">{activeThread.title}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Iniciado por <span className="font-medium text-foreground">{activeThread.author_name}</span>
                        {activeThread.patient_name ? ` · Paciente: ${activeThread.patient_name}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      Clínico Privado
                    </Badge>
                  </div>
                  {activeThread.preview && (
                    <p className="text-xs text-foreground/80 mt-2 p-2 rounded bg-background border border-border/60">
                      {activeThread.preview}
                    </p>
                  )}
                </div>

                {/* Mensagens da Thread */}
                <CardContent className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[280px] max-h-[420px]">
                  {loadingReplies ? (
                    <div className="py-8 text-center">
                      <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mt-1">Carregando mensagens...</p>
                    </div>
                  ) : replies.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Nenhuma resposta registrada ainda neste tópico. Seja o primeiro a opinar!
                    </div>
                  ) : (
                    replies.map((r) => {
                      const isMe = currentUser?.id === r.author_id;

                      return (
                        <div
                          key={r.id}
                          className={cn(
                            "flex items-start gap-2.5 max-w-[85%]",
                            isMe ? "ml-auto flex-row-reverse" : "",
                          )}
                        >
                          <Avatar className="size-7 shrink-0">
                            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-semibold">
                              {r.author_avatar || "US"}
                            </AvatarFallback>
                          </Avatar>

                          <div
                            className={cn(
                              "rounded-2xl px-3.5 py-2 text-xs space-y-1 shadow-2xs",
                              isMe
                                ? "bg-primary text-primary-foreground rounded-tr-xs"
                                : "bg-muted text-foreground border border-border rounded-tl-xs",
                            )}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] opacity-80 font-medium">
                              <span>{r.author_name}</span>
                              <span>{r.created_at.slice(11, 16)}</span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-line">{r.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>

                {/* Input de Envio de Mensagem */}
                <div className="p-3 border-t border-border bg-card">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendReply();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Escreva sua observação clínica..."
                      value={draftMessage}
                      onChange={(e) => setDraftMessage(e.target.value)}
                      className="text-xs flex-1"
                    />
                    <Button type="submit" size="sm" disabled={sendingReply || !draftMessage.trim()}>
                      {sendingReply ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    </Button>
                  </form>
                </div>
              </Card>
            ) : (
              <Card className="h-full grid place-items-center p-8 text-center text-muted-foreground text-sm">
                Selecione um tópico ao lado para visualizar a discussão clínica.
              </Card>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
