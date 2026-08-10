"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import type { OrderWithItems } from "@/lib/types";

function timeLeft(expiresAt: string) {
  const ms = new Date(expiresAt + "Z").getTime() - Date.now();
  if (ms <= 0) return "expiring…";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m left`;
}

export default function OrdersQueue({ initialOrders }: { initialOrders: OrderWithItems[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [showHistory, setShowHistory] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const router = useRouter();

  const pending = orders.filter((o) => o.status === "pending");
  const history = orders.filter((o) => o.status !== "pending").slice(0, 30);

  async function act(id: number, action: "confirm" | "cancel") {
    setBusyId(id);
    try {
      await fetch(`/api/orders/${id}/${action}`, { method: "POST" });
      setOrders((prev) => prev.filter((o) => o.id !== id));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {pending.length === 0 ? (
        <p className="text-sm text-white/40">No orders waiting on payment right now.</p>
      ) : (
        pending.map((order) => (
          <div key={order.id} className="glow-card rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  Order #{order.id} — {order.buyer_name || "No name given"}
                </p>
                <p className="text-sm text-white/50">{order.buyer_address || "No address given"}</p>
                <p className="text-sm text-white/50">
                  via {order.payment_method === "venmo" ? "Venmo" : "Square"}
                  {order.earliest_expires_at && ` · ${timeLeft(order.earliest_expires_at)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busyId === order.id}
                  onClick={() => act(order.id, "confirm")}
                  className="btn-primary rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-50"
                >
                  Confirm paid
                </button>
                <button
                  disabled={busyId === order.id}
                  onClick={() => act(order.id, "cancel")}
                  className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/70 hover:border-white/40 disabled:opacity-50"
                >
                  Release
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm text-white/70">
              {order.items.map((item) => (
                <div key={item.reservation_id} className="flex justify-between">
                  <span>{item.product_name_snapshot}</span>
                  <span>{formatPrice(item.price_cents_snapshot)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-white/10 pt-1 font-bold text-white">
                <span>Total</span>
                <span>{formatPrice(order.total_cents)}</span>
              </div>
            </div>
          </div>
        ))
      )}

      {history.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs font-semibold text-white/40 hover:text-white/70"
          >
            {showHistory ? "Hide" : "Show"} recent order history ({history.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {history.map((order) => (
                <div key={order.id} className="flex justify-between text-xs text-white/40">
                  <span>
                    Order #{order.id} — {order.buyer_name || "No name"} —{" "}
                    {formatPrice(order.total_cents)}
                  </span>
                  <span className="capitalize">{order.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
