"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/i18n/client";
import { AddressForm, type AddressInput } from "@/components/AddressForm";
import type { Address } from "@/lib/types";

export default function AddressesPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
    setAddresses((data as Address[]) ?? []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function save(input: AddressInput) {
    if (!user) return;
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    if (input.is_default) await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    const { error } = editing && editing !== "new"
      ? await supabase.from("addresses").update(input).eq("id", editing.id)
      : await supabase.from("addresses").insert({ ...input, user_id: user.id, is_default: input.is_default || !addresses?.length });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setEditing(null);
      load();
    }
  }

  async function remove(a: Address) {
    if (!confirm(t("address.confirmDelete"))) return;
    await getSupabase().from("addresses").delete().eq("id", a.id);
    load();
  }

  return (
    <div className="rounded-md bg-white ring-1 ring-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h1 className="text-lg font-bold">{t("account.addressesShort")}</h1>
        {editing === null && (
          <button onClick={() => setEditing("new")} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">+ {t("address.add")}</button>
        )}
      </div>
      <div className="space-y-4 p-4">
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {editing !== null && (
          <AddressForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? undefined : editing} onSubmit={save} onCancel={() => setEditing(null)} busy={busy} />
        )}
        {addresses === null ? (
          <p className="text-sm text-slate-500">{t("common.loading")}</p>
        ) : addresses.length === 0 && editing === null ? (
          <p className="text-sm text-slate-600">{t("address.none")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((a) => (
              <div key={a.id} className="rounded-md border border-slate-200 p-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-brand-700">{t(`address.${a.label.toLowerCase()}`)}</span>
                  {a.is_default && <span className="rounded bg-emerald-100 px-1.5 text-[11px] font-semibold text-emerald-800">{t("address.default")}</span>}
                </div>
                <p className="mt-1 font-semibold">{a.full_name}</p>
                <p className="text-slate-600">{a.address_line}<br />{a.city}, {a.state} – {a.pincode}<br />📞 {a.phone}</p>
                <div className="mt-3 flex gap-3 text-xs font-semibold">
                  <button onClick={() => setEditing(a)} className="text-brand-700 hover:underline">{t("common.edit")}</button>
                  <button onClick={() => remove(a)} className="text-red-600 hover:underline">{t("common.delete")}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
