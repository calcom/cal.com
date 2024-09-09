import type { Attendee } from "@prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { OriginalRescheduledBooking } from "../../handleNewBooking/types";
declare const lastAttendeeDeleteBooking: (originalRescheduledBooking: OriginalRescheduledBooking, filteredAttendees: Partial<Attendee>[] | undefined, originalBookingEvt?: CalendarEvent) => Promise<boolean>;
export default lastAttendeeDeleteBooking;
//# sourceMappingURL=lastAttendeeDeleteBooking.d.ts.map