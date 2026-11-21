// Real people behind the content: the author/reviewer profile (site_content key "author") and your own
// workshop notes per page (key "note:<page path>") – written in Admin → Workshop notes. Nothing is shown
// until you fill it in, so the site never claims experience it doesn't have.
export type AuthorInfo = { name: string; role: string; experience: string; bio: string; photo: string };
export type WorkshopNote = { text: string; photo: string; updated: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const img = (v: unknown) => { const u = str(v, 400); return /^https:\/\//.test(u) ? u : ""; };

export function cleanAuthor(v: unknown): AuthorInfo | null {
  const x = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const a = { name: str(x.name, 80), role: str(x.role, 120), experience: str(x.experience, 120), bio: str(x.bio, 800), photo: img(x.photo) };
  return a.name ? a : null;
}

export function cleanNote(v: unknown): WorkshopNote | null {
  const x = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const n = { text: str(x.text, 3000), photo: img(x.photo), updated: str(x.updated, 30) };
  return n.text || n.photo ? n : null;
}

// Page paths that can have a note: "/fault-codes/delta/oc", "/pcb-design/pcb-basics" … (no language prefix).
export const notePathOk = (p: string) => /^\/[a-z0-9][a-z0-9/-]{0,53}$/.test(p) && !p.includes("//");
export const noteKey = (path: string) => `note:${path}`;
