import { z } from "zod";

export const getAppDataSchema = z.object({
  userId: z.number().optional(),
});

export type GetAppDataSchemaType = z.infer<typeof getAppDataSchema>;
