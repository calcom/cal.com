import { z } from "zod";

import { DOMAIN_REGEX } from "@calcom/features/custom-domains/constants";

export const ZCheckInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(253)
    .transform((val) => val.toLowerCase().trim())
    .pipe(z.string().regex(DOMAIN_REGEX, "Invalid domain format")),
});

export type TCheckInputSchema = z.infer<typeof ZCheckInputSchema>;
