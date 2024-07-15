import handleMarkNoShow from "@calcom/features/handleMarkNoShow";

import type { TNoShowInputSchema } from "./noShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
};

export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { bookingUid, attendees } = input;

  return handleMarkNoShow({ bookingUid, attendees });
};

export default noShowHandler;
