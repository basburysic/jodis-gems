import { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}
