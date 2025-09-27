import type { z } from "zod";

import { BlockedBookingLogSchema } from "@calcom/prisma/zod/modelSchema/BlockedBookingLogSchema";
import { WatchlistSchema } from "@calcom/prisma/zod/modelSchema/WatchlistSchema";

export const WatchlistModelSchema = WatchlistSchema.pick({
  id: true,
  type: true,
  value: true,
  description: true,
  organizationId: true,
  action: true,
  severity: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
});

export type Watchlist = z.infer<typeof WatchlistModelSchema>;

export const insertWatchlistSchema = WatchlistModelSchema.pick({
  type: true,
  value: true,
  description: true,
  organizationId: true,
  action: true,
});

// BlockedBooking types for audit logging
export const BlockedBookingModelSchema = BlockedBookingLogSchema.pick({
  id: true,
  email: true,
  eventTypeId: true,
  organizationId: true,
  watchlistId: true,
  bookingData: true,
  createdAt: true,
});

export type BlockedBooking = z.infer<typeof BlockedBookingModelSchema>;

export const insertBlockedBookingSchema = BlockedBookingModelSchema.pick({
  email: true,
  eventTypeId: true,
  organizationId: true,
  watchlistId: true,
  bookingData: true,
});

// Export the new enums for use in the application
export { WatchlistAction, WatchlistType, WatchlistSeverity } from "@calcom/prisma/enums";
