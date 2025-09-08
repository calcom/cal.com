import type { z } from "zod";

import { removeSelectedSlotSchema } from "../queries/types";

export const ZRemoveSelectedSlotInputSchema = removeSelectedSlotSchema;

export type TRemoveSelectedSlotInputSchema = z.infer<typeof ZRemoveSelectedSlotInputSchema>;
