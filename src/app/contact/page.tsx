import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { STORE } from "@/lib/constants";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  const tel = STORE.phone.replace(/\s/g, "");
  return (
    <InfoPage title="Contact us">
      <p>Need help choosing a part, or have a question about your order? We’re happy to help.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {tel && <a href={`tel:${tel}`} className="rounded-md bg-slate-50 p-4 ring-1 ring-slate-200 hover:ring-brand-600"><p className="text-2xl">📞</p><p className="font-semibold">Call us</p><p>{STORE.phone}</p></a>}
        {tel && <a href={`https://wa.me/${tel.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-slate-50 p-4 ring-1 ring-slate-200 hover:ring-brand-600"><p className="text-2xl">💬</p><p className="font-semibold">WhatsApp</p><p>Chat with us</p></a>}
        <a href={`mailto:${STORE.email}`} className="rounded-md bg-slate-50 p-4 ring-1 ring-slate-200 hover:ring-brand-600"><p className="text-2xl">✉️</p><p className="font-semibold">Email</p><p>{STORE.email}</p></a>
      </div>
      <p>Support hours: Monday to Saturday, 10:00 am – 7:00 pm IST.</p>
    </InfoPage>
  );
}
