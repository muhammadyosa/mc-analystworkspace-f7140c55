import { Link } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ title = "Belum ada data", desc }: { title?: string; desc?: string }) {
  return (
    <div className="glass-card mx-auto mt-8 max-w-lg rounded-2xl p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-lg">
        <Upload className="h-6 w-6 text-white" />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {desc ?? "Upload file Excel PEMBAGIAN CLUSTER SIBT.xlsx dan ticket jan-jun.xlsx untuk memulai analisa."}
      </p>
      <Button asChild className="mt-5">
        <Link to="/upload">Buka Halaman Upload</Link>
      </Button>
    </div>
  );
}
