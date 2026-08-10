import { NextRequest, NextResponse } from "next/server";
import { addToCart } from "@/lib/inventory";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { product_id, cart_token } = body ?? {};

  if (!Number.isFinite(product_id)) {
    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  }
  if (typeof cart_token !== "string" || !cart_token) {
    return NextResponse.json({ error: "cart_token is required" }, { status: 400 });
  }

  const result = addToCart({ product_id: Number(product_id), cart_token });
  if ("error" in result) {
    return NextResponse.json({ error: result.error, reason: result.reason }, { status: 409 });
  }
  return NextResponse.json({ reservation: result.reservation }, { status: 201 });
}
