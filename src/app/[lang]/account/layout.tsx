"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { SideNav } from "@/components/SideNav";
import { useI18n } from "@/i18n/client";
import { LogoutButton } from "@/components/LogoutButton";

const ITEMS = [
  { href: "/account", label: "account.dashboard", icon: "🏠", exact: true },
  { href: "/account/orders", label: "account.orders", icon: "📦" },
  { href: "/account/repairs", label: "account.pcbRepairs", icon: "🔧" },
  { href: "/account/addresses", label: "account.addressesShort", icon: "📍" },
  { href: "/wishlist", label: "nav.wishlist", icon: "❤️" },
  { href: "/account/profile", label: "account.details", icon: "👤" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <RequireAuth>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[230px_1fr]">
        <Suspense fallback={<div className="h-64 rounded-md bg-white ring-1 ring-slate-200" />}>
          <SideNav title={t("account.my")} items={ITEMS.map((i) => ({ ...i, label: t(i.label) }))} footer={<LogoutButton />} />
        </Suspense>
        <div className="min-w-0">{children}</div>
      </div>
    </RequireAuth>
  );
}
