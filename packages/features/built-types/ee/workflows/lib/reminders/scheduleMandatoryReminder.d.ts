import type { getEventTypeResponse } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import type { getDefaultEvent } from "@calcom/lib/defaultEvents";
import type { ExtendedCalendarEvent } from "./reminderScheduler";
export type NewBookingEventType = Awaited<ReturnType<typeof getDefaultEvent>> | getEventTypeResponse;
export declare function scheduleMandatoryReminder(evt: ExtendedCalendarEvent, workflows: Workflow[], requiresConfirmation: boolean, hideBranding: boolean, seatReferenceUid: string | undefined): Promise<void>;
//# sourceMappingURL=scheduleMandatoryReminder.d.ts.map