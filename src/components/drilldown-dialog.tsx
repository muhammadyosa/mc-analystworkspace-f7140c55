import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export type DrilldownColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: (v: unknown, row: Record<string, unknown>) => React.ReactNode;
};

export type DrilldownState = {
  title: string;
  description?: string;
  columns: DrilldownColumn[];
  rows: Record<string, unknown>[];
} | null;

export function DrilldownDialog({
  state,
  onClose,
}: {
  state: DrilldownState;
  onClose: () => void;
}) {
  const open = state !== null;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] p-4 sm:max-w-2xl sm:p-6 lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-display flex flex-wrap items-center gap-2 text-base sm:text-lg">
            <span className="min-w-0 truncate">{state?.title}</span>
            {state && (
              <Badge variant="secondary" className="shrink-0">
                {state.rows.length} data
              </Badge>
            )}
          </DialogTitle>
          {state?.description && <DialogDescription>{state.description}</DialogDescription>}
        </DialogHeader>
        {state && (
          <ScrollArea className="max-h-[65vh] pr-2">
            {state.rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Tidak ada data.</div>
            ) : (
              <div className="scroll-x">
                <table className="w-full min-w-[520px] text-xs">
                  <thead className="sticky top-0 bg-background/95 backdrop-blur">
                    <tr className="border-b border-border/60">
                      {state.columns.map((c) => (
                        <th
                          key={c.key}
                          className={`p-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${
                            c.align === "right"
                              ? "text-right"
                              : c.align === "center"
                                ? "text-center"
                                : "text-left"
                          }`}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                        {state.columns.map((c) => {
                          const v = row[c.key];
                          return (
                            <td
                              key={c.key}
                              className={`p-2 ${
                                c.align === "right"
                                  ? "text-right tabular-nums"
                                  : c.align === "center"
                                    ? "text-center"
                                    : "text-left"
                              }`}
                            >
                              {c.format ? c.format(v, row) : ((v as React.ReactNode) ?? "—")}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
