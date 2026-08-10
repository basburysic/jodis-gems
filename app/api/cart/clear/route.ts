import { NextRequest, NextResponse } from "next/server";
import { clearCart } from "@/lib/inventory";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cart_token } = body ?? {};
  if (typeof cart_token !== "string" || !cart_token) {
    return NextResponse.json({ error: "cart_token is required" }, { status: 400 });
  }
  await clearCart(cart_token);
  return NextResponse.json({ ok: true });
}
