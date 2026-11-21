import Link from "@/i18n/client";
import { JsonLd } from "./JsonLd";
import { getAuthor, getWorkshopNote } from "@/lib/data";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

// "From our workshop" (your own note and photo for this page) + who wrote / checked the page.
// Both come from Admin → Workshop notes; nothing is shown until they're filled in.
export async function ExpertBox({ path, className = "" }: { path: string; className?: string }) {
  const [author, note] = await Promise.all([getAuthor(), getWorkshopNote(path)]);
  if (!author && !note) return null;
  const updated = note?.updated ? new Date(note.updated) : null;
  const person = author ? {
    "@type": "Person", name: author.name, ...(author.role ? { jobTitle: author.role } : {}),
    ...(author.photo ? { image: author.photo } : {}), url: `${SITE}/about#author`,
    worksFor: { "@type": "Organization", "@id": `${SITE}/#organization`, name: "PCBDukaan" },
  } : null;
  return (
    <div className={`space-y-4 ${className}`}>
      {person && <JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: `${SITE}${path}`, author: person, reviewedBy: person, ...(updated ? { lastReviewed: updated.toISOString().slice(0, 10) } : {}) }} />}
      {note && (
        <section className="rounded-md bg-amber-50 p-5 ring-1 ring-amber-200">
          <h2 className="text-lg font-bold text-amber-950">🔧 From our workshop</h2>
          {note.text && <div className="mt-2 space-y-2 text-slate-800">{note.text.split(/\n{2,}/).map((para) => <p key={para}>{para}</p>)}</div>}
          {note.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={note.photo} alt="Photo from the PCBDukaan repair workshop" loading="lazy" className="mt-3 max-h-96 w-auto rounded-md ring-1 ring-amber-200" />
          )}
        </section>
      )}
      {author && (
        <div className="flex items-center gap-3 rounded-md bg-white p-4 text-sm ring-1 ring-slate-200">
          {author.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.photo} alt={author.name} width={48} height={48} className="h-12 w-12 shrink-0 rounded-full object-cover" />
          )}
          <p className="text-slate-700">
            Written and checked by <Link href="/about#author" className="font-semibold text-slate-900 hover:underline">{author.name}</Link>
            {author.role ? `, ${author.role}` : ""}{author.experience ? ` · ${author.experience}` : ""}
            {updated && !isNaN(updated.getTime()) ? <> · Updated {updated.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</> : null}
          </p>
        </div>
      )}
    </div>
  );
}

// Author card for the About page.
export async function AuthorCard() {
  const author = await getAuthor();
  if (!author) return null;
  return (
    <section id="author" className="not-prose mt-8 flex scroll-mt-24 gap-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
      {author.photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={author.photo} alt={author.name} width={80} height={80} className="h-20 w-20 shrink-0 rounded-full object-cover" />
      )}
      <div>
        <h2 className="text-lg font-bold">{author.name}</h2>
        <p className="text-sm text-slate-600">{[author.role, author.experience].filter(Boolean).join(" · ")}</p>
        {author.bio && <p className="mt-2 text-sm text-slate-700">{author.bio}</p>}
      </div>
    </section>
  );
}
