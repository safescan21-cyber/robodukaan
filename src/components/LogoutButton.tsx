"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export function LogoutButton({ className, label = "Log out", icon = true }: { className?: string; label?: string; icon?: boolean }) {
  const { signOut } = useAuth();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        router.replace("/");
        router.refresh();
      }}
      className={className ?? "flex shrink-0 items-center gap-3 rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"}
    >
      {icon && <span aria-hidden="true">🚪</span>}
      {label}
    </button>
  );
}
