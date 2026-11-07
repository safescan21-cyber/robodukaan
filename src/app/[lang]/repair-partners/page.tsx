import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PartnerForm } from "@/components/PartnerForm";
import { getT } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Repair technician partner programme – earn on boards you can't fix",
  description: "Field and panel technicians: send us the hard boards – VFD power stages, servo drives, PLCs, HMIs – and earn a referral fee on every repair. Free sign-up, all India.",
  alternates: { canonical: "/repair-partners" },
};

const BENEFITS: [string, string, string][] = [
  ["💰", "Earn on every board", "A referral fee on every board you send that we repair – agreed with you before you start."],
  ["🧰", "Keep your customer", "You stay the contact for the factory. We repair the board and can ship it back to you or to the customer."],
  ["🔬", "Component-level repair", "IGBT power stages, gate drivers, servo amplifiers, PLC CPUs, HMIs – the boards that need a full bench."],
  ["📦", "Parts for your own jobs", "Order SMPS, drive boards, relays and other spares online with a GST invoice – ask us about partner pricing."],
];

export default async function RepairPartnersPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={[{ label: t("nav.pcbRepair"), href: "/pcb-repair" }, { label: t("nav.partners") }]} />
      <section className="rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-6 text-white">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Become a PCBDukaan repair partner</h1>
        <p className="mt-3 max-w-3xl text-brand-100">
          Are you a maintenance or panel technician? When a board is too difficult or needs equipment you don’t have,
          send it to us. We repair it at component level, test it, and you earn a referral fee – without losing your customer.
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {BENEFITS.map(([icon, title, text]) => (
          <div key={title} className="rounded-md bg-white p-5 ring-1 ring-slate-200">
            <p className="text-2xl" aria-hidden="true">{icon}</p>
            <p className="mt-1 font-bold">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <section>
          <h2 className="mb-4 text-xl font-bold">Apply – it’s free</h2>
          <PartnerForm />
        </section>
        <aside className="space-y-4 text-sm">
          <div className="rounded-md bg-white p-5 ring-1 ring-slate-200">
            <h3 className="font-bold">How it works</h3>
            <ol className="mt-2 list-decimal space-y-1 ps-5 text-slate-700">
              <li>Apply with this form – we call you to agree the terms.</li>
              <li>Send board photos through the <Link href="/pcb-repair" className="text-brand-700 hover:underline">repair page</Link> and mention your partner name.</li>
              <li>We quote, repair and test the board.</li>
              <li>You get your referral fee once the repair is paid.</li>
            </ol>
          </div>
          <div className="rounded-md bg-accent-50 p-5 ring-1 ring-accent-400/30">
            <h3 className="font-bold">Who can apply</h3>
            <p className="mt-1 text-slate-700">Freelance and in-house maintenance technicians, panel builders, electrical contractors and small repair shops anywhere in India.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
