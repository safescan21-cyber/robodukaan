"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField } from "@/lib/admin";

type Entry = { id: number; question: string; answer: string; keywords: string | null; is_active: boolean; updated_at: string };
type Asked = { id: number; question: string; products: number; knowledge: number; mode: string | null; created_at: string };

// Admin → AI assistant: teach the website chat your own answers, see what customers ask, test it.
export default function AiAssistantPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [asked, setAsked] = useState<Asked[]>([]);
  const [onlyUnanswered, setOnlyUnanswered] = useState(true);
  const [edit, setEdit] = useState<Partial<Entry> | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [test, setTest] = useState({ q: "", a: "", busy: false });

  const load = useCallback(async () => {
    const sb = getSupabase();
    const [k, q] = await Promise.all([
      sb.from("ai_knowledge").select("*").order("updated_at", { ascending: false }),
      sb.from("chat_questions").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (k.error) setMsg({ ok: false, text: k.error.message.includes("ai_knowledge") ? "Database update 025 is needed first." : k.error.message });
    setEntries((k.data as Entry[]) ?? []);
    setAsked((q.data as Asked[]) ?? []);
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    const row = { question: (edit.question ?? "").trim(), answer: (edit.answer ?? "").trim(), keywords: (edit.keywords ?? "").trim() || null, is_active: edit.is_active ?? true, updated_at: new Date().toISOString() };
    if (row.question.length < 3 || row.answer.length < 2) return setMsg({ ok: false, text: "Please write the question and the answer." });
    const sb = getSupabase();
    const { error } = edit.id ? await sb.from("ai_knowledge").update(row).eq("id", edit.id) : await sb.from("ai_knowledge").insert(row);
    if (error) return setMsg({ ok: false, text: error.message });
    setMsg({ ok: true, text: "Saved – the assistant uses it within a minute." });
    setEdit(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this answer?")) return;
    await getSupabase().from("ai_knowledge").delete().eq("id", id);
    load();
  }

  async function runTest() {
    if (!test.q.trim()) return;
    setTest((t) => ({ ...t, busy: true, a: "" }));
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: test.q.trim() }] }) });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let a = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        a = (a + dec.decode(value, { stream: true })).replace(/^​/, "");
        setTest((t) => ({ ...t, a }));
      }
    } catch {
      setTest((t) => ({ ...t, a: "The assistant didn't answer – try again in a minute." }));
    }
    setTest((t) => ({ ...t, busy: false }));
  }

  const shownAsked = onlyUnanswered ? asked.filter((q) => q.knowledge === 0 && q.products === 0) : asked;
  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold">AI assistant</h1>
      <p className="text-sm text-slate-600">The chat on your website already knows your products, prices, stock, delivery, payment, GST invoices, returns, warranty, repair service and prices, bulk orders and contact details. Add your own answers here for anything else customers ask – the assistant uses them word for word. It never invents prices or policies.</p>
      {msg && <p role="status" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      <section className="rounded-md bg-white p-4 ring-1 ring-slate-200">
        <h2 className="mb-2 font-semibold">Try the assistant</h2>
        <div className="flex gap-2">
          <input value={test.q} onChange={(e) => setTest((t) => ({ ...t, q: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") runTest(); }} placeholder="e.g. Do you give GST invoice? / VFD repair price / order kab milega" className={adminField} />
          <button type="button" onClick={runTest} disabled={test.busy} className={`${adminButton} mt-1 shrink-0`}>{test.busy ? "…" : "Ask"}</button>
        </div>
        {test.a && <p className="mt-3 whitespace-pre-line rounded bg-slate-50 p-3 text-sm">{test.a}</p>}
      </section>

      <section className="rounded-md bg-white p-4 ring-1 ring-slate-200">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Your answers ({entries?.length ?? 0})</h2>
          <button type="button" onClick={() => setEdit({ question: "", answer: "", keywords: "", is_active: true })} className={adminButton}>+ Add an answer</button>
        </div>
        {edit && (
          <form onSubmit={save} className="mb-4 space-y-3 rounded-md bg-slate-50 p-3 ring-1 ring-slate-200">
            <label className="block text-sm font-medium">Customer question<input value={edit.question ?? ""} onChange={(e) => setEdit({ ...edit, question: e.target.value })} maxLength={300} placeholder="e.g. Do you have a shop I can visit?" className={adminField} /></label>
            <label className="block text-sm font-medium">Your answer<textarea value={edit.answer ?? ""} onChange={(e) => setEdit({ ...edit, answer: e.target.value })} maxLength={1500} rows={4} placeholder="Write it as you would reply to the customer. Add page links like /pcb-repair if useful." className={adminField} /></label>
            <label className="block text-sm font-medium">Extra words customers might use <span className="font-normal text-slate-500">(optional, comma separated – Hindi/Hinglish too)</span><input value={edit.keywords ?? ""} onChange={(e) => setEdit({ ...edit, keywords: e.target.value })} maxLength={300} placeholder="shop, visit, address, dukaan, office" className={adminField} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.is_active ?? true} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} className="h-4 w-4 accent-brand-600" />Active</label>
            <div className="flex gap-2"><button className={adminButton}>Save</button><button type="button" onClick={() => setEdit(null)} className="rounded-md px-4 py-2 text-sm ring-1 ring-slate-300">Cancel</button></div>
          </form>
        )}
        {entries && entries.length === 0 && !edit && <p className="text-sm text-slate-500">No answers yet. Look at “Questions customers asked” below and teach the ones the assistant couldn’t answer.</p>}
        <ul className="divide-y divide-slate-100">
          {entries?.map((e) => (
            <li key={e.id} className="py-3 text-sm">
              <p className="font-semibold">{e.question} {!e.is_active && <span className="ms-1 rounded bg-slate-200 px-1.5 text-xs font-normal">off</span>}</p>
              <p className="mt-1 whitespace-pre-line text-slate-700">{e.answer}</p>
              {e.keywords && <p className="mt-1 text-xs text-slate-500">Words: {e.keywords}</p>}
              <div className="mt-1 flex gap-3 text-xs"><button type="button" onClick={() => setEdit(e)} className="font-semibold text-brand-700 hover:underline">Edit</button><button type="button" onClick={() => remove(e.id)} className="text-red-600 hover:underline">Delete</button></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-md bg-white p-4 ring-1 ring-slate-200">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Questions customers asked</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyUnanswered} onChange={(e) => setOnlyUnanswered(e.target.checked)} className="h-4 w-4 accent-brand-600" />Only ones without a product or fact</label>
        </div>
        <p className="mb-2 text-xs text-slate-500">Last 90 days. Phone numbers and email addresses are removed automatically.</p>
        {shownAsked.length === 0 ? <p className="text-sm text-slate-500">Nothing here yet.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {shownAsked.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 flex-1">{q.question}<span className="block text-xs text-slate-500">{new Date(q.created_at).toLocaleString("en-IN")} · {q.products} products · {q.knowledge} facts{q.mode === "busy" ? " · busy" : ""}</span></span>
                <button type="button" onClick={() => { setEdit({ question: q.question, answer: "", keywords: "", is_active: true }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="shrink-0 rounded bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">Teach an answer</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
