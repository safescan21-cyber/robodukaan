"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/client";
import { getSupabase } from "@/lib/supabase-browser";
import { useAuth } from "./AuthProvider";

type WishlistContextValue = {
  ids: Set<string>;
  count: number;
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear on sign-out
      setIds(new Set());
      return;
    }
    getSupabase()
      .from("wishlist")
      .select("product_id")
      .then(({ data }) => {
        if (active) setIds(new Set((data ?? []).map((r) => r.product_id as string)));
      });
    return () => {
      active = false;
    };
  }, [user]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const supabase = getSupabase();
      const had = ids.has(productId);
      setIds((cur) => {
        const next = new Set(cur);
        if (had) next.delete(productId);
        else next.add(productId);
        return next;
      });
      const { error } = had
        ? await supabase.from("wishlist").delete().eq("product_id", productId).eq("user_id", user.id)
        : await supabase.from("wishlist").insert({ product_id: productId, user_id: user.id });
      if (error) {
        setIds((cur) => {
          const next = new Set(cur);
          if (had) next.add(productId);
          else next.delete(productId);
          return next;
        });
      }
    },
    [user, ids, router],
  );

  const value = useMemo(
    () => ({ ids, count: ids.size, has: (id: string) => ids.has(id), toggle }),
    [ids, toggle],
  );
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
