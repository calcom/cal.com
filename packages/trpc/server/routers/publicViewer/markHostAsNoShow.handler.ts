import handleMarkNoShow from "@calcom/features/handleMarkNoShow";
import { symmetricDecrypt } from "@calcom/lib/crypto";

import { ZMarkHostAsNoShowOptionsSchema } from "./markHostAsNoShow.schema";
import type { TCommonInputSchema } from "./types";

type NoShowOptions = {
  input: TCommonInputSchema;
};

export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { token } = input;

  const { bookingUid, noShowHost } = ZMarkHostAsNoShowOptionsSchema.parse(
    JSON.parse(symmetricDecrypt(decodeURIComponent(token), process.env.CALENDSO_ENCRYPTION_KEY || ""))
  );

  return handleMarkNoShow({ bookingUid, noShowHost });
};

export default noShowHandler;
