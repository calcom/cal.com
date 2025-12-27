import { z } from "zod";

export type TCreateInviteInputSchema = {
  teamId: number;
  token?: string;
};

export const ZCreateInviteInputSchema = z.object({
  teamId: z.number(),
  token: z.string().optional(),
});
