import { z } from "zod";

import { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/prisma/enums";

export const ZCreateForOrganizationSchema = z.object({
  organizationId: z.number(),
  type: z.nativeEnum(WatchlistType),
  value: z.string().min(1, "Value is required"),
  action: z.nativeEnum(WatchlistAction),
  source: z.nativeEnum(WatchlistSource).default(WatchlistSource.MANUAL),
  description: z.string().optional(),
});

export type TCreateForOrganizationSchema = z.infer<typeof ZCreateForOrganizationSchema>;
