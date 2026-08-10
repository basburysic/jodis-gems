import { NextRequest, NextResponse } from "next/server";
import { getCart, getCartCategory } from "@/lib/inventory";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ items: [], category: null });
  const [items, category] = await Promise.all([getCart(token), getCartCategory(token)]);
  return NextResponse.json({ items, category });
}
