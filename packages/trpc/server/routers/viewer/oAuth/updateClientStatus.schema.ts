import { z } from "zod";

import { OAuthClientApprovalStatus } from "@calcom/prisma/enums";

export const ZUpdateClientStatusInputSchema = z.object({
  clientId: z.string(),
  status: z.nativeEnum(OAuthClientApprovalStatus),
});

export type TUpdateClientStatusInputSchema = z.infer<typeof ZUpdateClientStatusInputSchema>;
