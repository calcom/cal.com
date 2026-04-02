import { eventTypeLocations, eventTypeSlug } from "@calcom/lib/zod/eventType";
import { SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { z } from "zod";

type CalVideoSettings =
  | {
      disableRecordingForGuests?: boolean | null;
      disableRecordingForOrganizer?: boolean | null;
      enableAutomaticTranscription?: boolean | null;
      enableAutomaticRecordingForOrganizer?: boolean | null;
      disableTranscriptionForGuests?: boolean | null;
      disableTranscriptionForOrganizer?: boolean | null;
      redirectUrlOnExit?: string | null;
      requireEmailForGuests?: boolean | null;
    }
  | null
  | undefined;

const calVideoSettingsSchema: z.ZodType<CalVideoSettings> = z
  .object({
    disableRecordingForGuests: z.boolean().nullish(),
    disableRecordingForOrganizer: z.boolean().nullish(),
    enableAutomaticTranscription: z.boolean().nullish(),
    enableAutomaticRecordingForOrganizer: z.boolean().nullish(),
    disableTranscriptionForGuests: z.boolean().nullish(),
    disableTranscriptionForOrganizer: z.boolean().nullish(),
    redirectUrlOnExit: z.string().url().nullish(),
    requireEmailForGuests: z.boolean().nullish(),
  })
  .optional()
  .nullable();

type EventTypeLocation = {
  type: string;
  address?: string;
  link?: string;
  displayLocationPublicly?: boolean;
  hostPhoneNumber?: string;
  credentialId?: number;
  teamName?: string;
  customLabel?: string;
};

type EventTypeMetadata = z.infer<typeof EventTypeMetaDataSchema>;

export type TEventTypeDuplicateInput = {
  id: number;
  slug: string;
  title: string;
  description: string;
  length: number;
  teamId?: number | null;
};

export const EventTypeDuplicateInput: z.ZodType<TEventTypeDuplicateInput> = z
  .object({
    id: z.number(),
    slug: z.string(),
    title: z.string().min(1),
    description: z.string(),
    length: z.number(),
    teamId: z.number().nullish(),
  })
  .strict();

export type TCreateEventTypeInput = {
  title: string;
  slug: string;
  description?: string | null;
  length: number;
  hidden?: boolean;
  teamId?: number | null;
  schedulingType?: SchedulingType | null;
  locations?: EventTypeLocation[];
  metadata?: EventTypeMetadata;
  disableGuests?: boolean;
  slotInterval?: number | null;
  minimumBookingNotice?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  scheduleId?: number;
  calVideoSettings?: CalVideoSettings;
};

export const createEventTypeInput: z.ZodType<TCreateEventTypeInput> = z
  .object({
    title: z.string().trim().min(1),
    slug: eventTypeSlug,
    description: z.string().nullish(),
    length: z.number().int(),
    hidden: z.boolean(),
    teamId: z.number().int().nullish(),
    schedulingType: z.nativeEnum(SchedulingType).nullish(),
    locations: eventTypeLocations,
    metadata: EventTypeMetaDataSchema.optional(),
    disableGuests: z.boolean().optional(),
    slotInterval: z.number().min(0).nullish(),
    minimumBookingNotice: z.number().int().min(0).optional(),
    beforeEventBuffer: z.number().int().min(0).optional(),
    afterEventBuffer: z.number().int().min(0).optional(),
    scheduleId: z.number().int().optional(),
    calVideoSettings: calVideoSettingsSchema,
  })
  .partial({ hidden: true, locations: true })
  .refine((data) => (data.teamId ? data.teamId && data.schedulingType : true), {
    path: ["schedulingType"],
    message: "You must select a scheduling type for team events",
  });
