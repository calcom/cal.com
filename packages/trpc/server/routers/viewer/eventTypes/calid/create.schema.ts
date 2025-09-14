import type { z } from "zod";

import { createEventTypeInput } from "@calcom/prisma/zod/custom/eventtype";

export const ZCalIdCreateInputSchema = createEventTypeInput;

export type TCalIdCreateInputSchema = z.infer<typeof ZCalIdCreateInputSchema>;
