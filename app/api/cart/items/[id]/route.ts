import { NextRequest, NextResponse } from "next/server";
import { removeFromCart } from "@/lib/inventory";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "cart_token is required" }, { status: 400 });

  const id = Number((await params).id);
  const result = removeFromCart(id, token);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
