import type { z } from "zod";

import { EventTypeDuplicateInput } from "@calcom/prisma/zod/custom/eventtype";

export const ZDuplicateInputSchema = EventTypeDuplicateInput;

export type TDuplicateInputSchema = z.infer<typeof ZDuplicateInputSchema>;
