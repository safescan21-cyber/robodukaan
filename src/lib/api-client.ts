"use client";

import { getSupabase } from "./supabase-browser";

// POST to one of our own API routes as the signed-in user. Never throws:
// emails are a nice-to-have and must not block the customer.
export async function postAsUser(path: string, body: unknown = {}) {
  try {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}
