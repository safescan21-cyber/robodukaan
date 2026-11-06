import { STATUS_LABEL, STATUS_STYLE } from "@/lib/constants";
import type { OrderStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}
