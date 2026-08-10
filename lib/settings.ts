import db from "@/lib/db";

export interface Settings {
  venmo_username: string;
  square_link: string;
}

export function getSettings(): Settings {
  const rows = db.prepare(`SELECT key, value FROM settings`).all() as {
    key: string;
    value: string;
  }[];
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    venmo_username: map.venmo_username ?? "",
    square_link: map.square_link ?? "",
  };
}

export function updateSettings(patch: Partial<Settings>) {
  const stmt = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    stmt.run(key, value);
  }
  return getSettings();
}
