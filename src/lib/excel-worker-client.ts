import type { ImportKind, SmartResult } from "./excel-core";

type ClassifiedFile = {
  kind: ImportKind;
  fileName: string;
  sheetName: string;
  sheetCount: number;
  size: number;
};
type WorkerResults = {
  parseClusterFile: Extract<SmartResult, { kind: "cluster" }> extends infer R
    ? Omit<R, "kind">
    : never;
  parseTicketFile: Omit<Extract<SmartResult, { kind: "ticket" }>, "kind">;
  parseAnalystFile: Omit<Extract<SmartResult, { kind: "analyst" }>, "kind">;
  parseCompetitorFile: Omit<Extract<SmartResult, { kind: "competitor" }>, "kind">;
  parseActionPlanFile: Omit<Extract<SmartResult, { kind: "actionplan" }>, "kind">;
  classifyFile: ClassifiedFile;
  smartImport: SmartResult;
};
let tail: Promise<unknown> = Promise.resolve();
export const canUseExcelWorker = () =>
  typeof window !== "undefined" && typeof Worker !== "undefined";

/** One workbook at a time prevents multi-file imports multiplying peak memory. */
export function runExcelWorker<K extends keyof WorkerResults>(
  method: K,
  file: File,
): Promise<WorkerResults[K]> {
  const job = tail
    .catch(() => undefined)
    .then(
      () =>
        new Promise<WorkerResults[K]>((resolve, reject) => {
          const worker = new Worker(new URL("../workers/excel.worker.ts", import.meta.url), {
            type: "module",
          });
          const cleanup = () => {
            clearTimeout(timeout);
            worker.terminate();
          };
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Pembacaan file terlalu lama. Coba unggah kembali."));
          }, 120_000);
          worker.onmessage = ({ data }) => {
            cleanup();
            if (data.error) reject(new Error(data.error));
            else resolve(data.result);
          };
          worker.onerror = (event) => {
            cleanup();
            reject(new Error(event.message || "Gagal membaca file Excel"));
          };
          worker.postMessage({ method, file });
        }),
    );
  tail = job;
  return job;
}
