import { userFromRequest } from "@/lib/server-auth";
import { sendNewQuestionEmail } from "@/lib/email";

// A logged-in customer asks a question on a product page; the admin gets an email.
export async function POST(request: Request) {
  const auth = await userFromRequest(request);
  if (!auth) return Response.json({ error: "Please log in to ask a question" }, { status: 401 });
  const { productId, question } = await request.json().catch(() => ({}));
  if (typeof productId !== "string" || !/^[0-9a-f-]{36}$/i.test(productId) || typeof question !== "string") {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const { data: id, error } = await auth.supabase.rpc("ask_product_question", { p_product_id: productId, p_question: question.slice(0, 600) });
  if (error) {
    const known = /Please|Too many|too long|not found/.test(error.message);
    return Response.json({ error: known ? error.message : "Could not send your question. Please try again." }, { status: 400 });
  }
  const [{ data: q }, { data: p }] = await Promise.all([
    auth.supabase.from("product_questions").select("asker_name, question").eq("id", id).maybeSingle(),
    auth.supabase.from("products").select("name, slug").eq("id", productId).maybeSingle(),
  ]);
  if (q && p) sendNewQuestionEmail({ product: p.name, slug: p.slug, name: q.asker_name ?? "Customer", question: q.question }).catch(() => {});
  return Response.json({ ok: true });
}
