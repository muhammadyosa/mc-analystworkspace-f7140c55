// Keep the public import API stable; the worker imports the core directly.
export * from "./excel-core";
import { canUseExcelWorker, runExcelWorker } from "./excel-worker-client";
import type { SmartResult } from "./excel-core";

async function parse<
  K extends
    | "parseClusterFile"
    | "parseTicketFile"
    | "parseAnalystFile"
    | "parseCompetitorFile"
    | "parseActionPlanFile"
    | "classifyFile"
    | "smartImport",
>(method: K, file: File) {
  if (canUseExcelWorker()) return runExcelWorker(method, file);
  const core = await import("./excel-core");
  return core[method](file);
}
export const parseClusterFile = (file: File) =>
  parse("parseClusterFile", file) as Promise<
    Omit<Extract<SmartResult, { kind: "cluster" }>, "kind">
  >;
export const parseTicketFile = (file: File) =>
  parse("parseTicketFile", file) as Promise<Omit<Extract<SmartResult, { kind: "ticket" }>, "kind">>;
export const parseAnalystFile = (file: File) =>
  parse("parseAnalystFile", file) as Promise<
    Omit<Extract<SmartResult, { kind: "analyst" }>, "kind">
  >;
export const parseCompetitorFile = (file: File) =>
  parse("parseCompetitorFile", file) as Promise<
    Omit<Extract<SmartResult, { kind: "competitor" }>, "kind">
  >;
export const parseActionPlanFile = (file: File) =>
  parse("parseActionPlanFile", file) as Promise<
    Omit<Extract<SmartResult, { kind: "actionplan" }>, "kind">
  >;
export const classifyFile = (file: File) => runClassify(file);
async function runClassify(file: File) {
  if (canUseExcelWorker()) return runExcelWorker("classifyFile", file);
  return (await import("./excel-core")).classifyFile(file);
}
export const smartImport = (file: File) => parse("smartImport", file) as Promise<SmartResult>;
