/**
 * Zod schema for EventType with optional guests
 * Add optionalGuests to the eventType schema
 */

import { z } from "zod";

export const optionalGuestSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  email: z.string().email(),
  username: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
});

// This gets added to the existing eventTypeSchema:
export const eventTypeOptionalGuestsSchema = z.object({
  optionalGuests: z.array(optionalGuestSchema).default([]),
});
