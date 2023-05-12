import type { z } from "zod";

import { EventTypeDuplicateInput } from "./types";

export const ZDuplicateInputSchema = EventTypeDuplicateInput.strict();

export type TDuplicateInputSchema = z.infer<typeof ZDuplicateInputSchema>;
