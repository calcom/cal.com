/**
 * Add optionalGuests to the eventType update procedure input
 * Find the existing router definition and add optionalGuests field
 */

import { z } from "zod";
import { router, authedProcedure } from "../../../trpc";

const optionalGuestInputSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  email: z.string().email(),
  avatar: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
});

// Add to existing updateEventType procedure input:
// optionalGuests: z.array(optionalGuestInputSchema).optional(),
