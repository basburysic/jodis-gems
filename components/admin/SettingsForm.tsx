"use client";

import { useState } from "react";
import type { Settings } from "@/lib/settings";

export default function SettingsForm({ initialSettings }: { initialSettings: Settings }) {
  const [venmo, setVenmo] = useState(initialSettings.venmo_username);
  const [square, setSquare] = useState(initialSettings.square_link);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venmo_username: venmo, square_link: square }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="glow-card space-y-4 rounded-2xl p-5">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
          Venmo username
        </label>
        <input
          value={venmo}
          onChange={(e) => setVenmo(e.target.value)}
          placeholder="@your-venmo"
          className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--hot-pink)]"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
          Square payment link
        </label>
        <input
          value={square}
          onChange={(e) => setSquare(e.target.value)}
          placeholder="https://square.link/u/..."
          className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--hot-pink)]"
        />
        <p className="mt-1 text-xs text-white/35">
          Create a free Square Checkout Link from your Square Dashboard (no API keys needed) and
          paste it here. Individual products can override this with their own link.
        </p>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="btn-primary rounded-full px-5 py-2 text-sm font-bold disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
      </button>
    </div>
  );
}
