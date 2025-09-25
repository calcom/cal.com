import { z } from "zod";

import slugify from "@calcom/lib/slugify";

export const ZCreateCalidTeamSchema = z.object({
  name: z.string(),
  slug: z.string().transform((val) => slugify(val.trim())),
});

export type ZCreateCalidTeamInput = z.infer<typeof ZCreateCalidTeamSchema>;
