import handleMarkNoShow from "@calcom/features/handleMarkNoShow";

import type { TNoShowInputSchema } from "./markHostAsNoShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
};

export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { bookingUid, noShowHost } = input;

  return handleMarkNoShow({ bookingUid, noShowHost });
};

export default noShowHandler;
