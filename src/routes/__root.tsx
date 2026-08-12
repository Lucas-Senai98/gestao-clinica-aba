import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { getSessionUser } from "@/queries/auth";
import { Toaster } from "@/components/ui/sonner";
import type { RouterContext } from "@/router";

import appCss from "../styles.css?url";

// ── Componentes de erro e 404 ─────────────────────────────────────────────────

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro interno. Tente novamente ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir ao início
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Rota raiz ─────────────────────────────────────────────────────────────────

export const Route = createRootRouteWithContext<RouterContext>()(({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Gestão Clínica ABA — GiZé's" },
      {
        name: "description",
        content:
          "Plataforma de gestão de terapias integradas e ABA — coleta de dados, prontuário eletrônico e portal dos pais.",
      },
      { name: "author", content: "GiZé's Clínica" },
      { property: "og:title", content: "Gestão Clínica ABA" },
      {
        property: "og:description",
        content:
          "Plataforma de gestão de terapias integradas e ABA — coleta de dados, prontuário eletrônico e portal dos pais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Gestão Clínica ABA" },
      {
        name: "twitter:description",
        content:
          "Plataforma de gestão de terapias integradas e ABA — coleta de dados, prontuário eletrônico e portal dos pais.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),

  /**
   * beforeLoad: executa em TODA navegação.
   * Busca o usuário da sessão ativa e o injeta no contexto do router.
   * Rotas protegidas verificam `context.user` em seus próprios beforeLoad.
   */
  beforeLoad: async () => {
    const user = await getSessionUser();
    return { user };
  },

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
} as Parameters<typeof createRootRouteWithContext<RouterContext>>[0]));

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient, user } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider user={user}>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
