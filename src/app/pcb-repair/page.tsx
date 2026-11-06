import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RepairForm } from "@/components/RepairForm";
import { BOARD_TYPES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "PCB repair service",
  description: "Send photos of your faulty PCB — inverter, SMPS, VFD, PLC, machine and appliance boards — and get a repair quote. Pan-India service.",
  alternates: { canonical: "/pcb-repair" },
};

const STEPS = [
  ["📷", "Send photos", "Upload clear photos of your board and describe the fault."],
  ["💬", "Get a quote", "Our technician checks the photos and emails you a price, free."],
  ["📦", "Ship the board", "Approve the quote and courier the board to us."],
  ["✅", "Repaired & returned", "We repair, test and ship it back to you."],
];

export default function PcbRepairPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={[{ label: "PCB repair" }]} />
      <section className="overflow-hidden rounded-md bg-gradient-to-r from-slate-900 via-brand-900 to-brand-700 p-6 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-400">PCB repair service</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">Faulty circuit board? Send us a photo — we’ll fix it.</h1>
        <p className="mt-3 max-w-2xl text-brand-100">Inverter, SMPS, VFD, PLC, machine control, weighing indicator and appliance boards. Component-level repair, tested before return, anywhere in India.</p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([icon, title, text], i) => (
          <div key={title} className="rounded-md bg-white p-5 ring-1 ring-slate-200">
            <p className="text-3xl" aria-hidden="true">{icon}</p>
            <p className="mt-2 text-xs font-bold uppercase text-accent-600">Step {i + 1}</p>
            <p className="font-bold">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-4 text-xl font-bold">Send a repair request</h2>
          <RepairForm />
        </section>
        <aside className="space-y-5">
          <div className="rounded-md bg-white p-5 ring-1 ring-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-wide">Boards we repair</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              {BOARD_TYPES.filter((b) => b !== "Other").map((b) => <li key={b}>✓ {b}</li>)}
            </ul>
            <Link href="/locations" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">We serve every Indian state →</Link>
          </div>
          <div className="rounded-md bg-accent-50 p-5 text-sm ring-1 ring-accent-400/30">
            <h3 className="font-bold">Tips for good photos</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
              <li>Take both sides of the board in daylight</li>
              <li>Close-ups of burnt, swollen or cracked parts</li>
              <li>Include any model number or label on the board</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
