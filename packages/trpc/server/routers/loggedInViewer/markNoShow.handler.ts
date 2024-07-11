import handleMarkNoShow from "@calcom/features/handleMarkNoShow";

import type { TNoShowInputSchema } from "./markNoShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
};

export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { bookingUid, attendees, noShowHost } = input;

  return handleMarkNoShow({ bookingUid, attendees, noShowHost });
};

export default noShowHandler;
