import { z } from "zod";

import { OAuthClientApprovalStatus } from "@calcom/prisma/enums";

export const ZListClientsInputSchema = z.object({
  status: z.nativeEnum(OAuthClientApprovalStatus).optional(),
});

export type TListClientsInputSchema = z.infer<typeof ZListClientsInputSchema>;
