import fs from "node:fs";
import path from "node:path";

export const UPLOAD_DIR = path.join(process.cwd(), "uploaded");

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export function sanitizeFilename(name: string) {
  return name.replace(/[\\/\0\x00-\x1F\x7F]+/g, "_");
}

export function uniqueFilename(originalName: string) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const safeBase = sanitizeFilename(base) || "file";
  const safeExt = sanitizeFilename(ext);
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  return `${safeBase}__${stamp}${safeExt}`;
}

export function resolveSafeInUploadDir(filename: string) {
  const safeName = sanitizeFilename(filename);
  const full = path.join(UPLOAD_DIR, safeName);
  const resolved = path.resolve(full);
  const root = path.resolve(UPLOAD_DIR) + path.sep;
  if (!resolved.startsWith(root)) {
    throw new Error("Invalid path");
  }
  return { safeName, resolved };
}

export async function listUploadedFiles() {
  ensureUploadDir();
  const entries = await fs.promises.readdir(UPLOAD_DIR, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((d) => d.isFile() && !d.name.startsWith("."))
      .map(async (d) => {
        const full = path.join(UPLOAD_DIR, d.name);
        const stat = await fs.promises.stat(full);
        return {
          filename: d.name,
          size: stat.size,
          mtime: stat.mtimeMs,
          path: `uploaded/${d.name}`,
        };
      })
  );
  // Newest first by mtime
  files.sort((a, b) => b.mtime - a.mtime);
  return files;
}
