import { handleMarkHostNoShow } from "@calcom/features/handleMarkNoShow";

import type { TNoShowInputSchema } from "./markHostAsNoShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
};

// TODO: Track which attendee actually called this endpoint to mark host as no-show.
// Currently this is completely anonymous and public endpoint.
export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { bookingUid, noShowHost } = input;

  return handleMarkHostNoShow({
    bookingUid,
    noShowHost,
    actionSource: "WEBAPP",
  });
};

export default noShowHandler;
