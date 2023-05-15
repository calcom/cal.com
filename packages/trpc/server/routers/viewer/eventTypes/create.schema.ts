import type { z } from "zod";

import { createEventTypeInput } from "@calcom/prisma/zod/custom/eventtype";

export const ZCreateInputSchema = createEventTypeInput;

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
