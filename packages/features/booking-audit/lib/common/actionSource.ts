import { z } from "zod";

// Action sources for audit tracking
export const ActionSourceSchema = z.enum(["API_V1", "API_V2", "WEBAPP", "UNKNOWN"]);
export type ActionSource = z.infer<typeof ActionSourceSchema>;
