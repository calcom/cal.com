import { z } from "zod";

import type { EventLocationType } from "@calcom/app-store/locations";
import type { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import type { ChildrenEventType } from "@calcom/features/eventtypes/lib/childrenEventType";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import type { EventTypeTranslation } from "@calcom/prisma/client";
import { type PeriodType, SchedulingType } from "@calcom/prisma/enums";
import {
  eventTypeLocations,
  EventTypeMetaDataSchema,
  eventTypeSlug,
  type BookerLayoutSettings,
} from "@calcom/prisma/zod-utils";
import type { customInputSchema } from "@calcom/prisma/zod-utils";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { eventTypeColor } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";

export type CustomInputParsed = typeof customInputSchema._output;

export type AvailabilityOption = {
  label: string;
  value: number;
  isDefault: boolean;
  isManaged?: boolean;
};

export type Host = {
  isFixed: boolean;
  userId: number;
  priority: number;
  weight: number;
  scheduleId?: number | null;
  groupId: string | null;
};

export type TeamMember = {
  value: string;
  label: string;
  avatar: string;
  email: string;
  defaultScheduleId: number | null;
};

type EventLocation = {
  type: EventLocationType["type"];
  address?: string;
  attendeeAddress?: string;
  somewhereElse?: string;
  link?: string;
  hostPhoneNumber?: string;
  displayLocationPublicly?: boolean;
  phone?: string;
  hostDefault?: string;
  credentialId?: number;
  teamName?: string;
  customLabel?: string;
};

type PhoneCallConfig = {
  generalPrompt: string;
  enabled: boolean;
  beginMessage: string;
  yourPhoneNumber: string;
  numberToCall: string;
  guestName?: string;
  guestEmail?: string;
  guestCompany?: string;
  templateType: string;
  schedulerName?: string;
};

export type PrivateLinkWithOptions = {
  link: string;
  expiresAt?: Date | null;
  maxUsageCount?: number | null;
  usageCount?: number;
};

export type SettingsToggleClassNames = {
  container?: string;
  label?: string;
  description?: string;
  children?: string;
};

export type InputClassNames = {
  container?: string;
  label?: string;
  input?: string;
  addOn?: string;
};

export type CheckboxClassNames = {
  checkbox?: string;
  description?: string;
  container?: string;
};

export type SelectClassNames = {
  innerClassNames?: {
    input?: string;
    option?: string;
    control?: string;
    singleValue?: string;
    valueContainer?: string;
    multiValue?: string;
    menu?: string;
    menuList?: string;
  };
  select?: string;
  label?: string;
  container?: string;
};

export const EventTypeDuplicateInput = z
  .object({
    id: z.number(),
    slug: z.string(),
    title: z.string().min(1),
    description: z.string(),
    length: z.number(),
    teamId: z.number().nullish(),
  })
  .strict();

const calVideoSettingsSchema = z
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

export const createEventTypeInput = z
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

export type FormValidationResult = {
  isValid: boolean;
  errors: Record<string, unknown>;
};

export interface EventTypePlatformWrapperRef {
  validateForm: () => Promise<FormValidationResult>;
  handleFormSubmit: (callbacks?: { onSuccess?: () => void; onError?: (error: Error) => void }) => void;
}

export interface CalVideoSettings {
  disableRecordingForOrganizer?: boolean;
  disableRecordingForGuests?: boolean;
  enableAutomaticTranscription?: boolean;
  enableAutomaticRecordingForOrganizer?: boolean;
  disableTranscriptionForGuests?: boolean;
  disableTranscriptionForOrganizer?: boolean;
  redirectUrlOnExit?: string;
  requireEmailForGuests?: boolean;
}

export type { ChildrenEventType };
export type { EventLocationType };
export type { IntervalLimit };
export type { AttributesQueryValue };
export type { EventTypeTranslation };
export type { PeriodType };
export type { BookerLayoutSettings };
export type { customInputSchema };
export type { eventTypeBookingFields };
export type { eventTypeColor };
export type { RecurringEvent };
