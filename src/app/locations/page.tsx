import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AREAS, STATES, areasIn } from "@/lib/locations";

export const metadata: Metadata = {
  title: "Areas we serve – industrial PCB repair & supply across India",
  description: "PCBDukaan supplies industrial PCBs, SMPS, drive boards and PLC modules and repairs faulty boards for factories in every Indian state and major industrial area.",
  alternates: { canonical: "/locations" },
};

export default function LocationsPage() {
  const states = STATES.filter((s) => s.type === "state");
  const uts = STATES.filter((s) => s.type === "ut");
  const card = (s: (typeof STATES)[number]) => {
    const n = areasIn(s.slug).length;
    return (
      <Link key={s.slug} href={`/locations/${s.slug}`} className="flex items-center justify-between rounded-md bg-white px-4 py-3 ring-1 ring-slate-200 hover:ring-brand-600">
        <span className="font-semibold">{s.name}</span>
        <span className="text-xs text-slate-500">{n ? `${n} industrial area${n > 1 ? "s" : ""}` : "All areas"}</span>
      </Link>
    );
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={[{ label: "Areas we serve" }]} />
      <section className="rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-6 text-white sm:p-10">
        <h1 className="text-3xl font-extrabold">Industrial PCB repair &amp; supply across India</h1>
        <p className="mt-2 max-w-3xl text-brand-100">
          We ship control boards, power supplies, drive boards, PLC modules and weighing electronics to factories in every state, and repair faulty industrial PCBs by courier. Find your state or industrial area below — {AREAS.length} major industrial areas listed.
        </p>
      </section>
      <h2 className="mb-3 mt-8 text-xl font-bold">States</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{states.map(card)}</div>
      <h2 className="mb-3 mt-8 text-xl font-bold">Union territories</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{uts.map(card)}</div>
    </div>
  );
}
