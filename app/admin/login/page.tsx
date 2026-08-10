"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed");
        return;
      }
      router.push("/admin/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="glow-card w-full max-w-sm rounded-2xl p-8"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
          Admin sign in
        </p>
        <h1 className="mt-1 text-2xl font-black gradient-text">Jodi&apos;s Gems</h1>

        <input
          type="password"
          autoFocus
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-6 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-[var(--hot-pink)]"
        />

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !password}
          className="btn-primary mt-5 w-full rounded-full py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <Link
          href="/"
          className="mt-4 block text-center text-xs text-white/40 hover:text-white/70"
        >
          ← Back to shop
        </Link>
      </form>
    </div>
  );
}
