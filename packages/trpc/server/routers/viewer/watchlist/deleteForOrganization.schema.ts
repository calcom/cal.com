import { z } from "zod";

export const ZDeleteForOrganizationSchema = z.object({
  id: z.string(),
  organizationId: z.number(),
});

export type TDeleteForOrganizationSchema = z.infer<typeof ZDeleteForOrganizationSchema>;
