import { z } from "zod";

export const ZDeleteOrganizationInput = z.object({
  orgId: z.number(),
});

export type TDeleteOrganizationInput = z.infer<typeof ZDeleteOrganizationInput>;
