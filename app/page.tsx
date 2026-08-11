import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { listProducts } from "@/lib/inventory";

// Always live — stock counts must never be baked in at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const paparazzi = await listProducts("paparazzi");
  const bombParty = await listProducts("bomb_party");

  const paparazziCount = paparazzi.reduce((sum, p) => sum + p.quantity_available, 0);
  const bombPartyCount = bombParty.reduce((sum, p) => sum + p.quantity_available, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="sparkle fixed inset-0 -z-10" />
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-16 text-center">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-[var(--gold)]">
          Shop live inventory
        </p>
        <h1 className="max-w-2xl text-5xl font-black leading-tight sm:text-6xl">
          <span className="gradient-text">Jodi&apos;s Gems</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/70">
          Sparkly jewelry, first come first served. Pick a collection below — when it&apos;s
          gone, it&apos;s gone.
        </p>

        <div className="mt-14 grid w-full gap-8 sm:grid-cols-2">
          <Link
            href="/shop/paparazzi"
            className="glow-card group flex flex-col items-center rounded-2xl p-10"
          >
            <span className="text-4xl">💎</span>
            <h2 className="mt-4 text-2xl font-black gradient-text">Paparazzi</h2>
            <p className="mt-2 text-white/60">Every piece is a flat $8</p>
            <p className="mt-6 text-sm font-semibold badge-available rounded-full px-4 py-1">
              {paparazziCount} piece{paparazziCount === 1 ? "" : "s"} available
            </p>
          </Link>

          <Link
            href="/shop/bomb_party"
            className="glow-card group flex flex-col items-center rounded-2xl p-10"
          >
            <span className="text-4xl">✨</span>
            <h2 className="mt-4 text-2xl font-black gradient-text">BOMB Party</h2>
            <p className="mt-2 text-white/60">Priced individually</p>
            <p className="mt-6 text-sm font-semibold badge-available rounded-full px-4 py-1">
              {bombPartyCount} piece{bombPartyCount === 1 ? "" : "s"} available
            </p>
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
