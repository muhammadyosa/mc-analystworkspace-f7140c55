import { describe, expect, test } from "bun:test";
import { classifyFile, smartImport, parseClusterFile, parseActionPlanFile } from "./excel-core";
describe("Excel processing regression", () => {
  test("classification and parsing share one workbook read", async () => {
    const file = new File(
      ["CLUSTER,Homepass,HC AKTIF SEPTEMBER,HC AKTIF OCTOBER\nA,100,50,40"],
      "cluster.csv",
    );
    const original = file.arrayBuffer.bind(file);
    let reads = 0;
    file.arrayBuffer = async () => {
      reads++;
      return original();
    };
    expect((await classifyFile(file)).kind).toBe("cluster");
    const parsed = await smartImport(file);
    expect(parsed.rows[0].september).toBe(50);
    expect(parsed.rows[0].oktober).toBe(40);
    expect(reads).toBe(1);
  });
  test("explicit latest-month zero is preserved", async () => {
    const parsed = await parseClusterFile(
      new File(["CLUSTER,Homepass,HC AKTIF SEPTEMBER,HC AKTIF OCTOBER\nA,100,50,0"], "cluster.csv"),
    );
    expect(parsed.rows[0].oktober).toBe(0);
    expect(parsed.rows[0].september).toBe(50);
  });
  test("action plan fields remain unchanged during worker-core extraction", async () => {
    const parsed = await parseActionPlanFile(
      new File(
        [
          "NAMA,CLUSTER,PROGRAM,START DATE,END DATE,KETERANGAN,Hasil\nYosa,A,Profiling,2026-10-01,2026-10-02,Catatan,Selesai",
        ],
        "actionplan.csv",
      ),
    );
    expect(parsed.rows[0].pic).toBe("Yosa");
    expect(parsed.rows[0].program).toBe("Profiling");
    expect(parsed.rows[0].result).toBe("Selesai");
    expect(parsed.rows[0].startDate).toBe("2026-10-01");
  });
});
