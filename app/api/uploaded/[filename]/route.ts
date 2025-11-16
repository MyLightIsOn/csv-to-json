import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { ensureUploadDir, resolveSafeInUploadDir } from "@/lib/server/uploads";

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    ensureUploadDir();
    const { safeName, resolved } = resolveSafeInUploadDir(filename);
    const st = await fs.promises.stat(resolved).catch(() => null);
    if (!st || !st.isFile()) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read file into a Buffer and return it (sufficient for typical CSV sizes)
    const data = await fs.promises.readFile(resolved);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = ext === ".csv" ? "text/csv" : "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(st.size),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to download";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const { resolved } = resolveSafeInUploadDir(filename);
    const st = await fs.promises.stat(resolved).catch(() => null);
    if (!st || !st.isFile()) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    await fs.promises.unlink(resolved);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
