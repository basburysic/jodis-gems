"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
      }}
      className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/70 hover:border-white/40"
    >
      Log out
    </button>
  );
}
