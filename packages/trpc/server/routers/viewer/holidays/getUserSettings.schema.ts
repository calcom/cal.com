import { z } from "zod";

export const ZGetUserSettingsSchema = z.object({}).optional();

export type TGetUserSettingsSchema = z.infer<typeof ZGetUserSettingsSchema>;

