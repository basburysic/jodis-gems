import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ProductGrid from "@/components/ProductGrid";
import { listProducts } from "@/lib/inventory";
import { CATEGORY_LABEL } from "@/lib/format";
import type { Category } from "@/lib/types";

export default async function ShopCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (category !== "paparazzi" && category !== "bomb_party") {
    notFound();
  }

  const products = await listProducts(category as Category);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-black gradient-text">{CATEGORY_LABEL[category]}</h1>
        <p className="mt-1 text-white/60">
          {category === "paparazzi" ? "Every piece is a flat $8." : "Priced individually."}
        </p>
        <div className="mt-8">
          <ProductGrid initialProducts={products} category={category as Category} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
