import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminGuard";

export async function GET(req: NextRequest) {
  return NextResponse.json({ authed: await isAdminRequest(req) });
}
