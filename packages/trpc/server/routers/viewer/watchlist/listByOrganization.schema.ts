import { z } from "zod";

export const ZListByOrganizationSchema = z.object({
  organizationId: z.number(),
});

export type TListByOrganizationSchema = z.infer<typeof ZListByOrganizationSchema>;
