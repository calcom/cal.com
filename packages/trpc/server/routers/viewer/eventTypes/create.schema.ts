import { createEventTypeInput } from "@calcom/prisma/zod/custom/eventtype";
import type { z } from "zod";

export const ZCreateInputSchema = createEventTypeInput;

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
