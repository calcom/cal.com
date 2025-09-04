import type { z } from "zod";

import { ChargerCardSchema } from "../../payments/type";

export const ZChargerCardInputSchema = ChargerCardSchema;

export type TChargeCardInputSchema = z.infer<typeof ZChargerCardInputSchema>;
