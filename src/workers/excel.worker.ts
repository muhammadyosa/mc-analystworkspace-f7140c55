import {
  classifyFile,
  smartImport,
  parseClusterFile,
  parseTicketFile,
  parseAnalystFile,
  parseCompetitorFile,
  parseActionPlanFile,
} from "../lib/excel-core";
const methods = {
  classifyFile,
  smartImport,
  parseClusterFile,
  parseTicketFile,
  parseAnalystFile,
  parseCompetitorFile,
  parseActionPlanFile,
};
self.onmessage = async ({ data }: MessageEvent<{ method: keyof typeof methods; file: File }>) => {
  try {
    const method = methods[data.method];
    if (!method) throw new Error("Format import tidak dikenal");
    self.postMessage({ result: await method(data.file) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Gagal membaca file Excel",
    });
  }
};
