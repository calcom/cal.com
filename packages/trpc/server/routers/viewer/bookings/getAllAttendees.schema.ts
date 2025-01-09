import { z } from "zod";

export const ZGetAllAttendeesInputSchema = z.object({
  limit: z.number().min(1).max(100).nullish(),
  cursor: z.number().nullish(),
  searchText: z.string().optional(),
});

export type TGetAllAttendeesInputSchema = z.infer<typeof ZGetAllAttendeesInputSchema>;
