"use client";

import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { Slots } from "~/schedules/lib/types";

type OutOfOfficeMonthViewDetailsProps = {
  slots: Slots | null | undefined;
  isLoading?: boolean;
  className?: string;
};

type OOORange = {
  startDate: string;
  endDate: string;
  fromUser?: { displayName?: string | null } | null;
  toUser?: { displayName?: string | null } | null;
  reason?: string | null;
  specifiedReason?: string | null;
  emoji?: string | null;
  notes?: string | null;
  showNotePublicly?: boolean;
  isHoliday: boolean;
};

function sameOOOReason(
  a: { reason?: string | null; specifiedReason?: string | null },
  b: { reason?: string | null; specifiedReason?: string | null }
): boolean {
  return a.reason === b.reason && a.specifiedReason === b.specifiedReason;
}

function getOOORangesForMonth(slots: Slots, month: string): OOORange[] {
  const monthStart = dayjs(month).startOf("month");
  const monthEnd = dayjs(month).endOf("month");
  const ranges: OOORange[] = [];
  const processed = new Set<string>();

  for (const dateStr of Object.keys(slots)) {
    const date = dayjs(dateStr);
    if (!date.isSame(monthStart, "month") || processed.has(dateStr)) continue;

    const daySlots = slots[dateStr] || [];
    const firstOOOSlot = daySlots.find((slot) => slot.away);
    if (!firstOOOSlot) continue;

    // Find consecutive OOO days with the same reason (do not merge when reason differs)
    let endDate = dateStr;
    let current = date;
    while (current.isSame(monthStart, "month") && !current.isAfter(monthEnd, "day")) {
      const currentStr = current.format("YYYY-MM-DD");
      const currentDaySlots = slots[currentStr] || [];
      const currentOOOSlot = currentDaySlots.find((slot) => slot.away);
      if (!currentOOOSlot || !sameOOOReason(firstOOOSlot, currentOOOSlot)) break;
      endDate = currentStr;
      processed.add(currentStr);
      current = current.add(1, "day");
    }

    const isHoliday = !firstOOOSlot.fromUser && !!firstOOOSlot.reason;
    const slotWithNotes = firstOOOSlot as typeof firstOOOSlot & {
      notes?: string | null;
      showNotePublicly?: boolean;
      specifiedReason?: string | null;
    };
    ranges.push({
      startDate: dateStr,
      endDate,
      fromUser: firstOOOSlot.fromUser,
      toUser: firstOOOSlot.toUser,
      reason: firstOOOSlot.reason,
      specifiedReason: slotWithNotes.specifiedReason,
      emoji: firstOOOSlot.emoji ?? "🏝️",
      notes: slotWithNotes.notes,
      showNotePublicly: slotWithNotes.showNotePublicly,
      isHoliday,
    });
  }

  return ranges.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function formatRange(startDate: string, endDate: string): string {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (startDate === endDate) {
    return start.format("MMM D");
  }
  if (start.isSame(end, "month")) {
    return `${start.format("MMM D")} – ${end.format("D")}`;
  }
  return `${start.format("MMM D")} – ${end.format("MMM D")}`;
}

export function OutOfOfficeMonthViewDetails({
  slots,
  isLoading = false,
  className = "",
}: OutOfOfficeMonthViewDetailsProps) {
  const { t } = useLocale();
  const month = useBookerStoreContext((state) => state.month);
  const { data: outOfOfficeReasonList } = trpc.viewer.ooo.outOfOfficeReasonList.useQuery(undefined, {
    retry: false,
  });

  const oooRanges = useMemo(() => {
    if (!slots || !month) return [];
    return getOOORangesForMonth(slots, month);
  }, [slots, month]);

  if (isLoading || oooRanges.length === 0) return null;

  const getReasonLabel = (reasonStr: string | null | undefined): string => {
    if (!reasonStr) return "";
    const matched = outOfOfficeReasonList?.find((r) => r.reason === reasonStr);
    if (matched) {
      return matched.userId === null ? t(matched.reason) : matched.reason;
    }
    return reasonStr;
  };

  return (
    <div
      className={`rounded-md border border-dashed border-subtle bg-muted/30 px-4 py-3 ${className}`}
      data-testid="ooo-month-view-details">
      <p className="text-emphasis mb-2 text-sm font-medium">
        {t("out_of_office")}
      </p>
      <ul className="text-subtle space-y-2 text-xs">
        {oooRanges.map((range, index) => (
          <li key={`${range.startDate}-${index}`} className="flex flex-col gap-0.5">
            <span className="font-medium flex items-center gap-1.5">
              {range.emoji && <span className="text-base leading-none">{range.emoji}</span>}
              {formatRange(range.startDate, range.endDate)}
            </span>
            {range.reason === "ooo_reasons_other" ? (
              <span className="text-subtle font-normal">
                {t("reason")}: {range.specifiedReason}
              </span>
            ) : (
                <span className="text-subtle font-normal">
                {t("reason")}: {getReasonLabel(range.reason)}
                </span>
            )}
            {range.notes && range.showNotePublicly && (
              <p className="text-subtle mt-0.5 max-h-[80px] overflow-y-auto wrap-break-word italic">
                {t("note")}: {range.notes}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
