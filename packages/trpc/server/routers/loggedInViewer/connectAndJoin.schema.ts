import { z } from "zod";

export const ZConnectAndJoinInputSchema = z.object({
  token: z.string(),
});

export type TConnectAndJoinInputSchema = z.infer<typeof ZConnectAndJoinInputSchema>;
