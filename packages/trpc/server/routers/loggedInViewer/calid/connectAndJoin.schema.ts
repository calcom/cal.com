import { z } from "zod";

export const ZCalIdConnectAndJoinInputSchema = z.object({
  token: z.string(),
});

export type TCalIdConnectAndJoinInputSchema = z.infer<typeof ZCalIdConnectAndJoinInputSchema>;
