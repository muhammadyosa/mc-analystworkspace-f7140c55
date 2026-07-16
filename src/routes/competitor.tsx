import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataStore } from "@/lib/store";

export const Route = createFileRoute("/competitor")({
  head: () => ({ meta: [{ title: "Competitor — MCA Workspace" }] }),
  component: CompetitorPage,
});

function CompetitorPage() {
  const { competitors, addCompetitor, deleteCompetitor } = useDataStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nama: "", harga: 0, promo: "", coverage: "" });

  return (
    <>
      <AppHeader title="Competitor" subtitle="Struktur data kompetitor & visualisasi" />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{competitors.length} kompetitor tercatat</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Tambah Kompetitor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Kompetitor baru</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nama</Label><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
                <div><Label>Harga</Label><Input type="number" value={form.harga} onChange={(e) => setForm({ ...form, harga: +e.target.value })} /></div>
                <div><Label>Promo</Label><Input value={form.promo} onChange={(e) => setForm({ ...form, promo: e.target.value })} /></div>
                <div><Label>Coverage</Label><Input value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (!form.nama) return;
                    addCompetitor({ id: crypto.randomUUID(), ...form });
                    setForm({ nama: "", harga: 0, promo: "", coverage: "" });
                    setOpen(false);
                  }}
                >
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-card border-0">
            <CardHeader><CardTitle className="font-display text-base">Harga Kompetitor</CardTitle></CardHeader>
            <CardContent className="h-64">
              {competitors.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={competitors}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="nama" stroke="var(--color-muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                    <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <Bar dataKey="harga" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">Belum ada data</div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader><CardTitle className="font-display text-base">Persebaran Coverage</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {competitors.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                    <div className="font-semibold">{c.nama}</div>
                    <div className="text-muted-foreground">{c.coverage || "—"}</div>
                  </div>
                ))}
                {!competitors.length && <p className="text-sm text-muted-foreground">Belum ada data</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card border-0">
          <CardHeader><CardTitle className="font-display text-base">Daftar Kompetitor</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Promo</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nama}</TableCell>
                    <TableCell>Rp {c.harga.toLocaleString("id-ID")}</TableCell>
                    <TableCell>{c.promo || "—"}</TableCell>
                    <TableCell>{c.coverage || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteCompetitor(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
