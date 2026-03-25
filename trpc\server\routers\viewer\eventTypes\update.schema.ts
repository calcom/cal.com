import { z } from "zod";
// ... existing imports ...

// Add optional guests to the schema
const optionalGuestSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  email: z.string().email(),
  avatar: z.string().nullable(),
  username: z.string().nullable(),
});

export const ZUpdateInputSchema = z.object({
  // ... existing fields ...
  optionalGuests: z.array(optionalGuestSchema).optional(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
