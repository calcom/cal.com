import type { z } from "zod";

import { createEventTypeWithCopilotInput } from "@calcom/prisma/zod/custom/eventtype";

export const ZCreateCopilotSuggestionInputSchema = createEventTypeWithCopilotInput;

export type TCreateCopilotSuggestionInputSchema = z.infer<typeof ZCreateCopilotSuggestionInputSchema>;
