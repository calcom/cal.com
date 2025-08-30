import { z } from "zod";

import { webhookIdAndEventTypeIdSchema } from "./types";

export const ZGetInputSchema = webhookIdAndEventTypeIdSchema.extend({
  webhookId: z.string().optional(),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
