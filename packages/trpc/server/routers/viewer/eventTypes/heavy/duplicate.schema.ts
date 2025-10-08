import type { z } from "zod";

import { EventTypeDuplicateInput } from "@calcom/features/eventtypes/lib/types";

export const ZDuplicateInputSchema = EventTypeDuplicateInput;

export type TDuplicateInputSchema = z.infer<typeof ZDuplicateInputSchema>;
