import { z } from "zod";

export const ZSyncTemplatesInputSchema = z.object({
    phoneNumberId: z.string(),
});

export type TSyncTemplatesInputSchema = z.infer<typeof ZSyncTemplatesInputSchema>;
