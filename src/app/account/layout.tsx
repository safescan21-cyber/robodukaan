"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { SideNav } from "@/components/SideNav";
import { LogoutButton } from "@/components/LogoutButton";

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
