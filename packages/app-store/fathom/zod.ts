import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

// Fathom Site IDs are short alphanumeric strings (typically 6-8 uppercase chars like ABCDEFG)
const fathomIdSchema = z
  .string()
  .transform((val) => val.trim().toUpperCase())
  .refine((val) => val === "" || /^[A-Z0-9]{1,20}$/.test(val), {
    message: "Invalid Fathom Site ID format. Expected alphanumeric characters only",
  })
  .optional()
  .default("");

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    trackingId: fathomIdSchema,
  })
);

export const appKeysSchema = z.object({});
