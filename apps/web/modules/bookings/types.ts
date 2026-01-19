import type { DataTableRow } from "@calcom/features/data-table/lib/separator";
import type {
  UseCalendarsReturnType as UseCalendarsReturnTypeBase,
  useScheduleForEventReturnType as useScheduleForEventReturnTypeBase,
} from "@calcom/features/bookings/Booker/types";
import type { RouterOutputs } from "@calcom/trpc/react";

import type { validStatuses } from "./lib/validStatuses";

export type ConnectedCalendarsType = RouterOutputs["viewer"]["calendars"]["connectedCalendars"]["connectedCalendars"];
export type ScheduleDataType = RouterOutputs["viewer"]["slots"]["getSchedule"];

export type UseCalendarsReturnType = UseCalendarsReturnTypeBase<ConnectedCalendarsType>;
export type useScheduleForEventReturnType = useScheduleForEventReturnTypeBase<ScheduleDataType>;

export type BookingsGetOutput = RouterOutputs["viewer"]["bookings"]["get"];

export type BookingOutput = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][0];

export type BookingAttendee = BookingOutput["attendees"][0];

export type RecurringInfo = {
  recurringEventId: string | null;
  count: number;
  firstDate: Date | null;
  bookings: { [key: string]: Date[] };
};

export type BookingRowData = {
  type: "data";
  booking: BookingOutput;
  isToday: boolean;
  recurringInfo?: RecurringInfo;
};

export type RowData = DataTableRow<BookingRowData>;

export type BookingListingStatus = (typeof validStatuses)[number];
