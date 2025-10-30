import type { RouterOutputs } from "@calcom/trpc/react";

import type { validStatuses } from "~/bookings/lib/validStatuses";

export type BookingOutput = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][0];

export type RecurringInfo = {
  recurringEventId: string | null;
  count: number;
  firstDate: Date | null;
  bookings: { [key: string]: Date[] };
};

export type RowData =
  | {
      type: "data";
      booking: BookingOutput;
      isToday: boolean;
      recurringInfo?: RecurringInfo;
    }
  | {
      type: "today" | "next";
    };

export type BookingListingStatus = (typeof validStatuses)[number];
