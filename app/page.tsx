"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";

type JsonRow = Record<string, string>;

export default function CsvToJsonPage() {
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<JsonRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("data");
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onPickFile = useCallback(() => fileInputRef.current?.click(), []);

  const handleFile = useCallback((file: File) => {
    setError(null);
    setUploadInfo(null);
    setFilename(file.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsvText(text);
      try {
        setRows(csvToJson(text));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to parse CSV";
        setError(message);
        setRows(null);
      }
    };
    reader.onerror = () => setError("Could not read the file.");
    reader.readAsText(file);

    // Also upload the file to the server so it is saved in the `uploaded` folder
    (async () => {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Upload failed with status ${res.status}`);
        }
        setUploadInfo(`Saved as ${data?.path || data?.filename || "(unknown)"}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploadInfo(`Upload error: ${msg}`);
      }
    })();
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCsvText(text);
        setError(null);
        setFilename("pasted");
        setRows(csvToJson(text));
      }
    } catch (e) {
      console.log(e);
      setError("Nothing to paste or clipboard access denied.");
    }
  }, []);

  const downloadHref = useMemo(() => {
    if (!rows) return "";
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    return URL.createObjectURL(blob);
  }, [rows]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
    try {
      setRows(csvToJson(text));
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to parse CSV";
      setError(message);
      setRows(null);
    }
  }, []);

  return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <header className="mb-8 flex items-center justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">CSV → JSON (Accessibility Bugs)</h1>
            <div className="flex items-center gap-2">
              <button onClick={onPickFile} className="rounded-2xl px-4 py-2 bg-black text-white shadow hover:opacity-90">
                Upload CSV
              </button>
              <button onClick={onPaste} className="rounded-2xl px-4 py-2 bg-white ring-1 ring-neutral-200 shadow hover:bg-neutral-100">
                Paste from Clipboard
              </button>
              <input
                  type="file"
                  accept=".csv,text/csv"
                  ref={fileInputRef}
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
              />
            </div>
          </header>

          {/* Dropzone */}
          <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="mb-6 rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-600"
          >
            Drag & drop a .csv here, or use the buttons above.
          </div>

          {/* Text input */}
          <label className="mb-2 block text-sm font-medium text-neutral-700">CSV Input</label>
          {uploadInfo && (
            <div className="mb-3 text-xs text-neutral-600">{uploadInfo}</div>
          )}
          <textarea
              className="h-48 w-full resize-y rounded-2xl border border-neutral-300 bg-white p-4 font-mono text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-black"
              placeholder={`title,priority,status\n"Color contrast on login button fails WCAG 1.4.3",High,Open`}
              value={csvText}
              onChange={handleTextChange}
          />

          {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
                {error}
              </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white p-2 ring-1 ring-neutral-200">
              <span className="px-2 text-xs text-neutral-500">Output filename</span>
              <input
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm focus:outline-none"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
              />
              <span className="px-2 text-xs text-neutral-500">.json</span>
            </div>
            <a
                download={`${filename || "data"}.json`}
                href={rows ? downloadHref : undefined}
                className={`rounded-2xl px-4 py-2 shadow ${rows ? "bg-emerald-600 text-white hover:opacity-90" : "cursor-not-allowed bg-neutral-200 text-neutral-500"}`}
                onClick={(e) => {
                  if (!rows) e.preventDefault();
                }}
            >
              Download JSON
            </a>
          </div>

          {/* Preview */}
          <section className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-lg font-semibold">Detected Fields</h2>
              <FieldsSummary rows={rows} />
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">JSON Preview</h2>
              <pre className="max-h-[32rem] overflow-auto rounded-2xl border border-neutral-200 bg-white p-4 text-sm shadow-inner">
              {rows ? JSON.stringify(rows, null, 2) : "/* JSON will appear here after parsing */"}
            </pre>
            </div>
          </section>

          <footer className="mt-10 text-xs text-neutral-500">
            • Assumes the first row is headers. Quoted fields and commas in quotes are supported.
            <br />• Empty lines are ignored. Whitespace around headers is trimmed.
          </footer>
        </div>
      </div>
  );
}

function FieldsSummary({ rows }: { rows: JsonRow[] | null }) {
  if (!rows || rows.length === 0) {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500 shadow-inner">
          No data yet.
        </div>
    );
  }
  const first = rows[0];
  const keys = Object.keys(first);
  return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm shadow-inner">
        {keys.length === 0 ? (
            <div className="text-neutral-500">No headers detected.</div>
        ) : (
            <ul className="list-disc space-y-1 pl-5">
              {keys.map((k) => (
                  <li key={k}><span className="font-medium">{k}</span></li>
              ))}
            </ul>
        )}
      </div>
  );
}

/**
 * csvToJson: robust enough CSV parser for typical bug logs.
 * - Handles commas and newlines inside quotes
 * - Handles escaped double quotes ("") inside quoted fields
 * - Trims UTF-8 BOM
 */
function csvToJson(text: string): JsonRow[] {
  if (!text || !text.trim()) return [];

  // Remove BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rows = parseCSV(text);
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => String(h ?? "").trim());
  const out: JsonRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    // skip completely empty rows
    if (!r || r.every((cell) => String(cell ?? "").trim() === "")) continue;

    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `field_${c + 1}`;
      obj[key] = r[c] ?? "";
    }
    out.push(obj);
  }
  return out;
}

function parseCSV(input: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let i = 0;
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    // Trim trailing empty cells if they exceed header length later; keep as-is for now
    rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        // Escaped quote
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    // Not in quotes
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === delimiter) {
      pushField();
      i++;
      continue;
    }
    if (char === "\n") {
      pushField();
      pushRow();
      i++;
      // handle CRLF \r\n or stray \r
      if (input[i] === "\r") i++;
      continue;
    }
    if (char === "\r") {
      pushField();
      pushRow();
      i++;
      continue;
    }
    field += char;
    i++;
  }
  // push last field/row
  pushField();
  pushRow();

  // If all rows look like they are a semicolon- or tab-delimited (common in EU / clipboard), retry
  if (rows.length <= 1 || (rows[0]?.length ?? 0) === 1) {
    const alt = detectDelimiter(input);
    if (alt && alt !== delimiter) return parseCSV(input, alt);
  }
  return rows;
}

function detectDelimiter(sample: string): "," | ";" | "\t" | null {
  const counts = {
    ",": (sample.match(/,/g) || []).length,
    ";": (sample.match(/;/g) || []).length,
    "\t": (sample.match(/\t/g) || []).length,
  } as const;

  const candidates = [",", ";", "\t"] as const;
  let best: typeof candidates[number] | null = null;
  let max = 0;
  for (const d of candidates) {
    const n = counts[d];
    if (n > max) {
      max = n;
      best = d;
    }
  }
  return max > 0 ? best : null;
}
