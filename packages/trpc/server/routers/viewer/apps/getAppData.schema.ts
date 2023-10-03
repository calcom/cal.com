import { z } from "zod";

export const getAppDataSchema = z.object({
  limit: z.number().min(1).max(100).nullish(),
  cursor: z.number().nullish(), // <-- "cursor" needs to exist when using useInfiniteQuery, but can be any type
});

export type GetAppDataSchemaType = z.infer<typeof getAppDataSchema>;
