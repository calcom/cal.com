import { z } from "zod";

// Action sources for audit tracking (API_V1 excluded - deprecated)
export const ActionSourceSchema = z.enum(["API_V2", "WEBAPP"]);
export type ActionSource = z.infer<typeof ActionSourceSchema>;
