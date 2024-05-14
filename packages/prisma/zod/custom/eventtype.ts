import { SchedulingType } from "@calcom/prisma/enums";
import { z } from "zod";
import * as imports from "../../zod-utils";
// TODO: figure out why EventTypeModel is being called even if it's not imported here, causing a circular dependency
// import { _EventTypeModel } from "../eventtype";

export const createEventTypeInput = z.object({
  title: z.string().min(1),
  slug: imports.eventTypeSlug,
  description: z.string().nullish(),
  length: z.number().int(),
  hidden: z.boolean(),
  teamId: z.number().int().nullish(),
  schedulingType: z.nativeEnum(SchedulingType).nullish(),
  locations: imports.eventTypeLocations,
  metadata: imports.EventTypeMetaDataSchema.optional(),
  disableGuests: z.boolean().optional(),
})
  .partial({ hidden: true, locations: true })
  .refine((data) => (data.teamId ? data.teamId && data.schedulingType : true), {
    path: ["schedulingType"],
    message: "You must select a scheduling type for team events",
  });

  export const EventTypeDuplicateInput = z.object({
    id: z.number(),
    slug: z.string(),
    title: z.string().min(1),
    description: z.string(),
    length: z.number(),
  }).strict();

export type EventTypeLocation = (z.infer<typeof imports.eventTypeLocations>)[number];