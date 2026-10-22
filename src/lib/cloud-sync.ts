import { supabase } from "@/integrations/supabase/client";
import type { ImportKind } from "./excel";

export type CloudDataset = {
  kind: ImportKind;
  rows: unknown[];
  rowCount: number;
  fileName: string | null;
  updatedAt: string;
};

/** Simpan satu dataset ke cloud agar bisa dilihat semua user (khusus admin). */
export async function pushDataset(kind: ImportKind, rows: unknown[], fileName?: string) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from("shared_datasets").upsert(
    {
      kind,
      payload: rows as never,
      row_count: rows.length,
      file_name: fileName ?? null,
      updated_at: new Date().toISOString(),
      updated_by: u.user?.id ?? null,
    },
    { onConflict: "kind" },
  );
  if (error) throw new Error(error.message);
}

/** Ambil semua dataset yang tersimpan di cloud. */
export async function fetchDatasets(
  kinds?: ImportKind[],
  signal?: AbortSignal,
): Promise<CloudDataset[]> {
  if (kinds?.length === 0) return [];
  let query = supabase
    .from("shared_datasets")
    .select("kind, payload, row_count, file_name, updated_at");
  if (kinds) query = query.in("kind", kinds);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => ({
    kind: d.kind as ImportKind,
    rows: Array.isArray(d.payload) ? (d.payload as unknown[]) : [],
    rowCount: d.row_count,
    fileName: d.file_name,
    updatedAt: d.updated_at,
  }));
}

/** Ringkasan tanpa payload — untuk menampilkan status cloud dengan cepat. */
export async function fetchDatasetStatus(signal?: AbortSignal) {
  let query = supabase.from("shared_datasets").select("kind, row_count, file_name, updated_at");
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function clearCloudDatasets() {
  const { error } = await supabase.from("shared_datasets").delete().neq("kind", "");
  if (error) throw new Error(error.message);
}
