import { z } from "zod";

export const ZAppStoreRatingsListSchema = z.object({
  take: z.number().min(1).max(100).optional().default(50),
  skip: z.number().min(0).optional().default(0),
});

export type TAppStoreRatingsListSchema = z.infer<typeof ZAppStoreRatingsListSchema>;

export const ZAppStoreRatingActionSchema = z.object({
  id: z.number().int(),
});

export type TAppStoreRatingActionSchema = z.infer<typeof ZAppStoreRatingActionSchema>;
