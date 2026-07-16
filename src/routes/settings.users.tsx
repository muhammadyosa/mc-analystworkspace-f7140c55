import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Shield, ShieldOff, CheckCircle2, XCircle, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/settings/users")({
  head: () => ({ meta: [{ title: "User Management — MCA Workspace" }] }),
  component: UserManagementPage,
});

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  approved: boolean;
  created_at: string;
  role: "admin" | "user";
};

function UserManagementPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: adminCheck } = await supabase.rpc("has_role", {
      _user_id: u.user.id,
      _role: "admin",
    });
    setIsAdmin(!!adminCheck);
    if (!adminCheck) {
      setRows([]);
      return;
    }
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, approved, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pErr || rErr) {
      toast.error(pErr?.message ?? rErr?.message ?? "Gagal memuat data");
      setRows([]);
      return;
    }
    const roleMap = new Map<string, "admin" | "user">();
    (roles ?? []).forEach((r) => {
      const cur = roleMap.get(r.user_id);
      if (r.role === "admin" || !cur) roleMap.set(r.user_id, r.role as "admin" | "user");
    });
    setRows(
      (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        approved: p.approved,
        created_at: p.created_at,
        role: roleMap.get(p.id) ?? "user",
      })),
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleApproved(row: Row) {
    setBusy(row.id);
    const { error } = await supabase
      .from("profiles")
      .update({ approved: !row.approved, approved_at: !row.approved ? new Date().toISOString() : null })
      .eq("id", row.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(!row.approved ? "Akses disetujui" : "Akses dicabut");
    load();
  }

  async function toggleAdmin(row: Row) {
    setBusy(row.id);
    if (row.role === "admin") {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", row.id).eq("role", "admin");
      setBusy(null);
      if (error) return toast.error(error.message);
      toast.success("Admin dicabut");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: "admin" });
      setBusy(null);
      if (error) return toast.error(error.message);
      toast.success("Dijadikan admin");
    }
    load();
  }

  if (isAdmin === null || rows === null) {
    return (
      <Card className="glass-card border-0">
        <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat…
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ShieldOff className="h-4 w-4" /> Akses ditolak
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Halaman ini hanya untuk admin. Minta admin workspace untuk memberikan izin.
        </CardContent>
      </Card>
    );
  }

  const filtered = rows.filter((r) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (r.email ?? "").toLowerCase().includes(s) || (r.full_name ?? "").toLowerCase().includes(s);
  });

  const stats = {
    total: rows.length,
    approved: rows.filter((r) => r.approved).length,
    pending: rows.filter((r) => !r.approved).length,
    admins: rows.filter((r) => r.role === "admin").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total User", value: stats.total, icon: Users },
          { label: "Approved", value: stats.approved, icon: CheckCircle2 },
          { label: "Pending", value: stats.pending, icon: XCircle },
          { label: "Admin", value: stats.admins, icon: Shield },
        ].map((s) => (
          <Card key={s.label} className="glass-card border-0">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="font-display text-2xl font-bold">{s.value}</div>
              </div>
              <s.icon className="h-5 w-5 text-primary/70" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card border-0">
        <CardHeader className="flex-row items-center justify-between space-y-0 gap-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <UserCog className="h-4 w-4 text-primary" /> User Management
          </CardTitle>
          <Input
            placeholder="Cari email / nama…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Terdaftar</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email ?? r.id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.role === "admin" ? "default" : "secondary"}>{r.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.approved ? (
                        <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20">Approved</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-500">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          variant={r.approved ? "outline" : "default"}
                          disabled={busy === r.id}
                          onClick={() => toggleApproved(r)}
                        >
                          {r.approved ? "Cabut Akses" : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === r.id}
                          onClick={() => toggleAdmin(r)}
                        >
                          {r.role === "admin" ? "Cabut Admin" : "Jadikan Admin"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Tidak ada user
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
