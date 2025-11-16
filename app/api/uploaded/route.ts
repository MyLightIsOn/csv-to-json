import { NextResponse } from "next/server";
import { listUploadedFiles } from "@/lib/server/uploads";

export async function GET() {
  try {
    const files = await listUploadedFiles();
    return NextResponse.json({ ok: true, files });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
