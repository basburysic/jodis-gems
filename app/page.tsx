import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ProductGrid from "@/components/ProductGrid";
import { listProducts } from "@/lib/inventory";

// Always live — stock counts must never be baked in at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await listProducts("paparazzi");

  return (
    <div className="flex min-h-screen flex-col">
      <div className="sparkle fixed inset-0 -z-10" />
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
        <div className="text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-[var(--gold)]">
            Shop live inventory
          </p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            <span className="gradient-text">Jodi&apos;s Gems</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Every piece is a flat $8, first come first served — when it&apos;s gone,
            it&apos;s gone.
          </p>
        </div>

        <div className="mt-10">
          <ProductGrid initialProducts={products} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
