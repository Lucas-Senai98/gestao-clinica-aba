import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import type { SessionUser } from "@/queries/auth";

// Tipo do contexto global do router — disponível em todos os beforeLoad
export interface RouterContext {
  queryClient: QueryClient;
  /** Usuário autenticado. null = não logado. Populado pela rota raiz. */
  user: SessionUser | null;
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: {
      queryClient,
      user: null, // seed inicial — beforeLoad da rota raiz irá preencher
    } satisfies RouterContext,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
