import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Deteksi apakah aplikasi bisa dipasang (PWA install prompt). */
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setPrompt(null);
  };

  return { canInstall: !!prompt, install };
}

/** Tombol pasang aplikasi ke layar utama; hanya tampil bila perangkat mendukung. */
export function InstallApp({ className }: { className?: string }) {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("h-9 gap-1.5 rounded-full text-xs", className)}
      onClick={install}
    >
      <Download className="h-3.5 w-3.5" /> Pasang App
    </Button>
  );
}
