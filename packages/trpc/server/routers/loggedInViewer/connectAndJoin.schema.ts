import { z } from "zod";

export type TConnectAndJoinInputSchema = {
  token: string;
};

export const ZConnectAndJoinInputSchema = z.object({
  token: z.string(),
});
