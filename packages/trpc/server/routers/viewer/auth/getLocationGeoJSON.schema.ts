import { z } from "zod";

export const ZGetLocationGeoJSONSchema = z.object({
  timeZone: z.string(),
});

export type TGetLocationGeoJSONSchema = z.infer<typeof ZGetLocationGeoJSONSchema>;
