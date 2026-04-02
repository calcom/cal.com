import { createEventTypeInput } from "@calcom/features/eventtypes/lib/schemas";
import type { z } from "zod";

export const ZCreateInputSchema = createEventTypeInput;

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
