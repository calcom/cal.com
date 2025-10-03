import { z } from "zod";

import { commonBookingSchema } from "./types";

export const ZSaveNoteInputSchema = commonBookingSchema.extend({
  meetingNote: z.string(),
});

export type TSaveNoteInputSchema = z.infer<typeof ZSaveNoteInputSchema>;
