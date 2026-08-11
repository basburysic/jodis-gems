import { NextResponse } from "next/server";
import { getUploadsBucket } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const bucket = await getUploadsBucket();
  const object = await bucket.get(filename);
  if (!object) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cloudflare's ReadableStream type doesn't structurally match lib.dom's,
  // even though it's the same thing at runtime.
  return new Response(object.body as unknown as ReadableStream, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
