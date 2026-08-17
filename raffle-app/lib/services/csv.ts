// Pure, framework-free helpers shared between the server-side participants
// service and client components (e.g. ImportPanel). Deliberately has NO
// import of lib/db.ts (which pulls in the `pg` driver) so bundling this
// module into a Client Component never drags a Node-only driver into the
// browser bundle.

export interface ParsedCsvRow {
  row: number;
  employeeName: string;
  department: string;
}

export interface ImportRowResult {
  row: number;
  employeeName: string;
  department: string;
  status: "valid" | "duplicate" | "error";
  message?: string;
}

export interface ImportSummary {
  totalRows: number;
  imported: number;
  duplicates: number;
  errors: number;
  results: ImportRowResult[];
}

/** Parses raw PapaParse output (Employee Name, Department columns only — no Employee ID). */
export function normalizeCsvRows(rawRows: Record<string, string>[]): ParsedCsvRow[] {
  return rawRows.map((r, i) => {
    const keys = Object.keys(r);
    const nameKey = keys.find((k) => k.trim().toLowerCase() === "employee name") ?? keys[0];
    const deptKey = keys.find((k) => k.trim().toLowerCase() === "department") ?? keys[1];
    return {
      row: i + 2, // +2: header is row 1, data is 1-indexed from row 2
      employeeName: (r[nameKey] ?? "").trim(),
      department: (r[deptKey] ?? "").trim(),
    };
  });
}
