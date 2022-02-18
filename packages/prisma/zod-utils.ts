import { z } from "zod";

import { LocationType } from "@calcom/lib/location";

import { _EventTypeModel } from "./zod/eventtype";

export const eventTypeLocations = z.array(
  z.object({ type: z.nativeEnum(LocationType), address: z.string().optional() })
);

export const eventTypeSlug = z.string().transform((val) => val.trim());
export const stringToDate = z.string().transform((a) => new Date(a));
export const stringOrNumber = z.union([z.string().transform((v) => parseInt(v, 10)), z.number().int()]);

const createEventTypeBaseInput = _EventTypeModel
  .pick({
    title: true,
    slug: true,
    description: true,
    length: true,
    teamId: true,
    schedulingType: true,
  })
  .refine((data) => (data.teamId ? data.teamId && data.schedulingType : true), {
    path: ["schedulingType"],
    message: "You must select a scheduling type for team events",
  });

export const createEventTypeInput = createEventTypeBaseInput;
