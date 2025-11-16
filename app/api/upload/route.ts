import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

// Ensure uploads go to the local `uploaded` directory in the project root
const UPLOAD_DIR = path.join(process.cwd(), "uploaded");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function sanitizeFilename(name: string) {
  // Remove path separators and control characters
  return name.replace(/[\\/\0\x00-\x1F\x7F]+/g, "_");
}

function uniqueFilename(originalName: string) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const safeBase = sanitizeFilename(base) || "file";
  const safeExt = sanitizeFilename(ext);
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19); // YYYY-MM-DD_HH-MM-SS
  return `${safeBase}__${stamp}${safeExt}`;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided under field 'file'" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    ensureUploadDir();
    const name = uniqueFilename(file.name || "upload");
    const targetPath = path.join(UPLOAD_DIR, name);
    await fs.promises.writeFile(targetPath, buffer);

    return NextResponse.json({
      ok: true,
      filename: name,
      originalName: file.name,
      size: buffer.length,
      path: `uploaded/${name}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
