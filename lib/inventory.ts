import { getDb } from "@/lib/db";
import { CATEGORY_LABEL } from "@/lib/format";
import type {
  CartItem,
  Category,
  Order,
  OrderWithItems,
  PaymentMethod,
  Product,
  Reservation,
} from "@/lib/types";

const RESERVATION_HOLD_HOURS = 24;

/** Expires any pending hold past its 24h window and restores stock. Call before any read/write that touches inventory. */
export async function sweepExpiredReservations() {
  const db = await getDb();
  const { results: expired } = await db
    .prepare(`SELECT * FROM reservations WHERE status = 'pending' AND expires_at <= datetime('now')`)
    .all<Reservation>();

  if (expired.length === 0) return;

  const expireStmt = db.prepare(`UPDATE reservations SET status = 'expired' WHERE id = ?`);
  const restoreStmt = db.prepare(
    `UPDATE products SET quantity_available = quantity_available + 1 WHERE id = ?`
  );

  await db.batch(
    expired.flatMap((r) => [expireStmt.bind(r.id), restoreStmt.bind(r.product_id)])
  );
}

export async function listProducts(category?: Category): Promise<Product[]> {
  await sweepExpiredReservations();
  const db = await getDb();
  if (category) {
    const { results } = await db
      .prepare(`SELECT * FROM products WHERE category = ? AND active = 1 ORDER BY name`)
      .bind(category)
      .all<Product>();
    return results;
  }
  const { results } = await db
    .prepare(`SELECT * FROM products WHERE active = 1 ORDER BY category, name`)
    .all<Product>();
  return results;
}

export async function listAllProductsForAdmin(): Promise<Product[]> {
  await sweepExpiredReservations();
  const db = await getDb();
  const { results } = await db
    .prepare(`SELECT * FROM products ORDER BY category, name`)
    .all<Product>();
  return results;
}

export async function getProduct(id: number): Promise<Product | undefined> {
  const db = await getDb();
  const row = await db.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first<Product>();
  return row ?? undefined;
}

export async function createProduct(input: {
  category: Category;
  name: string;
  price_cents: number;
  description?: string;
  image_path?: string;
  quantity_available: number;
  venmo_username?: string;
  square_link?: string;
}): Promise<Product> {
  const db = await getDb();
  const row = await db
    .prepare(
      `INSERT INTO products (category, name, price_cents, description, image_path, quantity_available, venmo_username, square_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(
      input.category,
      input.name,
      input.price_cents,
      input.description ?? "",
      input.image_path ?? "",
      input.quantity_available,
      input.venmo_username ?? "",
      input.square_link ?? ""
    )
    .first<Product>();
  return row!;
}

export async function updateProduct(
  id: number,
  patch: Partial<
    Pick<
      Product,
      | "name"
      | "price_cents"
      | "description"
      | "image_path"
      | "quantity_available"
      | "venmo_username"
      | "square_link"
      | "active"
      | "category"
    >
  >
): Promise<Product | undefined> {
  const existing = await getProduct(id);
  if (!existing) return undefined;
  const merged = { ...existing, ...patch };
  const db = await getDb();
  await db
    .prepare(
      `UPDATE products SET category=?, name=?, price_cents=?, description=?,
       image_path=?, quantity_available=?, venmo_username=?, square_link=?, active=? WHERE id=?`
    )
    .bind(
      merged.category,
      merged.name,
      merged.price_cents,
      merged.description,
      merged.image_path,
      merged.quantity_available,
      merged.venmo_username,
      merged.square_link,
      merged.active,
      id
    )
    .run();
  return getProduct(id);
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  await db.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
}

/** Manual livestream sale: remove one piece from stock without going through the cart/checkout flow. */
export async function decrementForLivestreamSale(id: number): Promise<Product | undefined> {
  const product = await getProduct(id);
  if (!product || product.quantity_available <= 0) return product;
  const db = await getDb();
  await db
    .prepare(`UPDATE products SET quantity_available = quantity_available - 1 WHERE id = ?`)
    .bind(id)
    .run();
  return getProduct(id);
}

export async function setQuantity(id: number, quantity: number): Promise<Product | undefined> {
  const db = await getDb();
  await db
    .prepare(`UPDATE products SET quantity_available = ? WHERE id = ?`)
    .bind(Math.max(0, quantity), id)
    .run();
  return getProduct(id);
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

/** Category of whatever's currently sitting in this cart, or null if it's empty. Paparazzi and BOMB Party can never share a cart or order. */
export async function getCartCategory(cartToken: string): Promise<Category | null> {
  await sweepExpiredReservations();
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT p.category AS category
       FROM reservations r
       JOIN products p ON p.id = r.product_id
       WHERE r.cart_token = ? AND r.order_id IS NULL AND r.status = 'pending'
       LIMIT 1`
    )
    .bind(cartToken)
    .first<{ category: Category }>();
  return row?.category ?? null;
}

/** Adds one unit of a product to a shopper's cart and holds it for RESERVATION_HOLD_HOURS. */
export async function addToCart(input: {
  product_id: number;
  cart_token: string;
}): Promise<{ reservation: Reservation } | { error: string; reason?: "category_mismatch" }> {
  await sweepExpiredReservations();
  const product = await getProduct(input.product_id);
  if (!product || !product.active) return { error: "Product not found" };
  if (product.quantity_available <= 0) return { error: "Sold out" };

  const currentCategory = await getCartCategory(input.cart_token);
  if (currentCategory && currentCategory !== product.category) {
    return {
      error: `Your cart already has ${CATEGORY_LABEL[currentCategory]} pieces, which can't be checked out together with this. Clear your cart first.`,
      reason: "category_mismatch",
    };
  }

  const db = await getDb();
  const [, insertResult] = await db.batch<Reservation>([
    db
      .prepare(`UPDATE products SET quantity_available = quantity_available - 1 WHERE id = ?`)
      .bind(product.id),
    db
      .prepare(
        `INSERT INTO reservations
          (product_id, product_name_snapshot, price_cents_snapshot, cart_token, expires_at)
         VALUES (?, ?, ?, ?, datetime('now', '+${RESERVATION_HOLD_HOURS} hours'))
         RETURNING *`
      )
      .bind(product.id, product.name, product.price_cents, input.cart_token),
  ]);

  return { reservation: insertResult.results[0] };
}

export async function getCart(cartToken: string): Promise<CartItem[]> {
  await sweepExpiredReservations();
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT r.id AS reservation_id, r.product_id, r.product_name_snapshot AS name,
              r.price_cents_snapshot AS price_cents, p.image_path, r.expires_at
       FROM reservations r
       LEFT JOIN products p ON p.id = r.product_id
       WHERE r.cart_token = ? AND r.order_id IS NULL AND r.status = 'pending'
       ORDER BY r.id`
    )
    .bind(cartToken)
    .all<CartItem>();
  return results;
}

/** Removes a single held unit from a shopper's cart (must not have been checked out yet). */
export async function removeFromCart(
  reservationId: number,
  cartToken: string
): Promise<{ ok: true } | { error: string }> {
  const db = await getDb();
  const reservation = await db
    .prepare(`SELECT * FROM reservations WHERE id = ?`)
    .bind(reservationId)
    .first<Reservation>();
  if (!reservation || reservation.cart_token !== cartToken || reservation.order_id !== null) {
    return { error: "Not found in your cart" };
  }
  if (reservation.status !== "pending") return { ok: true };

  await db.batch([
    db.prepare(`UPDATE reservations SET status = 'cancelled' WHERE id = ?`).bind(reservationId),
    db
      .prepare(`UPDATE products SET quantity_available = quantity_available + 1 WHERE id = ?`)
      .bind(reservation.product_id),
  ]);
  return { ok: true };
}

/** Empties a shopper's cart (e.g. to switch from Paparazzi to BOMB Party or vice versa), restoring stock for every held unit. */
export async function clearCart(cartToken: string) {
  const db = await getDb();
  const { results: rows } = await db
    .prepare(
      `SELECT * FROM reservations WHERE cart_token = ? AND order_id IS NULL AND status = 'pending'`
    )
    .bind(cartToken)
    .all<Reservation>();

  if (rows.length === 0) return;

  const cancelStmt = db.prepare(`UPDATE reservations SET status = 'cancelled' WHERE id = ?`);
  const restoreStmt = db.prepare(
    `UPDATE products SET quantity_available = quantity_available + 1 WHERE id = ?`
  );
  await db.batch(rows.flatMap((r) => [cancelStmt.bind(r.id), restoreStmt.bind(r.product_id)]));
}

// ---------------------------------------------------------------------------
// Checkout / Orders
// ---------------------------------------------------------------------------

export async function checkout(input: {
  cart_token: string;
  buyer_name: string;
  buyer_address: string;
  payment_method: PaymentMethod;
}): Promise<{ order: OrderWithItems } | { error: string }> {
  await sweepExpiredReservations();
  const db = await getDb();
  const { results: items } = await db
    .prepare(
      `SELECT * FROM reservations WHERE cart_token = ? AND order_id IS NULL AND status = 'pending'`
    )
    .bind(input.cart_token)
    .all<Reservation>();

  if (items.length === 0) return { error: "Your cart is empty" };
  if (!input.buyer_name.trim()) return { error: "Name is required" };
  if (!input.buyer_address.trim()) return { error: "Address is required" };

  // Not batched with the attach step below: the order's id doesn't exist until
  // this insert returns, and D1 batches can't feed one statement's output into
  // the next. Worst case on a mid-request failure is a harmless orphan order
  // row with no items — inventory counts are unaffected either way.
  const order = await db
    .prepare(
      `INSERT INTO orders (buyer_name, buyer_address, payment_method) VALUES (?, ?, ?) RETURNING *`
    )
    .bind(input.buyer_name.trim(), input.buyer_address.trim(), input.payment_method)
    .first<Order>();
  const orderId = order!.id;

  const attach = db.prepare(`UPDATE reservations SET order_id = ? WHERE id = ?`);
  await db.batch(items.map((item) => attach.bind(orderId, item.id)));

  return { order: (await getOrder(orderId))! };
}

function rowsToOrder(order: Order, rows: Reservation[]): OrderWithItems {
  const total_cents = rows.reduce((sum, r) => sum + r.price_cents_snapshot, 0);
  const anyPending = rows.some((r) => r.status === "pending");
  const anyConfirmed = rows.some((r) => r.status === "confirmed");
  const pendingExpiries = rows.filter((r) => r.status === "pending").map((r) => r.expires_at);
  return {
    ...order,
    items: rows.map((r) => ({
      reservation_id: r.id,
      product_name_snapshot: r.product_name_snapshot,
      price_cents_snapshot: r.price_cents_snapshot,
      expires_at: r.expires_at,
    })),
    total_cents,
    status: anyPending ? "pending" : anyConfirmed ? "confirmed" : "cancelled",
    earliest_expires_at: pendingExpiries.length > 0 ? pendingExpiries.sort()[0] : null,
  };
}

export async function getOrder(orderId: number): Promise<OrderWithItems | undefined> {
  const db = await getDb();
  const order = await db.prepare(`SELECT * FROM orders WHERE id = ?`).bind(orderId).first<Order>();
  if (!order) return undefined;
  const { results: rows } = await db
    .prepare(`SELECT * FROM reservations WHERE order_id = ? ORDER BY id`)
    .bind(orderId)
    .all<Reservation>();
  return rowsToOrder(order, rows);
}

export async function listOrders(): Promise<OrderWithItems[]> {
  await sweepExpiredReservations();
  const db = await getDb();
  const { results: orders } = await db
    .prepare(`SELECT * FROM orders ORDER BY created_at DESC`)
    .all<Order>();

  const results: OrderWithItems[] = [];
  for (const order of orders) {
    const { results: rows } = await db
      .prepare(`SELECT * FROM reservations WHERE order_id = ? ORDER BY id`)
      .bind(order.id)
      .all<Reservation>();
    results.push(rowsToOrder(order, rows));
  }
  return results;
}

export async function confirmOrder(orderId: number): Promise<OrderWithItems | undefined> {
  const db = await getDb();
  await db
    .prepare(`UPDATE reservations SET status = 'confirmed' WHERE order_id = ? AND status = 'pending'`)
    .bind(orderId)
    .run();
  return getOrder(orderId);
}

/** Cancels an order's still-pending items and restores their stock. */
export async function cancelOrder(orderId: number): Promise<OrderWithItems | undefined> {
  const db = await getDb();
  const { results: rows } = await db
    .prepare(`SELECT * FROM reservations WHERE order_id = ? AND status = 'pending'`)
    .bind(orderId)
    .all<Reservation>();

  if (rows.length > 0) {
    const cancelStmt = db.prepare(`UPDATE reservations SET status = 'cancelled' WHERE id = ?`);
    const restoreStmt = db.prepare(
      `UPDATE products SET quantity_available = quantity_available + 1 WHERE id = ?`
    );
    await db.batch(rows.flatMap((r) => [cancelStmt.bind(r.id), restoreStmt.bind(r.product_id)]));
  }
  return getOrder(orderId);
}

export const RESERVATION_HOLD_HOURS_EXPORT = RESERVATION_HOLD_HOURS;
