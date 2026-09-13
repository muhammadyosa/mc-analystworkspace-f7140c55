import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Shield,
  ShieldOff,
  CheckCircle2,
  XCircle,
  UserCog,
  Users,
  RefreshCw,
  Pencil,
  Activity,
  Wifi,
} from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/settings/users")({
  head: () => ({ meta: [{ title: "User Management — MCA Workspace" }] }),
  component: UserManagementPage,
});

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  approved: boolean;
  created_at: string;
  last_seen_at: string | null;
  role: AppRole;
};

type AppRole = "admin" | "manager" | "analyst" | "viewer" | "user";

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  manager: "Manager",
  analyst: "Analyst",
  viewer: "Viewer",
  user: "Viewer",
};

const ROLE_OPTIONS: AppRole[] = ["admin", "manager", "analyst", "viewer"];


const ONLINE_WINDOW_MS = 5 * 60_000;

function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
}

function lastActionLabel(lastSeen: string | null) {
  if (!lastSeen) return "—";
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < ONLINE_WINDOW_MS) return "Baru saja";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(lastSeen).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" });
}

function UserManagementPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");

  async function load(silent = false) {
    if (!silent) setRefreshing(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setRefreshing(false);
      return;
    }
    const { data: myRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const adminCheck = (myRoles ?? []).some((r) => r.role === "admin");
    setIsAdmin(adminCheck);
    if (!adminCheck) {
      setRows([]);
      setRefreshing(false);
      return;
    }
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, approved, created_at, last_seen_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setRefreshing(false);
    if (pErr || rErr) {
      toast.error(pErr?.message ?? rErr?.message ?? "Gagal memuat data");
      setRows([]);
      return;
    }
    const roleMap = new Map<string, AppRole>();
    (roles ?? []).forEach((r) => {
      const cur = roleMap.get(r.user_id);
      if (r.role === "admin" || !cur) roleMap.set(r.user_id, r.role as AppRole);
    });
    setRows(
      (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        approved: p.approved,
        created_at: p.created_at,
        last_seen_at: (p as { last_seen_at?: string | null }).last_seen_at ?? null,
        role: roleMap.get(p.id) ?? "user",
      })),
    );
  }

  useEffect(() => {
    load(true);
    const t = setInterval(() => load(true), 60_000);
    return () => clearInterval(t);
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
    load(true);
  }

  async function changeRole(row: Row, next: AppRole) {
    if (row.role === next) return;
    setBusy(row.id);
    const del = await supabase.from("user_roles").delete().eq("user_id", row.id);
    if (del.error) {
      setBusy(null);
      return toast.error(del.error.message);
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: next });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Role diubah menjadi ${ROLE_LABEL[next]}`);
    load(true);
  }

  const filtered = useMemo(() => {
    const list = rows ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (r) =>
        (r.email ?? "").toLowerCase().includes(s) ||
        (r.full_name ?? "").toLowerCase().includes(s) ||
        r.role.toLowerCase().includes(s),
    );
  }, [rows, q]);

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

  const stats = {
    total: rows.length,
    approved: rows.filter((r) => r.approved).length,
    pending: rows.filter((r) => !r.approved).length,
    online: rows.filter((r) => isOnline(r.last_seen_at)).length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total User", value: stats.total, icon: Users },
          { label: "Approved", value: stats.approved, icon: CheckCircle2 },
          { label: "Pending", value: stats.pending, icon: XCircle },
          { label: "Online", value: stats.online, icon: Wifi },
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
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <UserCog className="h-4 w-4 text-primary" /> User Management
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Kelola user dan role akses sistem ({rows.length} user terdaftar)
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={refreshing}>
            <RefreshCw className={refreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Cari nama, email, atau role…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-md"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" /> Last Action
                    </span>
                  </TableHead>
                  <TableHead>Bergabung</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const online = isOnline(r.last_seen_at);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-9 w-9 ring-1 ring-border/60">
                              {r.avatar_url && <AvatarImage src={r.avatar_url} alt={r.full_name ?? "User"} />}
                              <AvatarFallback className="text-[11px]">
                                {(r.full_name ?? r.email ?? "U").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={
                                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card " +
                                (online ? "bg-emerald-500" : "bg-muted-foreground/40")
                              }
                              aria-label={online ? "Online" : "Offline"}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium">{r.full_name ?? "—"}</span>
                              <Pencil className="h-3 w-3 text-muted-foreground/60" />
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{r.email ?? r.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.approved ? (
                          <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> OK
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={ROLE_OPTIONS.includes(r.role) ? r.role : "viewer"}
                          disabled={busy === r.id}
                          onValueChange={(v) => changeRole(r, v as AppRole)}
                        >
                          <SelectTrigger className="h-8 w-[118px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {ROLE_LABEL[opt]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {online ? (
                          <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20">
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Online
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{lastActionLabel(r.last_seen_at)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {lastActionLabel(r.last_seen_at)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1.5">
                          <Button
                            size="sm"
                            variant={r.approved ? "outline" : "default"}
                            disabled={busy === r.id}
                            onClick={() => toggleApproved(r)}
                          >
                            {r.approved ? "Cabut Akses" : "Approve"}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={busy === r.id}
                            title={r.role === "admin" ? "Jadikan Viewer" : "Jadikan Admin"}
                            onClick={() => changeRole(r, r.role === "admin" ? "viewer" : "admin")}
                          >
                            {r.role === "admin" ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
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
