import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

/** The D1 database binding for the current request. Only callable within a request (route handler or server component). */
export function getDb(): D1Database {
  return getCloudflareContext().env.DB;
}

/** The R2 bucket binding for uploaded product photos. */
export function getUploadsBucket(): R2Bucket {
  return getCloudflareContext().env.UPLOADS;
}
