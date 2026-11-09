"use client";

import { Suspense } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { SideNav } from "@/components/SideNav";
import { LogoutButton } from "@/components/LogoutButton";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/orders", label: "Orders", icon: "📦" },
  { href: "/admin/sales-by-area", label: "Sales by area", icon: "🗺️" },
  { href: "/admin/repairs", label: "PCB repairs", icon: "🔧" },
  { href: "/admin/quotes", label: "Bulk quotes", icon: "📑" },
  { href: "/admin/partners", label: "Partners", icon: "🤝" },
  { href: "/admin/vendors", label: "Vendors", icon: "🏭" },
  { href: "/admin/case-studies", label: "Case studies", icon: "📝" },
  { href: "/admin/visitors", label: "Visitors", icon: "👥" },
  { href: "/admin/interested", label: "Interested customers", icon: "🎯" },
  { href: "/admin/server", label: "Server move", icon: "🖥️" },
  { href: "/admin/health", label: "Site health", icon: "🩺" },
  { href: "/admin/products", label: "Products", icon: "🧩" },
  { href: "/admin/categories", label: "Categories", icon: "🗂️" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/coupons", label: "Coupons", icon: "🏷️" },
  { href: "/admin/reviews", label: "Reviews", icon: "⭐" },
  { href: "/admin/banners", label: "Home banners", icon: "🖼️" },
  { href: "/admin/jobs", label: "Jobs", icon: "💼" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth admin>
      <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 print:block print:p-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="print:hidden"><Suspense fallback={<div className="h-64 rounded-md bg-white ring-1 ring-slate-200" />}>
          <SideNav
          title="Admin panel"
          items={ITEMS}
          footer={<><Link href="/" className="flex shrink-0 items-center gap-3 rounded px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"><span aria-hidden="true">🏪</span>View store</Link><LogoutButton /></>}
        />
        </Suspense></div>
        <div className="min-w-0">{children}</div>
      </div>
    </RequireAuth>
  );
}
