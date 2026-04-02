import { EventTypeDuplicateInput } from "@calcom/features/eventtypes/lib/schemas";
import type { z } from "zod";

export const ZDuplicateInputSchema = EventTypeDuplicateInput;

export type TDuplicateInputSchema = z.infer<typeof ZDuplicateInputSchema>;
