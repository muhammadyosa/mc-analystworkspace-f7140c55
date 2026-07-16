import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import indonesiaMap from "@/assets/indonesia-map.png.asset.json";
import danantaraLight from "@/assets/danantara-dark.svg.asset.json";
import plnLogo from "@/assets/pln-iconplus.png.asset.json";
import iconnetLogo from "@/assets/iconnet-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — MCA Workspace" },
      { name: "description", content: "Masuk ke Market & Consumer Analyst Workspace dengan akun Google." },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Gagal masuk dengan Google");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Terjadi kesalahan");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050b1f] text-white">
      {/* Ambient gradient layers */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.22),transparent_60%)]" />
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 h-[28rem] w-[28rem] rounded-full bg-blue-600/15 blur-3xl" />

      {/* Indonesia map watermark */}
      <img
        src={indonesiaMap.url}
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 w-[130%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.10] mix-blend-screen select-none [filter:brightness(1.6)_saturate(1.3)]"
      />
      {/* Faint grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />

      {/* Top bar with logos (transparent, no white cards) */}
      <div className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
        <img
          src={danantaraLight.url}
          alt="Danantara Indonesia"
          className="h-8 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] sm:h-9"
        />
        <img
          src={plnLogo.url}
          alt="PLN Icon Plus"
          className="h-9 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] sm:h-10"
        />
      </div>

      {/* Main split layout */}
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-120px)] max-w-6xl grid-cols-1 items-center gap-10 px-6 pb-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-12">
        {/* Left: brand */}
        <div className="hidden flex-col lg:flex">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            Cluster Intelligence Platform
          </div>
          <h1 className="mt-6 font-display text-6xl font-bold leading-[1.05] tracking-tight xl:text-7xl">
            MCA
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
              Workspace
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/60">
            Market &amp; Consumer Analyst — pusat kendali cluster, ticket, dan strategi
            akuisisi Iconnet di seluruh Indonesia.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
            {[
              { k: "34", v: "Provinsi" },
              { k: "500+", v: "Cluster" },
              { k: "AI", v: "Insight Engine" },
            ].map((s) => (
              <div key={s.v} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <div className="font-display text-2xl font-bold text-white">{s.k}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-white/50">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: login card */}
        <div className="mx-auto w-full max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:p-10">
            {/* Card gradient accent */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 ring-1 ring-white/15 backdrop-blur-md">
                <img src={iconnetLogo.url} alt="Iconnet" className="h-11 w-11 object-contain" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">Selamat Datang</h2>
              <p className="mt-1.5 text-sm text-white/60">Masuk untuk melanjutkan ke workspace</p>
            </div>

            <button
              onClick={handleGoogle}
              disabled={loading || checking}
              className="group relative mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-[15px] font-semibold text-slate-900 shadow-lg shadow-blue-950/30 ring-1 ring-black/5 transition hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              ) : (
                <GoogleIcon />
              )}
              <span>{loading ? "Menghubungkan…" : "Masuk dengan Google"}</span>
            </button>

            <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[11px] text-white/60">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
              Otentikasi aman melalui Google OAuth. Data profil tidak dibagikan ke pihak ketiga.
            </div>

            <p className="mt-6 text-center text-[11px] leading-relaxed text-white/40">
              Akses terbatas untuk internal <span className="text-white/60">PLN Icon Plus</span> &amp; <span className="text-white/60">Danantara Indonesia</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-10 text-center text-[11px] text-white/40">
        © {new Date().getFullYear()} MCA Workspace • PLN Icon Plus × Danantara Indonesia
      </div>
    </div>
  );
}
