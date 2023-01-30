// @TODO: This is a VERY big dependency
import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

import { EventLocationType } from "@calcom/app-store/locations";

export type BookingFormValues = {
  name: string;
  email: string;
  notes?: string;
  locationType?: EventLocationType["type"];
  guests?: string[];
  address?: string;
  attendeeAddress?: string;
  phone?: string;
  hostPhoneNumber?: string; // Maybe come up with a better way to name this to distingish between two types of phone numbers
  customInputs?: {
    [key: string]: string | boolean;
  };
  rescheduleReason?: string;
  smsReminderNumber?: string;
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
