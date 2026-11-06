import { REPAIR_STATUS_LABEL, REPAIR_STATUS_STYLE } from "@/lib/constants";
import type { RepairStatus } from "@/lib/types";

export function RepairStatusBadge({ status }: { status: RepairStatus }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${REPAIR_STATUS_STYLE[status]}`}>{REPAIR_STATUS_LABEL[status]}</span>;
}
