import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { navigationMemory } from "./lib/navigation-state";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Data tetap segar lewat invalidasi & sinkron realtime; hindari refetch berulang
        // saat berpindah tab atau fokus jendela.
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    getScrollRestorationKey: (location) => location.pathname,
    scrollToTopSelectors: ["#main-content"],
    defaultPreload: "intent",
    defaultPreloadDelay: 120,
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 350,
    defaultPendingMinMs: 150,
  });

  router.subscribe("onBeforeNavigate", ({ fromLocation }) => {
    if (fromLocation) {
      navigationMemory(queryClient).save(fromLocation.pathname, fromLocation.search);
    }
  });

  return router;
};
