import { z } from "zod";

import { LocationType } from "@calcom/lib/location";

export const eventTypeLocations = z.array(
  z.object({ type: z.nativeEnum(LocationType), address: z.string().optional() })
);

export const eventTypeSlug = z.string().transform((val) => val.trim());
export const stringToDate = z.string().transform((a) => new Date(a));
export const stringOrNumber = z.union([z.string().transform((v) => parseInt(v, 10)), z.number().int()]);
