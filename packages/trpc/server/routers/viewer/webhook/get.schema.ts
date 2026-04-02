import { z } from "zod";

import { webhookIdAndEventTypeIdSchema } from "./types";

export const ZGetInputSchema = webhookIdAndEventTypeIdSchema;

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
