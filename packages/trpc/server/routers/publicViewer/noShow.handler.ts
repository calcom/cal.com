import { z } from "zod";

import handleMarkNoShow from "@calcom/features/handleMarkNoShow";
import { symmetricDecrypt } from "@calcom/lib/crypto";

import type { TNoShowInputSchema } from "./noShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
};

const decryptedSchema = z
  .object({
    bookingUid: z.string(),
    attendees: z
      .array(
        z.object({
          email: z.string(),
          noShow: z.boolean(),
        })
      )
      .optional(),
    noShowHost: z.boolean().optional(),
  })
  .refine(
    (data) => {
      return (data.attendees && data.attendees.length > 0) || data.noShowHost !== undefined;
    },
    {
      message: "At least one of 'attendees' or 'noShowHost' must be provided",
      path: ["attendees", "noShowHost"],
    }
  );

export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { token } = input;
  const { bookingUid, attendees, noShowHost } = decryptedSchema.parse(
    JSON.parse(symmetricDecrypt(decodeURIComponent(token), process.env.CALENDSO_ENCRYPTION_KEY || ""))
  );

  return handleMarkNoShow({ bookingUid, attendees, noShowHost });
};

export default noShowHandler;
