import type { z } from "zod";

import { EventTypeUpdateInput } from "./types";

export const ZUpdateInputSchema = EventTypeUpdateInput.strict();

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
