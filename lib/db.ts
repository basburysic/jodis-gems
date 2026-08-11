import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

// Async mode, not the sync default: sync mode throws if Next.js tries to
// statically pre-render a route at build time (there's no live Cloudflare
// context to read then). Every page here shows live inventory anyway, so
// they're also marked `export const dynamic = "force-dynamic"` — this is
// belt-and-suspenders against that same build-time prerender attempt.

/** The D1 database binding for the current request. Only callable within a request (route handler or server component). */
export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

/** The R2 bucket binding for uploaded product photos. */
export async function getUploadsBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  return env.UPLOADS;
}
