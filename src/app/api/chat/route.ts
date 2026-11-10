import { cpus } from "node:os";
import { createClient } from "@supabase/supabase-js";
import { STORE } from "@/lib/constants";
import { clientIp } from "@/lib/client-ip";
import { formatINR, productImage } from "@/lib/format";
import { builtInFacts, customFacts, scoreFacts, type Fact } from "@/lib/ai-knowledge";
import { rzpEnabled } from "@/lib/razorpay";

// Website chat assistant. Answers with a small AI model running on this server
// (Ollama, see deploy/ensure-chat.sh), grounded in the live product catalog.
// If the model isn't available, it falls back to a plain product search reply.

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL = process.env.CHAT_MODEL || "qwen2.5:1.5b";
const MAX_MESSAGES = 8;
const MAX_CHARS = 600;

type ChatMessage = { role: "user" | "assistant"; content: string };

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });

// Shop facts: built-in (from the site's settings) + the admin's own answers (Admin → AI assistant), cached 1 min.
let factsCache: { at: number; facts: Fact[] } | null = null;
async function allFacts(): Promise<Fact[]> {
  if (factsCache && Date.now() - factsCache.at < 60_000) return factsCache.facts;
  const [{ data }, online] = await Promise.all([
    db().from("ai_knowledge").select("question, answer, keywords").eq("is_active", true).limit(300).then((r) => r, () => ({ data: null })),
    rzpEnabled().then((x) => !!x, () => false),
  ]);
  const facts = [...customFacts((data as { question: string; answer: string; keywords: string | null }[] | null) ?? []), ...builtInFacts({ onlinePayment: online })];
  factsCache = { at: Date.now(), facts };
  return facts;
}
type FoundProduct = { name: string; slug: string; price: number; mrp: number | null; stock: number; image: string | null; category: string | null; short: string | null };

// The AI model runs on the shop's own server. At most CHAT_MAX_AI answers are written at the same time;
// anyone above that gets the instant product-search answer, so a burst of chats never slows the shop.
const CHAT_MAX_AI = Math.max(1, Number(process.env.CHAT_MAX_AI) || 2);
let aiActive = 0;
// Small servers (1–2 cores) give the AI every core – nginx serves most pages from its cache, so the website
// needs little processor time; bigger servers keep one core free for the website.
const AI_THREADS = cpus().length <= 2 ? cpus().length : cpus().length - 1;

// Simple per-visitor limit so the chat can't be abused.
const hits = new Map<string, number[]>();
function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 25) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

const STOP = new Set("i im me my we our you your a an the and or for to of in on with is are be need want looking look find show any some have has do does can could please price cost buy get best good which what kya hai chahiye mujhe ka ki ke me se aur ko bhi koi hello hi hey".split(" "));

async function findProducts(text: string): Promise<{ products: FoundProduct[]; categories: { name: string; slug: string }[] }> {
  const supabase = db();
  const { data: cats } = await supabase.from("categories").select("id, name, slug").order("sort_order");
  const categories = (cats ?? []).map((c) => ({ name: c.name as string, slug: c.slug as string }));

  const words = [...new Set(text.toLowerCase().replace(/[^a-z0-9.\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)))].slice(0, 6);
  if (words.length === 0) return { products: [], categories };

  const catIds = (cats ?? []).filter((c) => words.some((w) => (c.name as string).toLowerCase().includes(w) || (c.slug as string).includes(w))).map((c) => c.id);
  // "equivalents" = other brands' part numbers a product replaces, so "E2E-X8MD1" finds our sensor.
  const query = (withEquivalents: boolean) => {
    const nameOr = words.flatMap((w) => [`name.ilike.%${w}%`, `short_description.ilike.%${w}%`, `brand.ilike.%${w}%`, `sku.ilike.%${w}%`, ...(withEquivalents ? [`equivalents.ilike.%${w}%`] : [])]).join(",");
    const filter = catIds.length ? `${nameOr},category_id.in.(${catIds.join(",")})` : nameOr;
    return supabase
      .from("products")
      .select("name, slug, price, mrp, stock, image_url, images, short_description, category:categories(name)")
      .eq("is_active", true)
      .or(filter)
      .order("is_featured", { ascending: false })
      .limit(30);
  };
  let { data, error } = await query(true);
  if (error) ({ data, error } = await query(false)); // before migration 009

  // Rank by how many search words each product matches.
  const scored = (data ?? []).map((p) => {
    const hay = `${p.name} ${p.short_description ?? ""} ${(p.category as unknown as { name: string } | null)?.name ?? ""}`.toLowerCase();
    return { p, score: words.filter((w) => hay.includes(w)).length };
  });
  scored.sort((a, b) => b.score - a.score);
  const products = scored.slice(0, 6).map(({ p }) => ({
    name: p.name, slug: p.slug, price: Number(p.price), mrp: p.mrp == null ? null : Number(p.mrp), stock: p.stock,
    image: productImage(p), category: (p.category as unknown as { name: string } | null)?.name ?? null, short: p.short_description,
  }));
  return { products, categories };
}

function systemPrompt(products: FoundProduct[], categories: { name: string; slug: string }[], facts: Fact[] = []) {
  const list = products.length
    ? products.map((p) => `- ${p.name} | ${formatINR(p.price)}${p.stock > 0 ? "" : " | OUT OF STOCK"} | link: /products/${p.slug}${p.short ? ` | ${p.short}` : ""}`).join("\n")
    : "(no matching products found for this message)";
  return `You are the friendly shopping assistant of ${STORE.name} (pcbdukaan.com), an Indian online store for industrial electronics: control boards, SMPS power supplies, VFD and motor drive boards, PLC and I/O modules, load cells and weighing, industrial sensors, relays and power components, HMIs, communication modules and test tools. ${STORE.name} also repairs faulty industrial PCBs.

Rules:
- Keep answers short and friendly: at most 4 sentences, plus a short bullet list of products if useful.
- If the request is vague (e.g. just "SMPS" or "relay"), suggest the closest products AND ask one short question: voltage, current/power, brand/model or quantity.
- Questions about delivery, payment, GST invoices, returns, warranty, repairs, bulk orders or the account: answer ONLY from SHOP FACTS below, in your own short words, with the page link given there. If SHOP FACTS don't cover it, say you'll need a person to check and give the contact email.
- Never promise a delivery date, discount or stock that isn't stated. For an existing order, point to /track and the order emails.
- Only recommend products from the PRODUCTS list below. Never invent products, prices, stock or specifications.
- When you mention a product, copy its price EXACTLY as written in the list (one price, never a range or estimate) and its link exactly as written (for example /products/smps-24v-5a-din).
- If nothing in the list fits, say so honestly and suggest a category page from CATEGORIES or emailing ${STORE.email}.
- For a faulty, burnt or damaged board, offer the PCB repair service and always include the link /pcb-repair (upload photos, free quote within 1–2 working days).
- Prices in the list EXCLUDE GST; 18% GST is added at checkout. Customers must log in to buy.
- Reply in the customer's language (English, Hindi or Hinglish). Politely decline unrelated topics.

CATEGORIES:
${categories.map((c) => `- ${c.name}: /category/${c.slug}`).join("\n")}

SHOP FACTS:
${facts.length ? facts.map((f) => `- ${f.topic}: ${f.text}`).join("\n") : "(none needed for this message)"}

PRODUCTS matching the customer's message:
${list}`;
}

function fallbackReply(products: FoundProduct[], categories: { name: string; slug: string }[], facts: Fact[] = []) {
  if (facts.length && (!products.length || facts[0].custom)) return facts[0].text;
  if (products.length) {
    return `Here are the closest matches — tap one to see details. Tell me the voltage, current, capacity or model you need and I'll narrow it down.`;
  }
  return `I couldn't find an exact match. You can browse:\n${categories.slice(0, 6).map((c) => `- ${c.name}: /category/${c.slug}`).join("\n")}\n\nFor a faulty board, try our PCB repair service: /pcb-repair. Or email ${STORE.email}.`;
}

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  if (!allowed(ip)) {
    return new Response("You're sending messages very quickly — please wait a few minutes and try again.", { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const messages: ChatMessage[] = Array.isArray(body?.messages)
    ? body.messages
        .filter((m: ChatMessage) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
        .slice(-MAX_MESSAGES)
        .map((m: ChatMessage) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    : [];
  const LANGS: Record<string, string> = { hi: "Hindi", ur: "Urdu", fr: "French", ko: "Korean", ja: "Japanese", zh: "Simplified Chinese" };
  const replyLanguage = typeof body?.locale === "string" ? LANGS[body.locale] : undefined;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return new Response("Please type a message.", { status: 400 });

  // Search with the last two customer messages so follow-ups keep context.
  const userTexts = messages.filter((m) => m.role === "user").slice(-2).map((m) => m.content).join(" ");
  const [{ products, categories }, facts, scored] = await Promise.all([
    findProducts(userTexts).catch(() => ({ products: [] as FoundProduct[], categories: [] as { name: string; slug: string }[] })),
    allFacts().then((f) => scoreFacts(lastUser.content, f, 3)).catch(() => [] as { f: Fact; score: number }[]),
  ]).then(([found, scored]) => [found, scored.map((x) => x.f), scored] as const);
  // Remember the question (no personal data) so the admin can teach better answers.
  db().rpc("log_chat_question", { p_question: lastUser.content, p_products: products.length, p_knowledge: facts.length, p_mode: aiActive >= CHAT_MAX_AI ? "busy" : "ai" }).then(() => {}, () => {});

  const headers = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
    "X-Chat-Products": encodeURIComponent(JSON.stringify(products.slice(0, 4))),
  };

  // A clear match with one of the shop's own answers (Admin → AI assistant) and no product question:
  // reply with that answer word for word, instantly – the small AI model can garble short facts.
  const top = scored[0];
  if (!replyLanguage && !products.length && top?.f.custom && top.score >= 3 && (scored.length === 1 || scored[1].score < top.score)) {
    return new Response(top.f.text, { headers: { ...headers, "X-Chat-Mode": "faq" } });
  }

  if (aiActive >= CHAT_MAX_AI) {
    return new Response(fallbackReply(products, categories, facts), { headers: { ...headers, "X-Chat-Mode": "busy" } });
  }
  aiActive++;
  let released = false;
  const release = () => { if (!released) { released = true; aiActive--; } };

  // Answer at once: the response (with the matching products in its header) starts immediately, and the
  // AI's text follows as it is written. If the AI is unavailable, the product-search answer is sent instead.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 90_000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let buffer = "";
  const finish = () => { clearTimeout(timer); release(); };
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // An invisible character makes the server send the response (and the product list) right away,
      // instead of waiting for the AI's first word. The chat window removes it.
      controller.enqueue(encoder.encode("\u200B"));
      try {
        const upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL,
            stream: true,
            keep_alive: -1, // stay loaded: reloading the model takes about a minute and loses its prompt cache
            options: { temperature: 0.1, num_predict: 320, num_ctx: 3072, num_thread: AI_THREADS },
            messages: [{ role: "system", content: systemPrompt(products, categories, facts) + (replyLanguage ? `\n\nThe customer is browsing the site in ${replyLanguage}: reply in ${replyLanguage} unless they write in another language. Keep product names, prices and links exactly as written.` : "") }, ...messages],
          }),
          signal: abort.signal,
        });
        if (!upstream.ok || !upstream.body) throw new Error(`ollama ${upstream.status}`);
        reader = upstream.body.getReader();
      } catch {
        finish();
        controller.enqueue(encoder.encode(fallbackReply(products, categories, facts)));
        controller.close();
      }
    },
    // Convert Ollama's line-by-line JSON into plain streamed text.
    async pull(controller) {
      if (!reader) return;
      let value: Uint8Array | undefined, done = false;
      try {
        ({ value, done } = await reader.read());
      } catch {
        finish();
        controller.close();
        return;
      }
      if (done) {
        finish();
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line);
          if (chunk.message?.content) controller.enqueue(encoder.encode(chunk.message.content));
        } catch {
          /* ignore partial lines */
        }
      }
    },
    cancel() {
      finish();
      abort.abort();
      reader?.cancel().catch(() => {});
    },
  });
  return new Response(stream, { headers: { ...headers, "X-Chat-Mode": "ai" } });
}
