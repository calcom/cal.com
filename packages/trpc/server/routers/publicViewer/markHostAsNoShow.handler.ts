import handleMarkNoShow from "@calcom/features/handleMarkNoShow";

import type { TNoShowInputSchema } from "./markHostAsNoShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
};

/**
 * Public route for attendees to mark host as no-show.
 *
 * Note on audit actor: Currently uses a fallback guest actor since we don't have
 * the attendee's identity in this route. Better approaches for future improvement:
 * 1. Pass the `email` query param from the booking success page to identify the attendee
 * 2. Use `makeAttendeeActor(attendeeId)` if we can identify the specific attendee from the booking
 */
export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { bookingUid, noShowHost } = input;

  return handleMarkNoShow({
    bookingUid,
    noShowHost,
    actionSource: "WEBAPP",
  });
};

export default noShowHandler;
