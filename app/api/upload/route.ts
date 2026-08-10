import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminGuard";
import { getUploadsBucket } from "@/lib/db";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
  }

  const filename = `${crypto.randomUUID()}.${ext}`;
  await getUploadsBucket().put(filename, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return NextResponse.json({ path: `/uploads/${filename}` }, { status: 201 });
}
