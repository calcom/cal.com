"use client";

import Link from "next/link";
import { useId } from "react";

import dayjs from "@calcom/dayjs";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  HoverCardPortal,
} from "@calcom/ui/components/hover-card";
import { Icon } from "@calcom/ui/components/icon";

import type { RoutingFormTableRow } from "../lib/types";
import { BookingStatusBadge } from "./BookingStatusBadge";

export function BookingAtCell({ row, rowId }: { row: RoutingFormTableRow; rowId: number }) {
  const cellId = useId();
  const { copyToClipboard } = useCopy();

  if (!row.bookingUserId || !row.bookingCreatedAt) {
    return <div className="w-[250px]" />;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2" key={`${cellId}-booking-${rowId}`}>
          <Avatar size="xs" imageSrc={row.bookingUserAvatarUrl ?? ""} alt={row.bookingUserName ?? ""} />
          <Link href={`/booking/${row.bookingUid}`}>
            <Badge variant="gray">{dayjs(row.bookingCreatedAt).format("MMM D, YYYY HH:mm")}</Badge>
          </Link>
        </div>
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Avatar size="sm" imageSrc={row.bookingUserAvatarUrl ?? ""} alt={row.bookingUserName ?? ""} />
              <div>
                <p className="text-sm font-medium">{row.bookingUserName}</p>
                <p className="group/booking_status_email text-subtle flex items-center text-xs">
                  <span className="truncate">{row.bookingUserEmail}</span>
                  <button
                    className="invisible ml-2 group-hover/booking_status_email:visible"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      copyToClipboard(row.bookingUserEmail ?? "");
                    }}>
                    <Icon name="copy" />
                  </button>
                </p>
              </div>
            </div>
            <div className="text-emphasis mt-4 flex items-center gap-2 text-xs">
              <span>Status:</span>
              <BookingStatusBadge bookingStatus={row.bookingStatus} />
            </div>
          </div>
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
}
