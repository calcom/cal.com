import { z } from "zod";

import { WatchlistType } from "@calcom/prisma/enums";

export const ZListBlockedBookersInputSchema = z.object({
  organizationId: z.number(),
  limit: z.number().min(1).max(100).optional().default(25),
  offset: z.number().min(0).optional().default(0),
  searchTerm: z.string().optional(),
});

export const ZCreateBlockedBookerInputSchema = z.object({
  organizationId: z.number(),
  type: z.nativeEnum(WatchlistType),
  value: z.string().min(1, "Value is required"),
  description: z.string().optional(),
});

export const ZDeleteBlockedBookerInputSchema = z.object({
  organizationId: z.number(),
  entryId: z.string(),
});

export type ListBlockedBookersInput = z.infer<typeof ZListBlockedBookersInputSchema>;
export type CreateBlockedBookerInput = z.infer<typeof ZCreateBlockedBookerInputSchema>;
export type DeleteBlockedBookerInput = z.infer<typeof ZDeleteBlockedBookerInputSchema>;
