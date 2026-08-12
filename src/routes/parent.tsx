import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { requireAuth, requireRole } from "@/lib/route-guard";
import { useCurrentUser } from "@/lib/auth-context";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { getParentFeed, getAnnouncements } from "@/queries/communication";
import { parentFeed as mockFeed, announcements as mockAnnouncements } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, Heart, Smile, ThumbsUp, Frown, Sparkles, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parent")({
  beforeLoad: requireRole("parent"),
  head: () => ({
    meta: [
      { title: "Portal dos Responsáveis — Gestão Clínica ABA" },
      {
        name: "description",
        content: "Devolutivas diárias das sessões, marcos alcançados e quadro de avisos da clínica para famílias.",
      },
    ],
  }),
  component: ParentPortalPage,
});

const moodConfig = {
  ótimo:  { icon: Smile,    color: "bg-emerald-100 text-emerald-700 border-emerald-300", label: "Ótimo dia" },
  bom:    { icon: ThumbsUp, color: "bg-blue-100 text-blue-700 border-blue-300",          label: "Bom dia" },
  neutro: { icon: Heart,    color: "bg-amber-100 text-amber-700 border-amber-300",       label: "Neutro" },
  difícil:{ icon: Frown,    color: "bg-rose-100 text-rose-700 border-rose-300",          label: "Dia desafiador" },
} as const;

function ParentPortalPage() {
  const currentUser = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [feedItems, setFeedItems] = useState<
    Array<{
      id: string;
      title: string;
      body: string;
      mood: string;
      home_practices?: string | null;
      published_at: string;
      patient_name: string;
      author_name: string;
    }>
  >([]);

  const [announcementItems, setAnnouncementItems] = useState<
    Array<{
      id: string;
      title: string;
      body: string;
      published_at: string;
      author_name: string;
    }>
  >([]);

  useEffect(() => {
    let unmounted = false;

    Promise.all([
      getParentFeed({ data: {} }),
      getAnnouncements(),
    ])
      .then(([feedRes, annRes]) => {
        if (unmounted) return;

        if (feedRes && feedRes.length > 0) {
          setFeedItems(feedRes);
        } else {
          // Fallback para mock se o banco local não tiver inserções de dev ainda
          setFeedItems(
            mockFeed.map((f) => ({
              id: f.id,
              title: f.title,
              body: f.body,
              mood: f.mood,
              home_practices: f.homePractices.join(" • "),
              published_at: f.date,
              patient_name: "Lucas Almeida",
              author_name: f.therapist,
            })),
          );
        }

        if (annRes && annRes.length > 0) {
          setAnnouncementItems(annRes);
        } else {
          setAnnouncementItems(
            mockAnnouncements.map((a) => ({
              id: a.id,
              title: a.title,
              body: a.body,
              published_at: a.date,
              author_name: "Coordenação GiZé's",
            })),
          );
        }
      })
      .catch(() => {
        if (!unmounted) {
          setFeedItems(
            mockFeed.map((f) => ({
              id: f.id,
              title: f.title,
              body: f.body,
              mood: f.mood,
              home_practices: f.homePractices.join(" • "),
              published_at: f.date,
              patient_name: "Lucas Almeida",
              author_name: f.therapist,
            })),
          );
          setAnnouncementItems(
            mockAnnouncements.map((a) => ({
              id: a.id,
              title: a.title,
              body: a.body,
              published_at: a.date,
              author_name: "Coordenação GiZé's",
            })),
          );
        }
      })
      .finally(() => {
        if (!unmounted) setLoading(false);
      });

    return () => {
      unmounted = true;
    };
  }, []);

  const firstName = currentUser?.name ? currentUser.name.split(" ")[0] : "Responsável";

  return (
    <AppLayout>
      <PageHeader
        title={`Olá, ${firstName} 💜`}
        subtitle="Acompanhe as devolutivas da sessão e comunicados da clínica."
      />

      {loading ? (
        <Card className="p-8 text-center">
          <Loader2 className="size-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Carregando portal da família...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ── MURAL DE AVISOS GERAIS (DA CLÍNICA PARA OS PAIS) ────────────────── */}
          <section id="avisos">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-6 rounded-md bg-primary/10 text-primary grid place-items-center">
                <Bell className="size-3.5" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Quadro de Avisos da Clínica</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {announcementItems.map((a) => (
                <Card
                  key={a.id}
                  className="border-primary/20 bg-gradient-to-br from-primary-soft/40 to-background shadow-xs"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{a.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {a.body}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px] bg-background">
                        {a.published_at.slice(0, 10)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* ── FEED DE DEVOLUTIVAS DIÁRIAS (DO TERAPEUTA PARA OS PAIS) ───────── */}
          <section id="devolutivas">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-primary text-primary-foreground grid place-items-center">
                  <Sparkles className="size-3.5" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  Devolutivas das Sessões ABA
                </h2>
              </div>
              <Badge variant="outline" className="text-xs">
                Exclusivo para a família
              </Badge>
            </div>

            <div className="space-y-4">
              {feedItems.map((item) => {
                const moodKey = (item.mood || "bom") as keyof typeof moodConfig;
                const moodInfo = moodConfig[moodKey] ?? moodConfig.bom;
                const MoodIconComponent = moodInfo.icon;

                return (
                  <Card
                    key={item.id}
                    className="border border-border/80 shadow-sm transition-all hover:border-primary/30"
                  >
                    <CardContent className="p-5 space-y-3">
                      {/* Cabeçalho da devolutiva */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/50">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-9 ring-2 ring-primary/20">
                            <AvatarFallback className="bg-primary-soft text-primary font-semibold text-xs">
                              {item.author_name ? item.author_name.slice(0, 2).toUpperCase() : "TR"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{item.author_name}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="size-3" />
                              {item.published_at.slice(0, 10)} · Paciente: {item.patient_name}
                            </p>
                          </div>
                        </div>

                        {/* Mood Badge */}
                        <Badge
                          variant="outline"
                          className={cn("flex items-center gap-1 text-xs px-2.5 py-0.5", moodInfo.color)}
                        >
                          <MoodIconComponent className="size-3.5" />
                          {moodInfo.label}
                        </Badge>
                      </div>

                      {/* Conteúdo principal sem jargão */}
                      <div>
                        <h3 className="font-semibold text-base text-foreground mb-1.5">{item.title}</h3>
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                          {item.body}
                        </p>
                      </div>

                      {/* Dicas para casa */}
                      {item.home_practices && (
                        <div className="mt-3 p-3 rounded-lg bg-primary-soft/30 border border-primary/10">
                          <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                            <Heart className="size-3.5" /> Sugestões para o ambiente de casa:
                          </p>
                          <p className="text-xs text-foreground/80 leading-relaxed">
                            {item.home_practices}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
