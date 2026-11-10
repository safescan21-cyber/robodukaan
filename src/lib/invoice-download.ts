"use client";

import { getSupabase } from "./supabase-browser";

// "Download PDF" on the invoice pages: fetch the PDF as the logged-in user and save it.
export async function downloadInvoicePdf(orderId: string, fileName: string) {
  const { data } = await getSupabase().auth.getSession();
  const res = await fetch(`/api/invoice/${orderId}`, { headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
