import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { parentFeed, announcements } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, Heart, Smile, ThumbsUp } from "lucide-react";

export const Route = createFileRoute("/parent")({
  component: ParentFeed,
});

const moodIcon = { ótimo: Smile, bom: ThumbsUp, neutro: Heart } as const;

function ParentFeed() {
  return (
    <AppLayout>
      <PageHeader
        title="Olá, Mariana 💜"
        subtitle="Acompanhe o dia do Lucas e os recados da clínica."
      />

      {/* Avisos */}
      <section id="avisos" className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Quadro de avisos</h2>
        </div>
        <div className="space-y-2">
          {announcements.map((a) => (
            <Card key={a.id} className="border-primary/30 bg-primary-soft/40">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{a.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{a.body}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {a.date}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Feed */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Heart className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Devolutivas</h2>
        </div>
        <div className="space-y-3">
          {parentFeed.map((post) => {
            const Icon = moodIcon[post.mood as keyof typeof moodIcon] ?? Heart;
            return (
              <Card key={post.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="size-10 bg-primary-soft">
                      <AvatarFallback className="bg-primary-soft text-primary text-xs font-semibold">
                        {post.therapist.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{post.therapist}</p>
                      <p className="text-xs text-muted-foreground">{post.date}</p>
                    </div>
                    <div className="size-8 rounded-full bg-success/15 text-success grid place-items-center">
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-base mb-1">{post.title}</h3>
                  <p className="text-sm text-foreground/85 leading-relaxed">{post.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </AppLayout>
  );
}
