import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminGuard";
import { createProduct, listAllProductsForAdmin, listProducts } from "@/lib/inventory";
import type { Category } from "@/lib/types";

export async function GET(req: NextRequest) {
  const admin = await isAdminRequest(req);
  const category = req.nextUrl.searchParams.get("category") as Category | null;

  const products = admin ? await listAllProductsForAdmin() : await listProducts(category ?? undefined);
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { category, name, price_cents, description, image_path, quantity_available, venmo_username, square_link } =
    body ?? {};

  if (category !== "paparazzi" && category !== "bomb_party") {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof price_cents !== "number" || price_cents <= 0) {
    return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
  }

  const product = await createProduct({
    category,
    name: name.trim(),
    price_cents,
    description,
    image_path,
    quantity_available: Number.isFinite(quantity_available) ? Math.max(0, quantity_available) : 0,
    venmo_username,
    square_link,
  });

  return NextResponse.json({ product }, { status: 201 });
}
