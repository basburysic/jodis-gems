"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatPrice, CATEGORY_LABEL } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

function NewProductForm({ onCreated }: { onCreated: (p: Product) => void }) {
  const [category, setCategory] = useState<Category>("paparazzi");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("8");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const price_cents = Math.round(parseFloat(price) * 100);
      if (!name.trim() || !Number.isFinite(price_cents) || price_cents <= 0) {
        setError("Name and a valid price are required");
        return;
      }
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          name: name.trim(),
          price_cents,
          description,
          quantity_available: Math.max(0, parseInt(quantity, 10) || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create product");
        return;
      }
      onCreated(data.product);
      setName("");
      setPrice(category === "paparazzi" ? "8" : "");
      setQuantity("1");
      setDescription("");
    } finally {
      setSaving(false);
    }
  }

  const labelClass = "text-xs font-semibold uppercase tracking-wide text-white/50";
  const inputClass =
    "mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--hot-pink)]";

  return (
    <form onSubmit={submit} className="glow-card mb-6 rounded-2xl p-5">
      <h3 className="mb-3 font-bold text-white/80">Add a piece</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Collection</span>
          <select
            value={category}
            onChange={(e) => {
              const c = e.target.value as Category;
              setCategory(c);
              if (c === "paparazzi" && !price) setPrice("8");
            }}
            className={inputClass}
          >
            <option value="paparazzi">Paparazzi</option>
            <option value="bomb_party">BOMB Party</option>
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Piece name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pink Rhinestone Necklace"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Price — dollar amount ($)</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            placeholder="8.00"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Quantity — how many you have</span>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            type="number"
            min="0"
            placeholder="1"
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Description (optional)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any extra details shoppers should see"
            className={inputClass}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="btn-primary mt-4 rounded-full px-5 py-2 text-sm font-bold disabled:opacity-50"
      >
        {saving ? "Adding…" : "Add to inventory"}
      </button>
    </form>
  );
}

function ProductRow({
  product,
  onChange,
  onRemove,
}: {
  product: Product;
  onChange: (p: Product) => void;
  onRemove: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) onChange(data.product);
    } finally {
      setBusy(false);
    }
  }

  async function sellOne() {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}/sell`, { method: "POST" });
      const data = await res.json();
      if (res.ok) onChange(data.product);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Remove "${product.name}" from the shop entirely?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (res.ok) onRemove(product.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glow-card flex flex-wrap items-center gap-4 rounded-xl p-3">
      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-black/40">
        {product.image_path ? (
          <Image src={product.image_path} alt={product.name} fill className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-xl opacity-40">💍</span>
        )}
      </div>

      <div className="min-w-[10rem] flex-1">
        <p className="font-semibold">{product.name}</p>
        <p className="text-xs text-white/40">
          {CATEGORY_LABEL[product.category]} · {formatPrice(product.price_cents)}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/40">Qty</span>
        <button
          disabled={busy || product.quantity_available <= 0}
          onClick={() => patch({ quantity_available: product.quantity_available - 1 })}
          aria-label={`Decrease ${product.name} quantity`}
          className="h-8 w-8 rounded-full border border-white/20 text-white/70 hover:border-white/40 disabled:opacity-30"
        >
          −
        </button>
        <span className="w-8 text-center font-bold">{product.quantity_available}</span>
        <button
          disabled={busy}
          onClick={() => patch({ quantity_available: product.quantity_available + 1 })}
          aria-label={`Increase ${product.name} quantity`}
          className="h-8 w-8 rounded-full border border-white/20 text-white/70 hover:border-white/40 disabled:opacity-30"
        >
          +
        </button>
      </div>

      <button
        disabled={busy || product.quantity_available <= 0}
        onClick={sellOne}
        title="Mark one sold instantly (livestream sale)"
        className="btn-primary rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-40"
      >
        Sold on live −1
      </button>

      <button
        disabled={busy}
        onClick={() => patch({ active: product.active ? 0 : 1 })}
        className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/60 hover:border-white/40"
      >
        {product.active ? "Hide" : "Unhide"}
      </button>

      <button
        disabled={busy}
        onClick={remove}
        className="rounded-full border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:border-red-500/60"
      >
        Delete
      </button>
    </div>
  );
}

export default function InventoryManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const router = useRouter();

  function handleChange(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    router.refresh();
  }

  function handleRemove(id: number) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  function handleCreated(p: Product) {
    setProducts((prev) => [...prev, p]);
    router.refresh();
  }

  const groups: Category[] = ["paparazzi", "bomb_party"];

  return (
    <div>
      <NewProductForm onCreated={handleCreated} />
      {groups.map((category) => {
        const items = products.filter((p) => p.category === category);
        if (items.length === 0) return null;
        return (
          <div key={category} className="mb-6">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-white/50">
              {CATEGORY_LABEL[category]}
            </h3>
            <div className="space-y-2">
              {items.map((p) => (
                <ProductRow key={p.id} product={p} onChange={handleChange} onRemove={handleRemove} />
              ))}
            </div>
          </div>
        );
      })}
      {products.length === 0 && (
        <p className="text-sm text-white/40">No products yet — add your first piece above.</p>
      )}
    </div>
  );
}
