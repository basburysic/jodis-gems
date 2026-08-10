import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminGuard";
import { deleteProduct, getProduct, updateProduct } from "@/lib/inventory";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number((await params).id);
  const existing = await getProduct(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const patch: Record<string, unknown> = {};
  for (const key of [
    "category",
    "name",
    "price_cents",
    "description",
    "image_path",
    "quantity_available",
    "venmo_username",
    "square_link",
    "active",
  ]) {
    if (key in body) patch[key] = body[key];
  }

  const product = await updateProduct(id, patch);
  return NextResponse.json({ product });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number((await params).id);
  await deleteProduct(id);
  return NextResponse.json({ ok: true });
}
