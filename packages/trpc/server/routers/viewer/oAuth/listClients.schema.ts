import { OAuthClientStatus } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZListClientsInputSchema = z.object({
  status: z.nativeEnum(OAuthClientStatus).optional(),
});

export type TListClientsInputSchema = z.infer<typeof ZListClientsInputSchema>;
