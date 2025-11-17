import { z } from "zod";

export const ZSyncTemplatesInputSchema = z.object({});

export type TSyncTemplatesInputSchema = z.infer<typeof ZSyncTemplatesInputSchema>;
