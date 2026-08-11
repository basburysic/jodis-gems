import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { listAllProductsForAdmin, listOrders } from "@/lib/inventory";
import { getSettings } from "@/lib/settings";
import InventoryManager from "@/components/admin/InventoryManager";
import OrdersQueue from "@/components/admin/OrdersQueue";
import SettingsForm from "@/components/admin/SettingsForm";
import LogoutButton from "@/components/admin/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const jar = await cookies();
  const authed = verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!authed) redirect("/admin/login");

  const products = await listAllProductsForAdmin();
  const orders = await listOrders();
  const settings = await getSettings();
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
            Admin dashboard
          </p>
          <h1 className="text-2xl font-black gradient-text">Jodi&apos;s Gems</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/70 hover:border-white/40"
          >
            🏠 Home
          </Link>
          <LogoutButton />
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-white/80">
          Orders awaiting payment {pendingCount > 0 && `(${pendingCount})`}
        </h2>
        <p className="mb-3 text-sm text-white/40">
          Each order is a shopper&apos;s full cart, checked out with their name, address, and
          chosen payment method. Confirm once you see the Venmo/Square payment land, or release
          it to put the pieces back on sale. Unconfirmed orders auto-release after 24 hours.
        </p>
        <OrdersQueue initialOrders={orders} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-white/80">Inventory</h2>
        <p className="mb-3 text-sm text-white/40">
          Add pieces, adjust stock, or mark one sold instantly during a livestream.
        </p>
        <InventoryManager initialProducts={products} />
      </section>

      <section className="mt-10 mb-16 max-w-md">
        <h2 className="text-lg font-bold text-white/80">Payment settings</h2>
        <p className="mb-3 text-sm text-white/40">
          Default Venmo handle and Square payment link used at checkout.
        </p>
        <SettingsForm initialSettings={settings} />
      </section>
    </div>
  );
}
