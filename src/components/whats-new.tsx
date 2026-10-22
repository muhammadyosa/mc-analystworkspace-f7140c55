import { useEffect, useMemo, useState } from "react";
import { Sparkles, Rocket, LayoutGrid, Wrench, Wand2, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  APP_VERSION,
  CHANGELOG,
  hasUnseenUpdate,
  markSeen,
  type ChangeKind,
} from "@/lib/changelog";
import { cn } from "@/lib/utils";

const kindMeta: Record<ChangeKind, { label: string; icon: typeof Rocket; className: string }> = {
  fitur: { label: "Fitur", icon: Rocket, className: "bg-primary/12 text-primary" },
  menu: { label: "Menu", icon: LayoutGrid, className: "bg-info/12 text-info" },
  fungsi: { label: "Fungsi", icon: Settings2, className: "bg-success/12 text-success" },
  perbaikan: { label: "Perbaikan", icon: Wrench, className: "bg-warning/15 text-warning" },
  tampilan: { label: "Tampilan", icon: Wand2, className: "bg-accent/15 text-accent-foreground" },
};

export function WhatsNew() {
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(false);

  useEffect(() => {
    if (hasUnseenUpdate()) {
      setUnseen(true);
      const t = window.setTimeout(() => setOpen(true), 900);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, []);

  function close(next: boolean) {
    setOpen(next);
    if (!next) {
      markSeen();
      setUnseen(false);
    }
  }

  const entries = useMemo(() => CHANGELOG.slice(0, 6), []);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Apa yang baru"
        className="relative h-9 gap-1.5 px-2 text-xs font-medium sm:px-2.5"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="hidden lg:inline">Apa yang Baru</span>
        {unseen && (
          <span className="absolute right-1 top-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-hidden p-0 sm:w-full">
          <DialogHeader className="space-y-1 border-b border-border/60 p-4 text-left sm:p-5">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              Apa yang Baru
              <Badge variant="secondary" className="text-[10px]">
                v{APP_VERSION}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Ringkasan fitur, menu, dan fungsi terbaru pada MCA Workspace.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[58vh]">
            <div className="space-y-5 p-4 sm:p-5">
              {entries.map((entry, i) => (
                <section key={entry.version} className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        "text-[10px]",
                        i === 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      v{entry.version}
                    </Badge>
                    <span className="text-sm font-semibold leading-tight">{entry.title}</span>
                    <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                  </div>
                  <ul className="space-y-2">
                    {entry.items.map((item, idx) => {
                      const meta = kindMeta[item.kind];
                      const Icon = meta.icon;
                      return (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md",
                              meta.className,
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
                            <span className="font-medium text-foreground">{meta.label}: </span>
                            {item.text}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t border-border/60 p-3 sm:p-4">
            <Button className="w-full" onClick={() => close(false)}>
              Mengerti
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
