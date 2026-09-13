import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { useCloudData } from "@/hooks/use-cloud-data";
import { usePrefsStore } from "@/lib/prefs";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Halaman tidak ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          URL yang Anda tuju tidak tersedia.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Halaman gagal dimuat</h1>
        <p className="mt-2 text-sm text-muted-foreground">Terjadi kesalahan. Coba muat ulang.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Coba lagi
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#0b1220" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "MCA" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "MCA Workspace" },
      { title: "MCA Workspace" },
      {
        name: "description",
        content:
          "Dashboard executive: HC, ticket, growth, dan prioritas cluster.",
      },
      { name: "author", content: "MCA Workspace" },
      { property: "og:title", content: "MCA Workspace" },
      {
        property: "og:description",
        content:
          "Dashboard executive: HC, ticket, growth, dan prioritas cluster.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MCA Workspace" },
      { name: "twitter:description", content: "Dashboard executive: HC, ticket, growth, dan prioritas cluster." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/661191a1-5dd1-4314-83c1-287baf66b1a1" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/661191a1-5dd1-4314-83c1-287baf66b1a1" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
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

/** Terapkan Saved View default satu kali saat aplikasi dibuka. */
function useDefaultView() {
  useEffect(() => {
    const { defaultViewId, applyView } = usePrefsStore.getState();
    if (defaultViewId) applyView(defaultViewId);
  }, []);
}

function AuthGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "in" | "pending" | "out">("loading");

  async function resolve(session: unknown) {
    if (!session) {
      setStatus("out");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setStatus("out");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("approved")
      .eq("id", u.user.id)
      .maybeSingle();
    setStatus(profile?.approved ? "in" : "pending");
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      resolve(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION"
      ) {
        resolve(session);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if ((status === "out" || status === "pending") && pathname !== "/auth") {
      navigate({ to: "/auth", replace: true });
    }
    if (status === "in" && pathname === "/auth") {
      navigate({ to: "/", replace: true });
    }
  }, [status, pathname, navigate]);

  if (pathname === "/auth") return <>{children}</>;

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status !== "in") return null;

  return <AuthedShell>{children}</AuthedShell>;
}

/** Terapkan preferensi "kurangi animasi" ke seluruh aplikasi. */
function useReduceMotion() {
  const reduceMotion = usePrefsStore((s) => s.reduceMotion);
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", !!reduceMotion);
  }, [reduceMotion]);
}

function AuthedShell({ children }: { children: ReactNode }) {
  usePresenceHeartbeat();
  useCloudData();
  useDefaultView();
  useReduceMotion();
  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <a href="#main-content" className="skip-link">
        Lompat ke konten utama
      </a>
      <AppSidebar />
      <SidebarInset
        id="main-content"
        role="main"
        aria-label="Konten utama"
        className="app-scroll min-h-0 min-w-0 overflow-x-hidden overflow-y-auto"
        tabIndex={0}
      >
        {children}
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  );
}

/**
 * Saat aplikasi diperbarui (deploy baru), berkas lama tidak lagi tersedia.
 * Muat ulang sekali secara otomatis agar pengguna selalu memakai versi terbaru.
 */
function useAutoUpdate() {
  useEffect(() => {
    const KEY = "mca:auto-reloaded-at";
    const reloadOnce = () => {
      const last = Number(sessionStorage.getItem(KEY) ?? 0);
      if (Date.now() - last < 30_000) return;
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    };
    const onPreloadError = (e: Event) => {
      e.preventDefault();
      reloadOnce();
    };
    const onError = (e: ErrorEvent) => {
      const msg = String(e?.message ?? "");
      if (/dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg)) {
        reloadOnce();
      }
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("vite:preloadError", onPreloadError);
      window.removeEventListener("error", onError);
    };
  }, []);
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useAutoUpdate();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <Outlet />
      </AuthGate>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
