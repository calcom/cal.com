import { z } from "zod";

export const ZGetMembersSchema = z.object({
  teamId: z.number(),
  cursor: z.number().optional(),
  limit: z.number().min(1).max(100).default(25),
});

export type TGetMembersSchema = z.infer<typeof ZGetMembersSchema>;
