import { z } from "zod";

import { LocationType } from "@lib/location";

export const eventTypeLocations = z.array(
  z.object({ type: z.nativeEnum(LocationType), address: z.string().optional() })
);
