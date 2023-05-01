import { z } from "zod";

import { webhookIdAndEventTypeIdSchema } from "./types";

export const ZListInputSchema = webhookIdAndEventTypeIdSchema
  .extend({
    appId: z.string().optional(),
  })
  .optional();

export type TListInputSchema = z.infer<typeof ZListInputSchema>;
