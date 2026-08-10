export type Category = "paparazzi" | "bomb_party";

export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "expired";

export type PaymentMethod = "venmo" | "square";

export type OrderStatus = "pending" | "confirmed" | "cancelled";

export interface Product {
  id: number;
  category: Category;
  name: string;
  price_cents: number;
  description: string;
  image_path: string;
  quantity_available: number;
  venmo_username: string;
  square_link: string;
  active: number;
  created_at: string;
}

export interface Order {
  id: number;
  buyer_name: string;
  buyer_address: string;
  payment_method: PaymentMethod;
  created_at: string;
}

/** A held unit of stock. Belongs to a cart (order_id null) or a placed order (order_id set). */
export interface Reservation {
  id: number;
  product_id: number;
  product_name_snapshot: string;
  price_cents_snapshot: number;
  cart_token: string;
  order_id: number | null;
  status: ReservationStatus;
  created_at: string;
  expires_at: string;
}

export interface CartItem {
  reservation_id: number;
  product_id: number;
  name: string;
  price_cents: number;
  image_path: string;
  expires_at: string;
}

export interface OrderWithItems extends Order {
  items: {
    reservation_id: number;
    product_name_snapshot: string;
    price_cents_snapshot: number;
    expires_at: string;
  }[];
  total_cents: number;
  status: OrderStatus;
  earliest_expires_at: string | null;
}
