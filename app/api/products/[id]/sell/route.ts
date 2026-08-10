import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminGuard";
import { decrementForLivestreamSale, getProduct } from "@/lib/inventory";

/** Admin marks one piece sold directly (e.g. during a livestream), bypassing the reservation flow. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number((await params).id);
  const existing = await getProduct(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.quantity_available <= 0) {
    return NextResponse.json({ error: "Already sold out" }, { status: 400 });
  }

  const product = await decrementForLivestreamSale(id);
  return NextResponse.json({ product });
}
