"use client";

import { STATUS_STYLE } from "@/lib/constants";
import { useI18n } from "@/i18n/client";
import type { OrderStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>{t(`orderStatus.${status}`)}</span>;
}
