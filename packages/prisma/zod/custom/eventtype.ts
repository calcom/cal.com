import { SchedulingType } from "@calcom/prisma/enums";
import { z } from "zod";
import * as imports from "../../zod-utils";
import { MIN_EVENT_DURATION_MINUTES, MAX_EVENT_DURATION_MINUTES } from "@calcom/lib/constants";
// TODO: figure out why EventTypeModel is being called even if it's not imported here, causing a circular dependency
// import { _EventTypeModel } from "../eventtype";

const calVideoSettingsSchema = z
  .object({
    disableRecordingForGuests: z.boolean().nullish(),
    disableRecordingForOrganizer: z.boolean().nullish(),
    redirectUrlOnExit: z.string().url().nullish(),
    enableAutomaticRecordingForOrganizer: z.boolean().nullish(),
    enableAutomaticTranscription: z.boolean().nullish(),
    disableTranscriptionForGuests: z.boolean().nullish(),
    disableTranscriptionForOrganizer: z.boolean().nullish(),
  })
  .optional()
  .nullable();

export const createEventTypeInput = z.object({
  title: z.string().min(1),
  slug: imports.eventTypeSlug,
  description: z.string().nullish(),
  length: z.number().int().min(MIN_EVENT_DURATION_MINUTES).max(MAX_EVENT_DURATION_MINUTES),
  hidden: z.boolean(),
  teamId: z.number().int().nullish(),
  schedulingType: z.nativeEnum(SchedulingType).nullish(),
  locations: imports.eventTypeLocations,
  metadata: imports.EventTypeMetaDataSchema.optional(),
  disableGuests: z.boolean().optional(),
  slotInterval: z.number().min(0).nullish(),
  minimumBookingNotice: z.number().int().min(0).optional(),
  beforeEventBuffer: z.number().int().min(0).optional(),
  afterEventBuffer: z.number().int().min(0).optional(),
  scheduleId: z.number().int().optional(),
  calVideoSettings: calVideoSettingsSchema
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
    length: z.number().int().min(MIN_EVENT_DURATION_MINUTES).max(MAX_EVENT_DURATION_MINUTES),
    teamId: z.number().nullish(),
  }).strict();

export type EventTypeLocation = (z.infer<typeof imports.eventTypeLocations>)[number];
