import db from "@/lib/db";
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
export function sweepExpiredReservations() {
  const expired = db
    .prepare(
      `SELECT * FROM reservations WHERE status = 'pending' AND expires_at <= datetime('now')`
    )
    .all() as Reservation[];

  if (expired.length === 0) return;

  const expireStmt = db.prepare(`UPDATE reservations SET status = 'expired' WHERE id = ?`);
  const restoreStmt = db.prepare(
    `UPDATE products SET quantity_available = quantity_available + 1 WHERE id = ?`
  );

  const tx = db.transaction((rows: Reservation[]) => {
    for (const r of rows) {
      expireStmt.run(r.id);
      restoreStmt.run(r.product_id);
    }
  });
  tx(expired);
}

export function listProducts(category?: Category): Product[] {
  sweepExpiredReservations();
  if (category) {
    return db
      .prepare(`SELECT * FROM products WHERE category = ? AND active = 1 ORDER BY name`)
      .all(category) as Product[];
  }
  return db
    .prepare(`SELECT * FROM products WHERE active = 1 ORDER BY category, name`)
    .all() as Product[];
}

export function listAllProductsForAdmin(): Product[] {
  sweepExpiredReservations();
  return db.prepare(`SELECT * FROM products ORDER BY category, name`).all() as Product[];
}

export function getProduct(id: number): Product | undefined {
  return db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as Product | undefined;
}

export function createProduct(input: {
  category: Category;
  name: string;
  price_cents: number;
  description?: string;
  image_path?: string;
  quantity_available: number;
  venmo_username?: string;
  square_link?: string;
}): Product {
  const stmt = db.prepare(`
    INSERT INTO products (category, name, price_cents, description, image_path, quantity_available, venmo_username, square_link)
    VALUES (@category, @name, @price_cents, @description, @image_path, @quantity_available, @venmo_username, @square_link)
  `);
  const result = stmt.run({
    category: input.category,
    name: input.name,
    price_cents: input.price_cents,
    description: input.description ?? "",
    image_path: input.image_path ?? "",
    quantity_available: input.quantity_available,
    venmo_username: input.venmo_username ?? "",
    square_link: input.square_link ?? "",
  });
  return getProduct(Number(result.lastInsertRowid))!;
}

export function updateProduct(
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
): Product | undefined {
  const existing = getProduct(id);
  if (!existing) return undefined;
  const merged = { ...existing, ...patch };
  db.prepare(
    `UPDATE products SET category=@category, name=@name, price_cents=@price_cents, description=@description,
     image_path=@image_path, quantity_available=@quantity_available, venmo_username=@venmo_username,
     square_link=@square_link, active=@active WHERE id=@id`
  ).run({ ...merged, id });
  return getProduct(id);
}

export function deleteProduct(id: number) {
  db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
}

/** Manual livestream sale: remove one piece from stock without going through the cart/checkout flow. */
export function decrementForLivestreamSale(id: number): Product | undefined {
  const product = getProduct(id);
  if (!product || product.quantity_available <= 0) return product;
  db.prepare(
    `UPDATE products SET quantity_available = quantity_available - 1 WHERE id = ?`
  ).run(id);
  return getProduct(id);
}

export function setQuantity(id: number, quantity: number): Product | undefined {
  db.prepare(`UPDATE products SET quantity_available = ? WHERE id = ?`).run(
    Math.max(0, quantity),
    id
  );
  return getProduct(id);
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

/** Category of whatever's currently sitting in this cart, or null if it's empty. Paparazzi and BOMB Party can never share a cart or order. */
export function getCartCategory(cartToken: string): Category | null {
  sweepExpiredReservations();
  const row = db
    .prepare(
      `SELECT p.category AS category
       FROM reservations r
       JOIN products p ON p.id = r.product_id
       WHERE r.cart_token = ? AND r.order_id IS NULL AND r.status = 'pending'
       LIMIT 1`
    )
    .get(cartToken) as { category: Category } | undefined;
  return row?.category ?? null;
}

/** Adds one unit of a product to a shopper's cart and holds it for RESERVATION_HOLD_HOURS. */
export function addToCart(input: {
  product_id: number;
  cart_token: string;
}): { reservation: Reservation } | { error: string; reason?: "category_mismatch" } {
  sweepExpiredReservations();
  const product = getProduct(input.product_id);
  if (!product || !product.active) return { error: "Product not found" };
  if (product.quantity_available <= 0) return { error: "Sold out" };

  const currentCategory = getCartCategory(input.cart_token);
  if (currentCategory && currentCategory !== product.category) {
    return {
      error: `Your cart already has ${CATEGORY_LABEL[currentCategory]} pieces — Paparazzi and BOMB Party have to be checked out separately. Clear your cart to switch collections.`,
      reason: "category_mismatch",
    };
  }

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE products SET quantity_available = quantity_available - 1 WHERE id = ?`
    ).run(product.id);

    const result = db
      .prepare(
        `INSERT INTO reservations
          (product_id, product_name_snapshot, price_cents_snapshot, cart_token, expires_at)
         VALUES (?, ?, ?, ?, datetime('now', '+${RESERVATION_HOLD_HOURS} hours'))`
      )
      .run(product.id, product.name, product.price_cents, input.cart_token);
    return db
      .prepare(`SELECT * FROM reservations WHERE id = ?`)
      .get(result.lastInsertRowid) as Reservation;
  });

  return { reservation: tx() };
}

export function getCart(cartToken: string): CartItem[] {
  sweepExpiredReservations();
  return db
    .prepare(
      `SELECT r.id AS reservation_id, r.product_id, r.product_name_snapshot AS name,
              r.price_cents_snapshot AS price_cents, p.image_path, r.expires_at
       FROM reservations r
       LEFT JOIN products p ON p.id = r.product_id
       WHERE r.cart_token = ? AND r.order_id IS NULL AND r.status = 'pending'
       ORDER BY r.id`
    )
    .all(cartToken) as CartItem[];
}

/** Removes a single held unit from a shopper's cart (must not have been checked out yet). */
export function removeFromCart(
  reservationId: number,
  cartToken: string
): { ok: true } | { error: string } {
  const reservation = db
    .prepare(`SELECT * FROM reservations WHERE id = ?`)
    .get(reservationId) as Reservation | undefined;
  if (!reservation || reservation.cart_token !== cartToken || reservation.order_id !== null) {
    return { error: "Not found in your cart" };
  }
  if (reservation.status !== "pending") return { ok: true };

  const tx = db.transaction(() => {
    db.prepare(`UPDATE reservations SET status = 'cancelled' WHERE id = ?`).run(reservationId);
    db.prepare(
      `UPDATE products SET quantity_available = quantity_available + 1 WHERE id = ?`
    ).run(reservation.product_id);
  });
  tx();
  return { ok: true };
}

/** Empties a shopper's cart (e.g. to switch from Paparazzi to BOMB Party or vice versa), restoring stock for every held unit. */
export function clearCart(cartToken: string) {
  const rows = db
    .prepare(
      `SELECT * FROM reservations WHERE cart_token = ? AND order_id IS NULL AND status = 'pending'`
    )
    .all(cartToken) as Reservation[];

  const tx = db.transaction(() => {
    for (const r of rows) {
      db.prepare(`UPDATE reservations SET status = 'cancelled' WHERE id = ?`).run(r.id);
      db.prepare(
        `UPDATE products SET quantity_available = quantity_available + 1 WHERE id = ?`
      ).run(r.product_id);
    }
  });
  tx();
}

// ---------------------------------------------------------------------------
// Checkout / Orders
// ---------------------------------------------------------------------------

export function checkout(input: {
  cart_token: string;
  buyer_name: string;
  buyer_address: string;
  payment_method: PaymentMethod;
}): { order: OrderWithItems } | { error: string } {
  sweepExpiredReservations();
  const items = db
    .prepare(
      `SELECT * FROM reservations WHERE cart_token = ? AND order_id IS NULL AND status = 'pending'`
    )
    .all(input.cart_token) as Reservation[];

  if (items.length === 0) return { error: "Your cart is empty" };
  if (!input.buyer_name.trim()) return { error: "Name is required" };
  if (!input.buyer_address.trim()) return { error: "Address is required" };

  const orderId = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO orders (buyer_name, buyer_address, payment_method) VALUES (?, ?, ?)`
      )
      .run(input.buyer_name.trim(), input.buyer_address.trim(), input.payment_method);
    const id = Number(result.lastInsertRowid);
    const attach = db.prepare(`UPDATE reservations SET order_id = ? WHERE id = ?`);
    for (const item of items) attach.run(id, item.id);
    return id;
  })();

  return { order: getOrder(orderId)! };
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

export function getOrder(orderId: number): OrderWithItems | undefined {
  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as
    | Order
    | undefined;
  if (!order) return undefined;
  const rows = db
    .prepare(`SELECT * FROM reservations WHERE order_id = ? ORDER BY id`)
    .all(orderId) as Reservation[];
  return rowsToOrder(order, rows);
}

export function listOrders(): OrderWithItems[] {
  sweepExpiredReservations();
  const orders = db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`).all() as Order[];
  return orders.map((order) => {
    const rows = db
      .prepare(`SELECT * FROM reservations WHERE order_id = ? ORDER BY id`)
      .all(order.id) as Reservation[];
    return rowsToOrder(order, rows);
  });
}

export function confirmOrder(orderId: number): OrderWithItems | undefined {
  db.prepare(`UPDATE reservations SET status = 'confirmed' WHERE order_id = ? AND status = 'pending'`).run(
    orderId
  );
  return getOrder(orderId);
}

/** Cancels an order's still-pending items and restores their stock. */
export function cancelOrder(orderId: number): OrderWithItems | undefined {
  const rows = db
    .prepare(`SELECT * FROM reservations WHERE order_id = ? AND status = 'pending'`)
    .all(orderId) as Reservation[];

  const tx = db.transaction(() => {
    for (const r of rows) {
      db.prepare(`UPDATE reservations SET status = 'cancelled' WHERE id = ?`).run(r.id);
      db.prepare(
        `UPDATE products SET quantity_available = quantity_available + 1 WHERE id = ?`
      ).run(r.product_id);
    }
  });
  tx();
  return getOrder(orderId);
}

export const RESERVATION_HOLD_HOURS_EXPORT = RESERVATION_HOLD_HOURS;
