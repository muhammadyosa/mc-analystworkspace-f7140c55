import {
  createFileRoute,
  retainSearchParams,
  stripSearchParams,
  useNavigate,
} from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  MoreVertical,
  Pencil,
  RefreshCw,
  Search,
  ShieldOff,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  Wifi,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { adminUsersOptions, type AdminUserRow } from "@/lib/admin-users";
import { deleteWorkspaceUser, inviteWorkspaceUser } from "@/lib/user-admin.functions";
import { ASSIGNABLE_ROLES, type AssignableRole } from "@/lib/user-admin-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const SORTS = ["name", "email", "seen", "joined"] as const;
type SortKey = (typeof SORTS)[number];

type UsersSearch = {
  q: string;
  role: string;
  status: string;
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
};

export const Route = createFileRoute("/settings/users")({
  validateSearch: (search: Record<string, unknown>): UsersSearch => {
    const page = Number(search.page);
    return {
      q: typeof search.q === "string" ? search.q : "",
      role: typeof search.role === "string" ? search.role : "all",
      status: typeof search.status === "string" ? search.status : "all",
      sort: (SORTS as readonly string[]).includes(search.sort as string)
        ? (search.sort as SortKey)
        : "joined",
      dir: search.dir === "asc" ? "asc" : "desc",
      page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    };
  },
  search: {
    // Pencarian, filter, sorting, dan halaman bertahan saat berpindah tab Settings.
    middlewares: [
      retainSearchParams(true),
      stripSearchParams({ q: "", role: "all", status: "all", sort: "joined", dir: "desc", page: 1 }),
    ],
  },
  head: () => ({
    meta: [
      { title: "User Management — MCA Analyst Workspace" },
      {
        name: "description",
        content: "Kelola persetujuan, peran, dan aktivitas pengguna workspace.",
      },
      { property: "og:title", content: "User Management — MCA Analyst Workspace" },
      {
        property: "og:description",
        content: "Kelola persetujuan, peran, dan aktivitas pengguna workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UserManagementPage,
});

const ROLE_LABEL: Record<AssignableRole, string> = {
  admin: "Admin",
  manager: "Manager",
  analyst: "Analyst",
  viewer: "Viewer",
};

const ONLINE_WINDOW_MS = 5 * 60_000;
const PAGE_SIZE = 10;

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
  return new Date(lastSeen).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function dateLabel(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

const nameSchema = z.string().trim().min(1, "Nama wajib diisi").max(100, "Maksimal 100 karakter");
const inviteFormSchema = z.object({
  email: z.string().trim().email("Alamat email tidak valid").max(255),
  role: z.enum(["admin", "manager", "analyst", "viewer"]),
});

function statusBadge(row: AdminUserRow) {
  return row.approved ? (
    <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20">
      <CheckCircle2 className="mr-1 h-3 w-3" /> Aktif
    </Badge>
  ) : (
    <Badge variant="outline" className="border-amber-500/40 text-amber-500">
      Pending
    </Badge>
  );
}

function roleBadgeVariant(role: AssignableRole) {
  switch (role) {
    case "admin":
      return "bg-primary/15 text-primary hover:bg-primary/20";
    case "manager":
      return "bg-sky-500/15 text-sky-500 hover:bg-sky-500/20";
    case "analyst":
      return "bg-violet-500/15 text-violet-500 hover:bg-violet-500/20";
    default:
      return "bg-muted text-muted-foreground hover:bg-muted";
  }
}

function UserAvatar({ row, size = "h-9 w-9" }: { row: AdminUserRow; size?: string }) {
  return (
    <div className="relative shrink-0">
      <Avatar className={cn(size, "ring-1 ring-border/60")}>
        {row.avatar_url && <AvatarImage src={row.avatar_url} alt={row.full_name ?? "User"} />}
        <AvatarFallback className="text-[11px]">
          {(row.full_name ?? row.email ?? "U").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
          isOnline(row.last_seen_at) ? "bg-emerald-500" : "bg-muted-foreground/40",
        )}
        aria-label={isOnline(row.last_seen_at) ? "Online" : "Offline"}
      />
    </div>
  );
}

function UserManagementPage() {
  const navigate = useNavigate({ from: "/settings/users" });
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const { data, isPending, isFetching, isError, error, refetch } = useQuery(adminUsersOptions);

  const [detailRow, setDetailRow] = useState<AdminUserRow | null>(null);
  const [editRow, setEditRow] = useState<AdminUserRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<AdminUserRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AssignableRole>("viewer");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const setSearch = (patch: Partial<UsersSearch>, replace = false) =>
    navigate({
      search: (prev: UsersSearch) => ({ ...prev, page: 1, ...patch }),
      replace,
    });

  const toggleSort = (key: SortKey) => {
    if (search.sort === key) {
      setSearch({ dir: search.dir === "asc" ? "desc" : "asc" });
    } else {
      setSearch({ sort: key, dir: key === "name" || key === "email" ? "asc" : "desc" });
    }
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Aksi gagal");

  const toggleMut = useMutation({
    mutationFn: async (row: AdminUserRow) => {
      const { error: err } = await supabase
        .from("profiles")
        .update({
          approved: !row.approved,
          approved_at: !row.approved ? new Date().toISOString() : null,
        })
        .eq("id", row.id);
      if (err) throw err;
      return row;
    },
    onSuccess: (row) => {
      toast.success(!row.approved ? "Akses disetujui" : "Akses dinonaktifkan");
      invalidate();
    },
    onError,
  });

  const roleMut = useMutation({
    mutationFn: async ({ row, next }: { row: AdminUserRow; next: AssignableRole }) => {
      const del = await supabase.from("user_roles").delete().eq("user_id", row.id);
      if (del.error) throw del.error;
      const { error: err } = await supabase
        .from("user_roles")
        .insert({ user_id: row.id, role: next });
      if (err) throw err;
      return next;
    },
    onSuccess: (next) => {
      toast.success(`Role diubah menjadi ${ROLE_LABEL[next]}`);
      invalidate();
    },
    onError,
  });

  const nameMut = useMutation({
    mutationFn: async ({ row, name }: { row: AdminUserRow; name: string }) => {
      const { error: err } = await supabase
        .from("profiles")
        .update({ full_name: name })
        .eq("id", row.id);
      if (err) throw err;
    },
    onSuccess: () => {
      toast.success("Nama pengguna diperbarui");
      setEditRow(null);
      invalidate();
    },
    onError,
  });

  const inviteMut = useMutation({
    mutationFn: (input: { email: string; role: AssignableRole }) => inviteWorkspaceUser({ data: input }),
    onSuccess: () => {
      toast.success("Undangan terkirim ke email pengguna");
      setAddOpen(false);
      setInviteEmail("");
      setInviteRole("viewer");
      invalidate();
    },
    onError,
  });

  const deleteMut = useMutation({
    mutationFn: (row: AdminUserRow) => deleteWorkspaceUser({ data: { userId: row.id } }),
    onSuccess: () => {
      toast.success("Pengguna dihapus");
      setDeleteRow(null);
      invalidate();
    },
    onError,
  });

  const pendingId =
    (toggleMut.isPending && toggleMut.variables?.id) ||
    (roleMut.isPending && roleMut.variables?.row.id) ||
    (nameMut.isPending && nameMut.variables?.row.id) ||
    (deleteMut.isPending && deleteMut.variables?.id) ||
    null;

  const rows = data?.rows ?? [];

  const filtered = useMemo(() => {
    const s = search.q.trim().toLowerCase();
    let list = rows;
    if (s) {
      list = list.filter(
        (r) =>
          (r.email ?? "").toLowerCase().includes(s) ||
          (r.full_name ?? "").toLowerCase().includes(s),
      );
    }
    if (search.role !== "all") list = list.filter((r) => r.role === search.role);
    if (search.status === "active") list = list.filter((r) => r.approved);
    if (search.status === "pending") list = list.filter((r) => !r.approved);
    const dir = search.dir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      switch (search.sort) {
        case "name":
          return dir * (a.full_name ?? a.email ?? "").localeCompare(b.full_name ?? b.email ?? "", "id");
        case "email":
          return dir * (a.email ?? "").localeCompare(b.email ?? "");
        case "seen":
          return (
            dir *
            ((a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0) -
              (b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0))
          );
        default:
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });
    return sorted;
  }, [rows, search.q, search.role, search.status, search.sort, search.dir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(search.page, pageCount);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="glass-card border-0">
              <CardContent className="p-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-7 w-10" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="glass-card border-0">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-9 w-full max-w-md" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ShieldOff className="h-4 w-4" /> Gagal memuat pengguna
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{error instanceof Error ? error.message : "Terjadi kesalahan."}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Coba lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data?.isAdmin) {
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
    active: rows.filter((r) => r.approved).length,
    inactive: rows.filter((r) => !r.approved).length,
    roles: new Set(rows.map((r) => r.role)).size,
  };

  const sortIcon = (key: SortKey) =>
    search.sort !== key ? (
      <ArrowUpDown className="h-3 w-3 opacity-40" />
    ) : search.dir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );

  const sortHead = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {label} {sortIcon(key)}
    </button>
  );

  const submitInvite = () => {
    const parsed = inviteFormSchema.safeParse({ email: inviteEmail, role: inviteRole });
    if (!parsed.success) {
      setInviteError(parsed.error.issues[0]?.message ?? "Periksa isian form");
      return;
    }
    setInviteError(null);
    inviteMut.mutate(parsed.data);
  };

  const submitName = () => {
    if (!editRow) return;
    const parsed = nameSchema.safeParse(editName);
    if (!parsed.success) {
      setEditError(parsed.error.issues[0]?.message ?? "Nama tidak valid");
      return;
    }
    setEditError(null);
    nameMut.mutate({ row: editRow, name: parsed.data });
  };

  const roleActions = (row: AdminUserRow) => (
    <Select
      value={row.role}
      disabled={pendingId === row.id}
      onValueChange={(v) => roleMut.mutate({ row, next: v as AssignableRole })}
    >
      <SelectTrigger className="h-8 w-[118px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ASSIGNABLE_ROLES.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {ROLE_LABEL[opt]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const mobileMenu = (row: AdminUserRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Menu aksi pengguna">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setDetailRow(row)}>
          <Eye className="mr-2 h-4 w-4" /> Lihat Detail
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setEditRow(row);
            setEditName(row.full_name ?? "");
            setEditError(null);
          }}
        >
          <Pencil className="mr-2 h-4 w-4" /> Edit Nama
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UserCog className="mr-2 h-4 w-4" /> Ubah Role
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {ASSIGNABLE_ROLES.map((opt) => (
              <DropdownMenuItem
                key={opt}
                disabled={row.role === opt}
                onClick={() => roleMut.mutate({ row, next: opt })}
              >
                {ROLE_LABEL[opt]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem disabled={pendingId === row.id} onClick={() => toggleMut.mutate(row)}>
          {row.approved ? (
            <>
              <XCircle className="mr-2 h-4 w-4" /> Nonaktifkan
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Aktifkan
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={pendingId === row.id}
          onClick={() => setDeleteRow(row)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Hapus Pengguna
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total User", value: stats.total, icon: Users },
          { label: "User Aktif", value: stats.active, icon: CheckCircle2 },
          { label: "User Nonaktif", value: stats.inactive, icon: XCircle },
          { label: "Total Role", value: stats.roles, icon: UserCog },
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => invalidate()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Tambah User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email…"
                value={search.q}
                onChange={(e) => setSearch({ q: e.target.value }, true)}
                className="pl-8"
              />
            </div>
            <Select value={search.role} onValueChange={(v) => setSearch({ role: v })}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Semua Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                {ASSIGNABLE_ROLES.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {ROLE_LABEL[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={search.status} onValueChange={(v) => setSearch({ status: v })}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: tabel profesional */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{sortHead("name", "User")}</TableHead>
                  <TableHead>{sortHead("email", "Email")}</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" /> {sortHead("seen", "Last Login")}
                    </span>
                  </TableHead>
                  <TableHead>{sortHead("joined", "Bergabung")}</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar row={r} />
                        <span className="truncate font-medium">{r.full_name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {r.email ?? r.id}
                    </TableCell>
                    <TableCell>{roleActions(r)}</TableCell>
                    <TableCell>{statusBadge(r)}</TableCell>
                    <TableCell>
                      {isOnline(r.last_seen_at) ? (
                        <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20">
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Online
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {lastActionLabel(r.last_seen_at)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {dateLabel(r.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Lihat detail"
                          onClick={() => setDetailRow(r)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Edit nama"
                          onClick={() => {
                            setEditRow(r);
                            setEditName(r.full_name ?? "");
                            setEditError(null);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title={r.approved ? "Nonaktifkan akses" : "Aktifkan akses"}
                          disabled={pendingId === r.id}
                          onClick={() => toggleMut.mutate(r)}
                        >
                          {r.approved ? (
                            <XCircle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Hapus pengguna"
                          disabled={pendingId === r.id}
                          onClick={() => setDeleteRow(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pageRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {rows.length === 0
                        ? "Belum ada pengguna terdaftar."
                        : "Tidak ada pengguna yang cocok dengan pencarian atau filter."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: kartu ringkas */}
          <div className="space-y-2 md:hidden">
            {pageRows.map((r) => (
              <div key={r.id} className="glass-card rounded-xl border-0 p-3">
                <div className="flex items-start gap-3">
                  <UserAvatar row={r} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.full_name ?? "—"}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.email ?? r.id}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge className={cn("text-[10px]", roleBadgeVariant(r.role))}>
                        {ROLE_LABEL[r.role]}
                      </Badge>
                      {statusBadge(r)}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Wifi className="h-3 w-3" />
                      {isOnline(r.last_seen_at) ? "Online" : lastActionLabel(r.last_seen_at)}
                    </div>
                  </div>
                  {mobileMenu(r)}
                </div>
              </div>
            ))}
            {pageRows.length === 0 && (
              <div className="glass-card rounded-xl border-0 py-10 text-center text-sm text-muted-foreground">
                {rows.length === 0
                  ? "Belum ada pengguna terdaftar."
                  : "Tidak ada pengguna yang cocok dengan pencarian atau filter."}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <span>
              Menampilkan {pageRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
              {(page - 1) * PAGE_SIZE + pageRows.length} dari {filtered.length} pengguna
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setSearch({ page: page - 1 })}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2">
                {page} / {pageCount}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={page >= pageCount}
                onClick={() => setSearch({ page: page + 1 })}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail */}
      <Dialog open={detailRow !== null} onOpenChange={(o) => !o && setDetailRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Pengguna</DialogTitle>
            <DialogDescription>Informasi lengkap akun pengguna.</DialogDescription>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <UserAvatar row={detailRow} size="h-12 w-12" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{detailRow.full_name ?? "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {detailRow.email ?? detailRow.id}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge className={cn("text-[10px]", roleBadgeVariant(detailRow.role))}>
                      {ROLE_LABEL[detailRow.role]}
                    </Badge>
                    {statusBadge(detailRow)}
                  </div>
                </div>
              </div>
              <dl className="space-y-2 text-sm">
                {[
                  {
                    icon: Wifi,
                    label: "Status Online",
                    value: isOnline(detailRow.last_seen_at) ? "Online" : "Offline",
                  },
                  {
                    icon: Activity,
                    label: "Last Login",
                    value: lastActionLabel(detailRow.last_seen_at),
                  },
                  { icon: CalendarDays, label: "Bergabung", value: dateLabel(detailRow.created_at) },
                  {
                    icon: CheckCircle2,
                    label: "Disetujui Pada",
                    value: detailRow.approved_at ? dateLabel(detailRow.approved_at) : "—",
                  },
                  { icon: Mail, label: "Email", value: detailRow.email ?? "—" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <item.icon className="h-3.5 w-3.5" /> {item.label}
                    </dt>
                    <dd className="truncate text-right font-medium">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit nama */}
      <Dialog open={editRow !== null} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
            <DialogDescription>
              Ubah nama tampilan untuk {editRow?.email ?? "pengguna"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nama Lengkap</Label>
            <Input
              id="edit-name"
              value={editName}
              maxLength={100}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nama lengkap"
            />
            {editError && <p className="text-xs text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Batal
            </Button>
            <Button onClick={submitName} disabled={nameMut.isPending}>
              {nameMut.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tambah user */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna</DialogTitle>
            <DialogDescription>
              Undangan berisi tautan untuk mengatur kata sandi akan dikirim ke email pengguna.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                maxLength={255}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AssignableRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {ROLE_LABEL[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button onClick={submitInvite} disabled={inviteMut.isPending}>
              {inviteMut.isPending ? "Mengirim…" : "Kirim Undangan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hapus user */}
      <AlertDialog open={deleteRow !== null} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengguna ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <span className="font-medium">{deleteRow?.email ?? deleteRow?.full_name}</span>{" "}
              beserta profil dan rolenya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteRow) deleteMut.mutate(deleteRow);
              }}
            >
              {deleteMut.isPending ? "Menghapus…" : "Hapus Permanen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
