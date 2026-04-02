import { z } from "zod";

import { DOMAIN_REGEX } from "@calcom/features/custom-domains/constants";

export const ZReplaceInputSchema = z.object({
  newSlug: z
    .string()
    .min(1)
    .max(253)
    .transform((val) => val.toLowerCase().trim())
    .pipe(z.string().regex(DOMAIN_REGEX, "Invalid domain format")),
});

export type TReplaceInputSchema = z.infer<typeof ZReplaceInputSchema>;
