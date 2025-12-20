import { z } from "zod";

export type TConnectAndJoinInputSchema = {
  token: string;
};

export const ZConnectAndJoinInputSchema: z.ZodType<TConnectAndJoinInputSchema> = z.object({
  token: z.string(),
});
