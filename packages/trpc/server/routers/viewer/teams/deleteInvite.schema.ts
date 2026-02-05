import { z } from "zod";

export type TDeleteInviteInputSchema = {
  token: string;
};

export const ZDeleteInviteInputSchema: z.ZodType<TDeleteInviteInputSchema> = z.object({
  token: z.string(),
});
