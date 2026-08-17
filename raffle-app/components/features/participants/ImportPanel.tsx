"use client";

import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2, AlertTriangle, FileText, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeCsvRows, type ParsedCsvRow, type ImportSummary } from "@/lib/services/csv";

export function ImportPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedCsvRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    setSummary(null);
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields?.map((h) => h.trim().toLowerCase()) ?? [];
        if (!headers.includes("employee name") || !headers.includes("department")) {
          setParseError(
            `CSV must contain "Employee Name" and "Department" columns. Found: ${results.meta.fields?.join(", ") || "none"}`
          );
          setRows([]);
          return;
        }
        setRows(normalizeCsvRows(results.data));
      },
      error: (err) => setParseError(err.message),
    });
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const validCount = rows.filter((r) => r.employeeName && r.department).length;
  const invalidRows = rows.filter((r) => !r.employeeName || !r.department);

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/participants/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setSummary(data);
      router.refresh();
    } catch (e: any) {
      setParseError(e.message);
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csv = "Employee Name,Department\nJane Doe,Production\nJohn Smith,Quality Assurance\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "participant_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`card-surface border-dashed border-2 flex flex-col items-center justify-center text-center py-16 px-6 transition-colors ${
            dragOver ? "border-primary bg-primary-fixed/30" : "border-outline-variant"
          }`}
        >
          <div className="w-14 h-14 rounded-md bg-primary-fixed text-primary flex items-center justify-center mb-4">
            <UploadCloud size={26} />
          </div>
          <h3 className="text-title-lg text-on-surface mb-1">Drag & Drop CSV File</h3>
          <p className="text-body-md text-on-surface-variant mb-4">
            Or click to browse your files. Supported format: .csv only. Maximum file size: 10MB.
          </p>
          <Button onClick={() => inputRef.current?.click()}>Browse Files</Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {fileName && (
            <p className="mt-4 text-body-md text-on-surface-variant flex items-center gap-2">
              <FileText size={16} /> {fileName}
            </p>
          )}
        </div>

        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-secondary" />
                <CardTitle>Data Preview</CardTitle>
              </div>
              <Badge variant="standard">{rows.length} Records Found</Badge>
            </CardHeader>
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Department</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.slice(0, 8).map((r) => {
                  const invalid = !r.employeeName || !r.department;
                  return (
                    <TR key={r.row} className={invalid ? "bg-error-container/20" : ""}>
                      <TD>{r.employeeName || "—"}</TD>
                      <TD>{r.department || "—"}</TD>
                      <TD>
                        {invalid ? (
                          <span className="text-error text-body-md flex items-center gap-1">
                            <AlertTriangle size={14} />
                            Missing {!r.employeeName ? "Name" : "Department"}
                          </span>
                        ) : (
                          <span className="text-secondary font-medium">Valid</span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            {rows.length > 8 && (
              <p className="text-center text-body-md text-primary py-3 border-t border-outline-variant/60">
                + {rows.length - 8} more records
              </p>
            )}
          </Card>
        )}

        {summary && (
          <Card className="p-6 bg-secondary-container/20 border-secondary/30">
            <p className="text-title-lg text-on-surface mb-2">Import Complete</p>
            <p className="text-body-md text-on-surface-variant">
              {summary.imported} imported · {summary.duplicates} duplicates skipped · {summary.errors} errors
            </p>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-primary" />
            <h3 className="text-title-lg text-on-surface">Required Columns</h3>
          </div>
          <p className="text-body-md text-on-surface-variant mb-4">
            Ensure your CSV file contains exactly these headers in the first row:
          </p>
          <div className="space-y-3">
            <div className="border border-outline-variant rounded p-3">
              <p className="font-semibold text-on-surface text-body-md">Employee Name</p>
              <p className="text-body-md text-on-surface-variant">Full legal name</p>
            </div>
            <div className="border border-outline-variant rounded p-3">
              <p className="font-semibold text-on-surface text-body-md">Department</p>
              <p className="text-body-md text-on-surface-variant">
                Auto-created if it doesn&apos;t exist yet
              </p>
            </div>
          </div>
          <button onClick={downloadTemplate} className="text-body-md text-primary font-medium mt-4 hover:underline">
            Download CSV Template
          </button>
        </Card>

        {(parseError || invalidRows.length > 0) && (
          <Card className="p-6 border-error/30 bg-error-container/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-error" />
              <h3 className="text-title-lg text-error">Action Required</h3>
            </div>
            {parseError ? (
              <p className="text-body-md text-error">{parseError}</p>
            ) : (
              <p className="text-body-md text-on-surface-variant">
                {invalidRows.length} issue(s) found. Rows with missing data will be skipped on import.
              </p>
            )}
          </Card>
        )}

        <Button
           variant="primary"
          size="lg"
          className="text-on-primary"
          disabled={validCount === 0 || importing}
          loading={importing}
          onClick={handleImport}
        >
          {importing ? "Processing Data..." : `Import ${validCount} Participant${validCount === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}
