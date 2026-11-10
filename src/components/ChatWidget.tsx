"use client";

import Link from "@/i18n/client";
import { useEffect, useRef, useState } from "react";
import { STORE } from "@/lib/constants";
import { playChatSound, setSoundEnabled, soundEnabled } from "@/lib/chat-sound";
import { formatINR } from "@/lib/format";
import { useI18n } from "@/i18n/client";

type Msg = { role: "user" | "assistant"; content: string; products?: ChatProduct[] };
type ChatProduct = { name: string; slug: string; price: number; image: string | null; stock: number };

const QUICK = ["chat.q1", "chat.q2", "chat.q3", "chat.q4", "chat.q5", "chat.q6", "chat.q7"];
const SEEN_KEY = "pcbdukaan-chat-greeted";

// Turns links like /products/x and [text](/products/x) into clickable links.
function RichText({ text: raw }: { text: string }) {
  const { t } = useI18n();
  // The model sometimes writes full addresses (https://www.pcbdukaan.com/products/x); keep just the path.
  const text = raw.replace(/https?:\/\/(?:www\.)?pcbdukaan\.(?:com|in)(?=\/)/gi, "");
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\((\/[a-z0-9/_-]+)\)|(\/(?:products|category)\/[a-z0-9_-]+|\/pcb-repair)\b|\*\*([^*]+)\*\*/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] && m[2]) parts.push(<Link key={i++} href={m[2]} className="font-semibold text-brand-700 underline">{m[1]}</Link>);
    else if (m[3]) parts.push(<Link key={i++} href={m[3]} className="font-semibold text-brand-700 underline">{m[3] === "/pcb-repair" ? t("nav.pcbRepair") : t("chat.view")}</Link>);
    else if (m[4]) parts.push(<strong key={i++}>{m[4]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className="whitespace-pre-line">{parts}</span>;
}

export function ChatWidget() {
  const { t, locale } = useI18n();
  const GREETING = t("chat.greeting");
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const teaserRef = useRef(false);

  useEffect(() => {
    // Not shown inside the admin panel.
    if (/^(\/(hi|ur|fr|ko|ja|zh))?\/admin(\/|$)/.test(window.location.pathname)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- decide visibility on the client
    setHidden(false);
    setSound(soundEnabled());
    let greeted = false;
    try {
      greeted = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (greeted) return;
    // Greet after a few seconds, then tuck the bubble away so it doesn't cover the page.
    const show = setTimeout(() => setTeaser(true), 5000);
    const hide = setTimeout(() => setTeaser(false), 17000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  // Chime when the greeting bubble appears (or at the visitor's first tap, if the browser
  // doesn't allow sound before that and the bubble is still showing).
  useEffect(() => {
    teaserRef.current = teaser;
    if (!teaser) return;
    return playChatSound("greet", () => teaserRef.current);
  }, [teaser]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  function markGreeted() {
    setTeaser(false);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function send(text: string, repairShortcut = false) {
    const content = text.trim();
    if (!content || busy) return;
    if (repairShortcut || (/repair/i.test(content) && content.length < 25)) {
      setMessages((cur) => [...cur, { role: "user", content }, { role: "assistant", content: t("chat.repairAnswer") }]);
      setInput("");
      playChatSound("reply");
      return;
    }
    const history = [...messages.filter((m, i) => !(i === 0 && m.content === GREETING)), { role: "user" as const, content }];
    setMessages((cur) => [...cur, { role: "user", content }, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      let products: ChatProduct[] = [];
      try {
        products = JSON.parse(decodeURIComponent(res.headers.get("X-Chat-Products") || "%5B%5D"));
      } catch {
        products = [];
      }
      // Show the matching products straight away, while the answer is still being written.
      if (res.ok && products.length) setMessages((cur) => [...cur.slice(0, -1), { ...cur[cur.length - 1], products }]);
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        text = (text + decoder.decode(value, { stream: true })).replace(/^\u200B/, "");
        const snapshot = text;
        setMessages((cur) => [...cur.slice(0, -1), { role: "assistant", content: snapshot, products: res.ok ? products : [] }]);
      }
      setMessages((cur) => [...cur.slice(0, -1), { role: "assistant", content: text || t("chat.noAnswer"), products: res.ok ? products : [] }]);
      if (text) playChatSound("reply");
    } catch {
      setMessages((cur) => [...cur.slice(0, -1), { role: "assistant", content: t("chat.unavailable") }]);
    }
    setBusy(false);
  }

  if (hidden) return null;

  return (
    <div className="fixed bottom-4 end-4 z-50 flex flex-col items-end gap-3 print:hidden">
      {open && (
        <section className="flex h-[min(560px,calc(100vh-6rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200" aria-label={t("chat.aria")}>
          <header className="flex items-center gap-3 bg-brand-800 px-4 py-3 text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" alt="" className="h-9 w-9 rounded-lg bg-white p-1" />
            <div className="flex-1 leading-tight">
              <p className="font-semibold">{t("chat.title")}</p>
              <p className="text-xs text-brand-100">{t("chat.subtitle")}</p>
            </div>
            <button
              onClick={() => { const on = !sound; setSound(on); setSoundEnabled(on); if (on) playChatSound("reply"); }}
              className="rounded p-1 text-lg leading-none hover:bg-white/10"
              aria-label={sound ? t("chat.soundOff") : t("chat.soundOn")}
              aria-pressed={!sound}
              title={sound ? t("chat.soundOff") : t("chat.soundOn")}
            >
              <span aria-hidden="true">{sound ? "🔔" : "🔕"}</span>
            </button>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-2xl leading-none hover:bg-white/10" aria-label={t("chat.close")}>×</button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3 text-sm" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.role === "user" ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-white text-slate-800 ring-1 ring-slate-200"}`}>
                  {m.content ? <RichText text={m.content} /> : <span className="inline-flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" /><span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" /></span>}
                  {m.products && m.products.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {m.products.map((p) => (
                        <Link key={p.slug} href={`/products/${p.slug}`} className="flex items-center gap-2 rounded-lg bg-slate-50 p-1.5 ring-1 ring-slate-200 hover:ring-brand-600">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt="" className="h-10 w-10 rounded object-contain" />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded bg-brand-50 text-lg" aria-hidden="true">🔌</span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-xs font-medium">{p.name}</span>
                            <span className="text-xs font-bold text-brand-700">{formatINR(p.price)}</span>
                            {p.stock <= 0 && <span className="ms-1 text-[10px] text-red-600">{t("product.outOfStock")}</span>}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2">
                {QUICK.map((q, qi) => (
                  <button key={q} onClick={() => send(t(q), qi === 3)} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-600 hover:bg-brand-50">{t(q)}</button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
          {STORE.whatsapp && (
            // Talk to a person instead: opens WhatsApp with the last question and the current page.
            <a
              href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`${t("chat.whatsappMsg")} ${[...messages].reverse().find((m) => m.role === "user")?.content ?? ""}\n${typeof window !== "undefined" ? window.location.href : ""}`.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border-t border-slate-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-emerald-600"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z"/></svg>
              {t("chat.whatsappPrompt")} <span className="underline">{t("chat.whatsappButton")}</span>
            </a>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-slate-200 p-2">
            <label htmlFor="chat-input" className="sr-only">{t("chat.yourMessage")}</label>
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={600}
              placeholder={t("chat.placeholder")}
              className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand-600"
              autoComplete="off"
            />
            <button disabled={busy || !input.trim()} className="rounded-full bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50" aria-label={t("chat.send")}><span className="inline-block rtl:rotate-180">➤</span></button>
          </form>
        </section>
      )}

      {!open && teaser && (
        <div className="relative max-w-[260px] rounded-2xl rounded-br-sm bg-white p-3 text-sm text-slate-800 shadow-xl ring-1 ring-slate-200">
          <button onClick={markGreeted} className="absolute right-1.5 top-1 text-slate-400 hover:text-slate-700" aria-label={t("chat.dismiss")}>×</button>
          <p className="pe-3">{t("chat.teaser")}</p>
          <button onClick={() => { markGreeted(); setOpen(true); }} className="mt-2 text-xs font-semibold text-brand-700 hover:underline">{t("chat.chatWithUs")} <span className="inline-block rtl:-scale-x-100">→</span></button>
        </div>
      )}

      <button
        onClick={() => { markGreeted(); setOpen((o) => !o); }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-xl ring-4 ring-white hover:bg-brand-800"
        aria-label={open ? t("chat.close") : t("chat.open")}
        aria-expanded={open}
      >
        {open ? (
          <span className="text-2xl leading-none">×</span>
        ) : (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinejoin="round" d="M4 5h16v11H9l-5 4z" />
            <path strokeLinecap="round" d="M8 10h.01M12 10h.01M16 10h.01" />
          </svg>
        )}
      </button>
    </div>
  );
}
