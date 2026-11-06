import { createClient } from "@supabase/supabase-js";
import { STORE } from "@/lib/constants";
import { formatINR, productImage } from "@/lib/format";

// Website chat assistant. Answers with a small AI model running on this server
// (Ollama, see deploy/ensure-chat.sh), grounded in the live product catalog.
// If the model isn't available, it falls back to a plain product search reply.

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL = process.env.CHAT_MODEL || "qwen2.5:1.5b";
const MAX_MESSAGES = 8;
const MAX_CHARS = 600;

type ChatMessage = { role: "user" | "assistant"; content: string };
type FoundProduct = { name: string; slug: string; price: number; mrp: number | null; stock: number; image: string | null; category: string | null; short: string | null };

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
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data: cats } = await supabase.from("categories").select("id, name, slug").order("sort_order");
  const categories = (cats ?? []).map((c) => ({ name: c.name as string, slug: c.slug as string }));

  const words = [...new Set(text.toLowerCase().replace(/[^a-z0-9.\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)))].slice(0, 6);
  if (words.length === 0) return { products: [], categories };

  const nameOr = words.flatMap((w) => [`name.ilike.%${w}%`, `short_description.ilike.%${w}%`, `brand.ilike.%${w}%`, `sku.ilike.%${w}%`]).join(",");
  const catIds = (cats ?? []).filter((c) => words.some((w) => (c.name as string).toLowerCase().includes(w) || (c.slug as string).includes(w))).map((c) => c.id);
  const filter = catIds.length ? `${nameOr},category_id.in.(${catIds.join(",")})` : nameOr;

  const { data } = await supabase
    .from("products")
    .select("name, slug, price, mrp, stock, image_url, images, short_description, category:categories(name)")
    .eq("is_active", true)
    .or(filter)
    .order("is_featured", { ascending: false })
    .limit(30);

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

function systemPrompt(products: FoundProduct[], categories: { name: string; slug: string }[]) {
  const list = products.length
    ? products.map((p) => `- ${p.name} | ${formatINR(p.price)}${p.stock > 0 ? "" : " | OUT OF STOCK"} | link: /products/${p.slug}${p.short ? ` | ${p.short}` : ""}`).join("\n")
    : "(no matching products found for this message)";
  return `You are the friendly shopping assistant of ${STORE.name} (pcbdukaan.com), an Indian online store for industrial electronics: control boards, SMPS power supplies, VFD and motor drive boards, PLC and I/O modules, load cells and weighing, industrial sensors, relays and power components, HMIs, communication modules and test tools. ${STORE.name} also repairs faulty industrial PCBs.

Rules:
- Keep answers short: at most 4 sentences, plus a short bullet list of products if useful.
- Only recommend products from the PRODUCTS list below. Never invent products, prices, stock or specifications.
- When you mention a product, give its price in ₹ and its link exactly as written (for example /products/smps-24v-5a-din).
- If nothing in the list fits, say so honestly and suggest a category page from CATEGORIES or emailing ${STORE.email}.
- For a faulty or burnt board, suggest the PCB repair service at /pcb-repair (upload photos, free quote).
- Customers must log in to buy. Payment is cash on delivery. Shipping is free above ₹499.
- Reply in the customer's language (English, Hindi or Hinglish). Politely decline unrelated topics.

CATEGORIES:
${categories.map((c) => `- ${c.name}: /category/${c.slug}`).join("\n")}

PRODUCTS matching the customer's message:
${list}`;
}

function fallbackReply(products: FoundProduct[], categories: { name: string; slug: string }[]) {
  if (products.length) {
    return `Here are the closest matches — tap one to see details. Tell me the voltage, current, capacity or model you need and I'll narrow it down.`;
  }
  return `I couldn't find an exact match. You can browse:\n${categories.slice(0, 6).map((c) => `- ${c.name}: /category/${c.slug}`).join("\n")}\n\nFor a faulty board, try our PCB repair service: /pcb-repair. Or email ${STORE.email}.`;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
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
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return new Response("Please type a message.", { status: 400 });

  // Search with the last two customer messages so follow-ups keep context.
  const userTexts = messages.filter((m) => m.role === "user").slice(-2).map((m) => m.content).join(" ");
  const { products, categories } = await findProducts(userTexts).catch(() => ({ products: [], categories: [] }));

  const headers = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
    "X-Chat-Products": encodeURIComponent(JSON.stringify(products.slice(0, 4))),
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        keep_alive: "30m",
        options: { temperature: 0.3, num_predict: 320, num_ctx: 3072 },
        messages: [{ role: "system", content: systemPrompt(products, categories) }, ...messages],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!upstream.ok || !upstream.body) throw new Error(`ollama ${upstream.status}`);
  } catch {
    return new Response(fallbackReply(products, categories), { headers: { ...headers, "X-Chat-Mode": "search" } });
  }

  // Convert Ollama's line-by-line JSON into plain streamed text.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await reader.read();
      if (done) {
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
      reader.cancel();
    },
  });
  return new Response(stream, { headers: { ...headers, "X-Chat-Mode": "ai" } });
}
