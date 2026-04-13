import { z } from "zod";

import { OAuthClientStatus } from "@calcom/prisma/enums";

export const ZListClientsInputSchema = z.object({
  status: z.nativeEnum(OAuthClientStatus).optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(25),
});

export type TListClientsInputSchema = z.infer<typeof ZListClientsInputSchema>;
