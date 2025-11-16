import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { ensureUploadDir, uniqueFilename } from "@/lib/server/uploads";

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
    const targetPath = path.join(process.cwd(), "uploaded", name);
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
