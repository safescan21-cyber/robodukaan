"use client";

import { REPAIR_STATUS_STYLE } from "@/lib/constants";
import { useI18n } from "@/i18n/client";
import type { RepairStatus } from "@/lib/types";

export function RepairStatusBadge({ status }: { status: RepairStatus }) {
  const { t } = useI18n();
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${REPAIR_STATUS_STYLE[status]}`}>{t(`repairStatus.${status}`)}</span>;
}
