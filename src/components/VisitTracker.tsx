"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";

// Counts visitors for Admin → Visitors and records which products logged-in customers look at
// (database function track_visit, update 020). One id per browser tab session – nothing is kept after
// the tab is closed. Bots and automated browsers are skipped. Failures are silent.
const BOT = /bot|crawl|spider|slurp|lighthouse|headless|preview|monitor/i;

function sessionId() {
  try {
    let id = sessionStorage.getItem("pd_visit");
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("pd_visit", id); }
    return id;
  } catch {
    return null;
  }
}

export function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof navigator === "undefined" || navigator.webdriver || BOT.test(navigator.userAgent)) return;
    const id = sessionId();
    if (!id) return;
    const send = () => {
      if (document.visibilityState !== "visible") return;
      getSupabase().rpc("track_visit", { p_session: id, p_path: pathname }).then(() => {}, () => {});
    };
    send();
    const t = setInterval(send, 60_000);
    document.addEventListener("visibilitychange", send);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", send); };
  }, [pathname]);
  return null;
}
