import { z } from "zod";

export const ZGetInputSchema = z.object({
  filters: z.object({
    teamIds: z.number().array().optional(),
    userIds: z.number().array().optional(),
    status: z.enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"]),
    eventTypeIds: z.number().array().optional(),
  }),
  limit: z.number().min(1).max(100).nullish(),
  cursor: z.number().nullish(), // <-- "cursor" needs to exist when using useInfiniteQuery, but can be any type
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
