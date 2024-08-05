import { z } from "zod";

import { ZRegistrationResponseJSONSchema } from "./types";

export const ZCreateInputSchema = z.object({
  passkeyName: z.string().trim().min(1),
  verificationResponse: ZRegistrationResponseJSONSchema,
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
