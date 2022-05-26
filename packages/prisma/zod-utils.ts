import { Frequency as RRuleFrequency } from "rrule";
import { z } from "zod";

import { LocationType } from "@calcom/core/location";
import { slugify } from "@calcom/lib/slugify";

export const eventTypeLocations = z.array(
  z.object({
    type: z.nativeEnum(LocationType),
    address: z.string().optional(),
    link: z.string().url().optional(),
    displayLocationPublicly: z.boolean().optional(),
    hostPhoneNumber: z.string().optional(),
  })
);

// Matching RRule.Options: rrule/dist/esm/src/types.d.ts
export const recurringEvent = z.object({
  dtstart: z.date().optional(),
  interval: z.number().optional(),
  count: z.number().optional(),
  freq: z.nativeEnum(RRuleFrequency).optional(),
  until: z.date().optional(),
  tzid: z.string().optional(),
});

export const eventTypeSlug = z.string().transform((val) => slugify(val.trim()));
export const stringToDate = z.string().transform((a) => new Date(a));
export const stringOrNumber = z.union([z.string().transform((v) => parseInt(v, 10)), z.number().int()]);
