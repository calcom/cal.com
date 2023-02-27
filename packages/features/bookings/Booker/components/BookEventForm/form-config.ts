// @TODO: This is a VERY big dependency
import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

import type { EventLocationType } from "@calcom/app-store/locations";

export type BookingFormValues = {
  name: string;
  email: string;
  notes?: string;
  locationType?: EventLocationType["type"];
  guests?: { email: string }[];
  address?: string;
  attendeeAddress?: string;
  phone?: string;
  hostPhoneNumber?: string; // Maybe come up with a better way to name this to distingish between two types of phone numbers
  customInputs?: {
    [key: string]: string | boolean;
  };
  rescheduleReason?: string;
  smsReminderNumber?: string;
  // Key is not really part of form values, but only used to have a key
  // to set generic error messages on. Needed until RHF has implemented root error keys.
  globalError: undefined;
};

export const bookingFormSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().trim().email(),
    phone: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional()
      .nullable(),
    attendeeAddress: z.string().optional().nullable(),
    smsReminderNumber: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional()
      .nullable(),
  })
  .passthrough();
