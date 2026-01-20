import { z } from "zod";

export const ZGetAllServicesInputSchema = z.object({}).optional();

export type TGetAllServicesInputSchema = z.infer<typeof ZGetAllServicesInputSchema>;
