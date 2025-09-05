import { orgSettingsSchema } from "@calcom/prisma/zod-utils";
import { z } from "zod";

export const ZAdminUpdate = z.object({
  id: z.number(),
  name: z.string().optional(),
  slug: z.string().nullish(),
  organizationSettings: orgSettingsSchema.unwrap().optional(),
});

export type TAdminUpdate = z.infer<typeof ZAdminUpdate>;
