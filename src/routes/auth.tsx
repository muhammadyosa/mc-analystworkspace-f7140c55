import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import authBg from "@/assets/auth-bg.jpg";
import danantaraLight from "@/assets/danantara-light.png.asset.json";
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
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.65 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.9s2.63-5.9 5.85-5.9c1.83 0 3.06.78 3.76 1.44l2.56-2.47C16.7 4.15 14.54 3.2 12 3.2 6.98 3.2 2.9 7.28 2.9 12.3s4.08 9.1 9.1 9.1c5.26 0 8.75-3.7 8.75-8.9 0-.6-.07-1.05-.14-1.4z"/>
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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a1834] text-white">
      <img
        src={authBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-70"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1834]/70 via-[#0a1834]/50 to-[#0a1834]/90" />

      {/* Top logos */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3 rounded-lg bg-white/95 px-3 py-1.5 shadow-lg">
          <img src={danantaraLight.url} alt="Danantara Indonesia" className="h-6 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-white/95 px-3 py-1.5 shadow-lg">
          <img src={plnLogo.url} alt="PLN Icon Plus" className="h-7 w-auto object-contain" />
        </div>
      </div>

      {/* Center card */}
      <div className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <img src={iconnetLogo.url} alt="Iconnet" className="mb-4 h-14 w-14 object-contain" />
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              MCA <span className="text-cyan-400">WORKSPACE</span>
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Market & Consumer Analyst — Cluster Intelligence Platform
            </p>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading || checking}
            className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:from-[#3b82f6] hover:to-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span>{loading ? "Menghubungkan..." : "Masuk dengan Google"}</span>
          </button>

          <p className="mt-6 text-center text-xs leading-relaxed text-white/50">
            Dengan masuk, Anda menyetujui penggunaan data profil Google Anda untuk otentikasi.
            Sistem ini terbatas untuk internal PLN Icon Plus & Danantara.
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-10 text-center text-[11px] text-white/40">
        © {new Date().getFullYear()} PLN Icon Plus • Danantara Indonesia
      </div>
    </div>
  );
}
