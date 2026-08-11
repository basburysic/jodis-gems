import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export default async function AdminIndexPage() {
  const jar = await cookies();
  const authed = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  redirect(authed ? "/admin/dashboard" : "/admin/login");
}
