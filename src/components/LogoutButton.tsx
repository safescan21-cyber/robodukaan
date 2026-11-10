"use client";

import { useI18n } from "@/i18n/client";
import { useAuth } from "./AuthProvider";

export function LogoutButton({ className, label, icon = true }: { className?: string; label?: string; icon?: boolean }) {
  const { signOut } = useAuth();
  const { t, href } = useI18n();
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        // Full page load: clears everything the admin/account pages had in memory, lands on the home page.
        window.location.replace(href("/"));
      }}
      className={className ?? "flex shrink-0 items-center gap-3 rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"}
    >
      {icon && <span aria-hidden="true">🚪</span>}
      {label ?? t("auth.logout")}
    </button>
  );
}
