import { z } from "zod";

import { OAuthClientStatus } from "@calcom/prisma/enums";

export const ZCountClientsInputSchema = z.object({
  status: z.nativeEnum(OAuthClientStatus).optional(),
});

export type TCountClientsInputSchema = z.infer<typeof ZCountClientsInputSchema>;
