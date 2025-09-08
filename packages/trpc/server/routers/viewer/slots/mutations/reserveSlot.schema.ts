import type { z } from "zod";

import { reserveSlotSchema } from "../queries/types";

export const ZReserveSlotInputSchema = reserveSlotSchema;

export type TReserveSlotInputSchema = z.infer<typeof ZReserveSlotInputSchema>;
