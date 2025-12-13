import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TCreateInviteInputSchema = {
  teamId: number;
  token?: string;
};

export const ZCreateInviteInputSchema: z.ZodType<TCreateInviteInputSchema> = z.object({
  teamId: z.number(),
  token: z.string().optional(),
});
