import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminGuard";
import { getSettings, updateSettings } from "@/lib/settings";

// GET is public: the storefront needs the default Venmo/Square payment handles
// to build "pay" links even for signed-out shoppers.
export async function GET() {
  return NextResponse.json({ settings: getSettings() });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const settings = updateSettings({
    venmo_username: typeof body.venmo_username === "string" ? body.venmo_username : undefined,
    square_link: typeof body.square_link === "string" ? body.square_link : undefined,
  });
  return NextResponse.json({ settings });
}
