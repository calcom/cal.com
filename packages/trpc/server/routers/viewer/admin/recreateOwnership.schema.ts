import { z } from "zod";

export const ZRecreateOwnershipSchema = z.object({
  teamId: z.number(),
  newOwnerUserId: z.number(),
  billingId: z.string().min(1),
  entityType: z.enum(["team", "organization"]),
  mode: z.enum(["preview", "execute"]),
});

export type TRecreateOwnershipInput = z.infer<typeof ZRecreateOwnershipSchema>;
