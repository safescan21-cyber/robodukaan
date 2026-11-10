import { userFromRequest } from "@/lib/server-auth";
import { invoiceFileName, invoicePdf } from "@/lib/invoice-pdf";
import type { Order } from "@/lib/types";

// PDF tax invoice for one order – for the customer who placed it, or an admin (database rules decide).
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const auth = await userFromRequest(request);
  if (!auth) return Response.json({ error: "Please log in" }, { status: 401 });
  const { data: order } = await auth.supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  const pdf = await invoicePdf(order as Order);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceFileName(order as Order)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
