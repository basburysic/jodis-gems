import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "jodis-gems.db");

declare global {
  // eslint-disable-next-line no-var
  var __jodisGemsDb: Database.Database | undefined;
}

const db = global.__jodisGemsDb ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") global.__jodisGemsDb = db;

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK (category IN ('paparazzi','bomb_party')),
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    description TEXT DEFAULT '',
    image_path TEXT DEFAULT '',
    quantity_available INTEGER NOT NULL DEFAULT 0,
    venmo_username TEXT DEFAULT '',
    square_link TEXT DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_name TEXT NOT NULL DEFAULT '',
    buyer_address TEXT NOT NULL DEFAULT '',
    payment_method TEXT NOT NULL CHECK (payment_method IN ('venmo','square')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name_snapshot TEXT NOT NULL,
    price_cents_snapshot INTEGER NOT NULL,
    cart_token TEXT NOT NULL,
    order_id INTEGER REFERENCES orders(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','expired')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reservations_cart_token ON reservations (cart_token);
  CREATE INDEX IF NOT EXISTS idx_reservations_order_id ON reservations (order_id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
`);

const defaultSettings: Record<string, string> = {
  venmo_username: "",
  square_link: "",
};
const insertSetting = db.prepare(
  "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
);
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSetting.run(key, value);
}

export default db;
