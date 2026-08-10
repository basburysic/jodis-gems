import { NextRequest, NextResponse } from "next/server";
import { checkout } from "@/lib/inventory";
import type { PaymentMethod } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cart_token, buyer_name, buyer_address, payment_method } = body ?? {};

  if (typeof cart_token !== "string" || !cart_token) {
    return NextResponse.json({ error: "cart_token is required" }, { status: 400 });
  }
  if (payment_method !== "venmo" && payment_method !== "square") {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  const result = checkout({
    cart_token,
    buyer_name: typeof buyer_name === "string" ? buyer_name : "",
    buyer_address: typeof buyer_address === "string" ? buyer_address : "",
    payment_method: payment_method as PaymentMethod,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ order: result.order }, { status: 201 });
}
