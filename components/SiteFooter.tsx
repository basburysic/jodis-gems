import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 py-6 text-center text-xs text-white/40">
      <p>Payments confirmed by hand — items are held 24 hours after checkout.</p>
      <Link href="/admin" className="mt-2 inline-block text-white/30 hover:text-white/60">
        Admin
      </Link>
    </footer>
  );
}
