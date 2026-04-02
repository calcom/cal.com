import type { z } from "zod";
import { ChargerCardSchema } from "./type";

export const ZChargerCardInputSchema = ChargerCardSchema;

export type TChargeCardInputSchema = z.infer<typeof ZChargerCardInputSchema>;
