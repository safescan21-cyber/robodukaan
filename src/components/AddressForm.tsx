"use client";

import { INDIAN_STATES } from "@/lib/constants";
import { useI18n } from "@/i18n/client";
import type { Address } from "@/lib/types";

export type AddressInput = Omit<Address, "id">;

const field = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600";

export function AddressForm({ initial, onSubmit, onCancel, busy }: {
  initial?: Partial<AddressInput>;
  onSubmit: (a: AddressInput) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const { t } = useI18n();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSubmit({
          label: String(f.get("label")) as Address["label"],
          full_name: String(f.get("full_name")).trim(),
          phone: String(f.get("phone")).trim(),
          address_line: String(f.get("address_line")).trim(),
          city: String(f.get("city")).trim(),
          state: String(f.get("state")),
          pincode: String(f.get("pincode")).trim(),
          is_default: f.get("is_default") === "on",
        });
      }}
      className="grid gap-3 rounded-md bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2"
    >
      <label className="text-sm font-medium">{t("address.label")}
        <select name="label" defaultValue={initial?.label ?? "Home"} className={field}>
          <option value="Home">{t("address.home")}</option><option value="Office">{t("address.office")}</option><option value="Other">{t("address.other")}</option>
        </select>
      </label>
      <label className="text-sm font-medium">{t("form.fullName")}<input name="full_name" required defaultValue={initial?.full_name} className={field} /></label>
      <label className="text-sm font-medium">{t("form.mobile")}<input name="phone" required pattern="(\+?91)?[6-9][0-9]{9}" defaultValue={initial?.phone} className={field} /></label>
      <label className="text-sm font-medium">{t("form.pincode")}<input name="pincode" required pattern="[1-9][0-9]{5}" maxLength={6} defaultValue={initial?.pincode} className={field} /></label>
      <label className="text-sm font-medium sm:col-span-2">{t("form.address")}<textarea name="address_line" required rows={2} defaultValue={initial?.address_line} className={field} /></label>
      <label className="text-sm font-medium">{t("form.city")}<input name="city" required defaultValue={initial?.city} className={field} /></label>
      <label className="text-sm font-medium">State
        <select name="state" required defaultValue={initial?.state ?? ""} className={field}>
          <option value="" disabled>{t("form.selectState")}</option>
          {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="is_default" defaultChecked={initial?.is_default} className="h-4 w-4 accent-brand-600" /> {t("address.makeDefault")}
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={busy} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{t("address.save")}</button>
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200">{t("common.cancel")}</button>
      </div>
    </form>
  );
}
