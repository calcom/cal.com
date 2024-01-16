import { z } from "zod";

import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export const ZAdminUpdate = z.object({
  id: z.number(),
  name: z.string().optional(),
  slug: z.string().nullish(),
  metadata: teamMetadataSchema.optional(),
});

export type TAdminUpdate = z.infer<typeof ZAdminUpdate>;
