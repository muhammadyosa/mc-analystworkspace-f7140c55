import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { DndContext, PointerSensor, useSensor, useSensors, closestCorners, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useDataStore, type ActionStatus, type ActionItem } from "@/lib/store";
import { useDroppable, useDraggable } from "@dnd-kit/core";

export const Route = createFileRoute("/action-plan")({
  head: () => ({ meta: [{ title: "Action Plan — MCA Workspace" }] }),
  component: ActionPlanPage,
});

const COLUMNS: { key: ActionStatus; label: string; color: string }[] = [
  { key: "belum", label: "Belum", color: "bg-muted-foreground/70" },
  { key: "onprogress", label: "On Progress", color: "bg-warning" },
  { key: "done", label: "Done", color: "bg-success" },
];

function DraggableCard({ item, onDelete }: { item: ActionItem; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass-card group rounded-xl border-0 p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-1 cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">{item.cluster}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{item.program}</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>PIC: {item.pic}</span>
            <span>{item.deadline}</span>
          </div>
        </div>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100">
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </div>
    </div>
  );
}

function Column({ status, label, color, items, onDelete }: { status: ActionStatus; label: string; color: string; items: ActionItem[]; onDelete: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[300px] flex-col gap-2 rounded-2xl border border-border/60 bg-muted/30 p-3 transition ${
        isOver ? "border-primary/60 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-sm font-semibold">{label}</span>
        <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((i) => (
          <DraggableCard key={i.id} item={i} onDelete={() => onDelete(i.id)} />
        ))}
        {!items.length && <p className="px-1 py-6 text-center text-xs text-muted-foreground">Kosong</p>}
      </div>
    </div>
  );
}

function ActionPlanPage() {
  const { actions, addAction, updateActionStatus, deleteAction } = useDataStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ cluster: "", program: "", pic: "", deadline: "" });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const overId = e.over?.id as ActionStatus | undefined;
    if (!overId) return;
    const id = e.active.id as string;
    updateActionStatus(id, overId);
  };

  const submit = () => {
    if (!form.cluster || !form.program) return toast.error("Cluster & Program wajib diisi");
    addAction({
      id: crypto.randomUUID(),
      status: "belum",
      createdAt: Date.now(),
      ...form,
    });
    setForm({ cluster: "", program: "", pic: "", deadline: "" });
    setOpen(false);
    toast.success("Action ditambahkan");
  };

  return (
    <>
      <AppHeader title="Action Plan" subtitle="Kanban board dengan drag & drop" />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{actions.length} action total</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Tambah Action</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Action baru</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Cluster</Label><Input value={form.cluster} onChange={(e) => setForm({ ...form, cluster: e.target.value })} /></div>
                <div><Label>Program</Label><Input value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} /></div>
                <div><Label>PIC</Label><Input value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} /></div>
                <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={submit}>Simpan</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          <div className="grid gap-4 md:grid-cols-3">
            {COLUMNS.map((c) => (
              <Column
                key={c.key}
                status={c.key}
                label={c.label}
                color={c.color}
                items={actions.filter((a) => a.status === c.key)}
                onDelete={deleteAction}
              />
            ))}
          </div>
        </DndContext>

        {!actions.length && (
          <Card className="glass-card border-0">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Belum ada action. Klik "Tambah Action" untuk memulai.
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
