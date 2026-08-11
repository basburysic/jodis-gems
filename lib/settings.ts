import { getDb } from "@/lib/db";

export interface Settings {
  venmo_username: string;
  square_link: string;
}

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const { results } = await db
    .prepare(`SELECT key, value FROM settings`)
    .all<{ key: string; value: string }>();
  const map = Object.fromEntries(results.map((r) => [r.key, r.value]));
  return {
    venmo_username: map.venmo_username ?? "",
    square_link: map.square_link ?? "",
  };
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const db = await getDb();
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length > 0) {
    const stmt = db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    );
    await db.batch(entries.map(([key, value]) => stmt.bind(key, value)));
  }
  return getSettings();
}
