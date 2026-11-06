"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { SideNav } from "@/components/SideNav";
import { useAuth } from "@/components/AuthProvider";

const ITEMS = [
  { href: "/account", label: "Dashboard", icon: "🏠", exact: true },
  { href: "/account/orders", label: "My orders", icon: "📦" },
  { href: "/account/repairs", label: "PCB repairs", icon: "🔧" },
  { href: "/account/addresses", label: "Addresses", icon: "📍" },
  { href: "/wishlist", label: "Wishlist", icon: "❤️" },
  { href: "/account/profile", label: "Account details", icon: "👤" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[230px_1fr]">
        <Suspense fallback={<div className="h-64 rounded-md bg-white ring-1 ring-slate-200" />}>
          <SideNav title="My account" items={ITEMS} footer={<LogoutButton />} />
        </Suspense>
        <div className="min-w-0">{children}</div>
      </div>
    </RequireAuth>
  );
}

function LogoutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await signOut();
        router.replace("/");
      }}
      className="flex shrink-0 items-center gap-3 rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
    >
      <span aria-hidden="true">🚪</span>Log out
    </button>
  );
}
